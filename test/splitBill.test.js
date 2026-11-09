import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    loadRecords,
    saveRecord,
    deleteRecord,
    computePersonSummary,
    calculateSettlement,
    buildShareText,
    buildCsv,
} from '../src/splitBill.js';

function pay(title, payer, amount, splitAmong) {
    return { title, payer, amount: String(amount), splitAmong };
}

function installLocalStorage() {
    const store = new Map();
    globalThis.localStorage = {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(String(key), String(value));
        },
        removeItem(key) {
            store.delete(String(key));
        },
        clear() {
            store.clear();
        },
    };
}

describe('computePersonSummary', () => {
    it('counts the payer’s own share so every net sums to zero', () => {
        const summary = computePersonSummary(
            ['小明', '小華'],
            [pay('晚餐', '小明', 100, ['小明', '小華'])]
        );

        assert.deepEqual(summary, [
            { name: '小明', paid: 100, share: 50, net: 50 },
            { name: '小華', paid: 0, share: 50, net: -50 },
        ]);
        assert.equal(
            summary.reduce((sum, person) => sum + person.net, 0),
            0
        );
    });

    it('only charges the people selected for that expense', () => {
        const summary = computePersonSummary(
            ['小明', '小華', '小美'],
            [pay('計程車', '小明', 200, ['小明', '小華'])]
        );

        assert.deepEqual(
            summary.map(person => [person.name, person.share, person.net]),
            [
                ['小明', 100, 100],
                ['小華', 100, -100],
                ['小美', 0, 0],
            ]
        );
    });

    it('keeps multi-payer nets correct when each payer also shares', () => {
        // 900/3 + 200/2：小明淨額 +500、小華 −200、小美 −300，合計 0。
        const summary = computePersonSummary(
            ['小明', '小華', '小美'],
            [
                pay('晚餐', '小明', 900, ['小明', '小華', '小美']),
                pay('計程車', '小華', 200, ['小明', '小華']),
            ]
        );

        assert.deepEqual(
            summary.map(person => ({ name: person.name, net: person.net })),
            [
                { name: '小明', net: 500 },
                { name: '小華', net: -200 },
                { name: '小美', net: -300 },
            ]
        );
    });

    it('rounds each net to cents', () => {
        const summary = computePersonSummary(
            ['甲', '乙', '丙'],
            [pay('點心', '甲', 100, ['甲', '乙', '丙'])]
        );

        assert.deepEqual(
            summary.map(person => person.net),
            [66.67, -33.33, -33.33]
        );
    });
});

describe('calculateSettlement', () => {
    it('settles a two-person equal split with one transfer', () => {
        const participants = ['小明', '小華'];
        const payments = [pay('晚餐', '小明', 100, participants)];

        assert.deepEqual(calculateSettlement(participants, payments), [
            { debtor: '小華', creditor: '小明', amount: 50 },
        ]);
    });

    it('has the largest debtor pay the largest creditor first', () => {
        const participants = ['甲', '乙', '丙'];
        const payments = [
            pay('甲代付', '甲', 30, ['丙']),
            pay('乙代付', '乙', 20, ['丙']),
        ];

        assert.deepEqual(calculateSettlement(participants, payments), [
            { debtor: '丙', creditor: '甲', amount: 30 },
            { debtor: '丙', creditor: '乙', amount: 20 },
        ]);
    });

    it('settles a shared dinner and taxi in the minimum transfers', () => {
        const participants = ['小明', '小華', '小美'];
        const payments = [
            pay('晚餐', '小明', 900, participants),
            pay('計程車', '小華', 200, ['小明', '小華']),
        ];

        assert.deepEqual(calculateSettlement(participants, payments), [
            { debtor: '小美', creditor: '小明', amount: 300 },
            { debtor: '小華', creditor: '小明', amount: 200 },
        ]);
    });

    it('drops leftover cents instead of emitting a 0.00 transfer', () => {
        const participants = ['甲', '乙', '丙'];
        const settlements = calculateSettlement(participants, [
            pay('點心', '甲', 100, participants),
        ]);

        assert.deepEqual(settlements, [
            { debtor: '乙', creditor: '甲', amount: 33.33 },
            { debtor: '丙', creditor: '甲', amount: 33.33 },
        ]);
        assert.ok(settlements.every(row => row.amount > 0));
    });

    it('returns no transfers when everyone is already square', () => {
        const settlements = calculateSettlement(
            ['甲', '乙'],
            [
                pay('甲的', '甲', 40, ['甲']),
                pay('乙的', '乙', 40, ['乙']),
            ]
        );

        assert.deepEqual(settlements, []);
    });
});

