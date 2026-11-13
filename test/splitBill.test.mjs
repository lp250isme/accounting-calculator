/* 跑法：npm test（node --test，無額外相依）
   範圍：src/splitBill.js 的純函式。
   重點是付款列「刪除 → 復原（undo toast）」那組狀態邏輯：
   刪掉的那筆要能原位放回，編輯中的指標不能指錯列。 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    removePaymentAt,
    insertPaymentAt,
    editingIndexAfterRemove,
    editingIndexAfterRestore,
    calculateSettlement,
} from '../src/splitBill.js';

const rec = (payer, amount, splitAmong, title = '') => ({
    payer,
    amount,
    splitAmong,
    title,
});

const sample = () => [
    rec('A', 300, ['A', 'B', 'C'], '晚餐'),
    rec('B', 150, ['A', 'B'], '計程車'),
    rec('C', 90, ['A', 'B', 'C'], '飲料'),
];

test('removePaymentAt 回傳剩下的列與被刪掉的那筆，原陣列不被改動', () => {
    const list = sample();
    const { records, removed } = removePaymentAt(list, 1);
    assert.equal(records.length, 2);
    assert.deepEqual(
        records.map(r => r.title),
        ['晚餐', '飲料']
    );
    assert.equal(removed.title, '計程車');
    assert.equal(list.length, 3, '不可以就地改原陣列');
});

test('removePaymentAt 遇到不存在的位置不刪任何東西', () => {
    const list = sample();
    for (const bad of [-1, 3, 99, null, undefined, 1.5]) {
        const { records, removed } = removePaymentAt(list, bad);
        assert.equal(removed, null);
        assert.equal(records.length, 3);
    }
});

test('刪除再復原要回到一模一樣的順序（undo 的核心保證）', () => {
    const list = sample();
    for (let i = 0; i < list.length; i++) {
        const { records, removed } = removePaymentAt(list, i);
        assert.deepEqual(insertPaymentAt(records, i, removed), list);
    }
});

test('insertPaymentAt 的位置超出範圍時夾到頭／尾', () => {
    const list = sample();
    const extra = rec('D', 60, ['D']);
    assert.equal(insertPaymentAt(list, -5, extra)[0].payer, 'D');
    assert.equal(insertPaymentAt(list, 99, extra).at(-1).payer, 'D');
    assert.equal(insertPaymentAt([], 0, extra).length, 1);
});

test('復原後結算結果與刪除前一致', () => {
    const list = sample();
    const people = ['A', 'B', 'C'];
    const before = calculateSettlement(people, list);
    const { records, removed } = removePaymentAt(list, 0);
    assert.notDeepEqual(
        calculateSettlement(people, records),
        before,
        '刪掉一筆後結算本來就該不一樣'
    );
    assert.deepEqual(
        calculateSettlement(people, insertPaymentAt(records, 0, removed)),
        before
    );
});

test('editingIndexAfterRemove：刪前面往前移、刪後面不動、刪到自己回 null', () => {
    assert.equal(editingIndexAfterRemove(2, 0), 1); // 刪在編輯列前面
    assert.equal(editingIndexAfterRemove(2, 1), 1);
    assert.equal(editingIndexAfterRemove(1, 2), 1); // 刪在後面
    assert.equal(editingIndexAfterRemove(2, 2), null); // 刪到正在編輯的那筆
    assert.equal(editingIndexAfterRemove(null, 1), null); // 沒在編輯
    assert.equal(editingIndexAfterRemove(0, 1), 0);
});

test('editingIndexAfterRestore：放回編輯列之前（含同一格）往後移', () => {
    assert.equal(editingIndexAfterRestore(1, 0), 2);
    assert.equal(editingIndexAfterRestore(1, 1), 2); // 插在同一格＝把編輯列往後推
    assert.equal(editingIndexAfterRestore(1, 2), 1); // 放回後面不影響
    assert.equal(editingIndexAfterRestore(null, 0), null);
});

test('刪除＋復原走完一輪，編輯指標要回到原本那一列', () => {
    const list = sample();
    const editing = 2; // 正在編輯「飲料」
    const index = 0; // 刪掉「晚餐」
    const { records, removed } = removePaymentAt(list, index);
    const mid = editingIndexAfterRemove(editing, index);
    assert.equal(records[mid].title, '飲料', '刪除後指標仍指著同一筆');
    const back = editingIndexAfterRestore(mid, index);
    assert.equal(back, editing);
    assert.equal(
        insertPaymentAt(records, index, removed)[back].title,
        '飲料',
        '復原後指標仍指著同一筆'
    );
});