describe('buildShareText', () => {
    it('formats the total and each transfer for a group chat', () => {
        const text = buildShareText(
            '週末聚餐',
            [pay('晚餐', '小明', 80, ['小明', '小華']), pay('飲料', '小華', 20, ['小明', '小華'])],
            [{ debtor: '小華', creditor: '小明', amount: 30 }]
        );

        assert.equal(
            text,
            [
                '📋 週末聚餐',
                '總支出 100 元・2 筆付款',
                '',
                '小華 → 小明：30 元',
                '',
                '— accounting.kvcc.me',
            ].join('\n')
        );
    });

    it('uses a default title and says when nobody needs to pay', () => {
        const text = buildShareText('', [], []);

        assert.match(text, /^📋 分帳結果\n總支出 0 元・0 筆付款\n\n全部結清，沒有人需要轉帳 🎉\n\n— accounting\.kvcc\.me$/);
    });
});

describe('buildCsv', () => {
    it('writes a BOM, payment rows, and settlement rows', () => {
        const csv = buildCsv(
            '週末聚餐',
            [pay('晚餐', '小明', 300, ['小明', '小華'])],
            [{ debtor: '小華', creditor: '小明', amount: 150 }]
        );

        assert.equal(
            csv,
            '\ufeff' +
                [
                    '分帳標題: 週末聚餐',
                    '付款紀錄',
                    '標題,付款人,金額,分擔人',
                    '"晚餐","小明","300","小明;小華"',
                    '',
                    '結算結果',
                    '應付人,收款人,金額',
                    '"小華","小明","150.00"',
                    '',
                ].join('\n')
        );
    });

    it('escapes quotes inside fields', () => {
        const csv = buildCsv(
            '標題',
            [pay('說"嗨"', '小明', 10, ['小明'])],
            []
        );

        assert.match(csv, /"說""嗨"""/);
    });
});

describe('saved splits', () => {
    beforeEach(() => {
        installLocalStorage();
    });

    it('starts empty', () => {
        assert.deepEqual(loadRecords(), []);
    });

    it('inserts a new split and replaces one with the same id', () => {
        const created = saveRecord({ id: 'a', title: '旅行' });
        assert.deepEqual(created, [{ id: 'a', title: '旅行' }]);

        const updated = saveRecord({ id: 'a', title: '旅行（改）' });
        saveRecord({ id: 'b', title: '聚餐' });

        assert.deepEqual(updated, [{ id: 'a', title: '旅行（改）' }]);
        assert.deepEqual(loadRecords(), [
            { id: 'a', title: '旅行（改）' },
            { id: 'b', title: '聚餐' },
        ]);
    });

    it('deletes one split and keeps the rest', () => {
        saveRecord({ id: 'a', title: '旅行' });
        saveRecord({ id: 'b', title: '聚餐' });

        assert.deepEqual(deleteRecord('a'), [{ id: 'b', title: '聚餐' }]);
        assert.deepEqual(loadRecords(), [{ id: 'b', title: '聚餐' }]);
    });

    it('returns an empty list when stored JSON is corrupt', () => {
        localStorage.setItem('splitRecords', '{not json');
        assert.deepEqual(loadRecords(), []);
    });
});
