/* ============================================================
   分帳核心邏輯 — 與舊版單檔 app 完全相容：
   localStorage key 'splitRecords'、record 格式
   { id, title, participants, paymentRecords, sectionsCollapsed, timestamp }
   舊資料升級後可直接讀回。
   ============================================================ */

const KEY = 'splitRecords';

export function loadRecords() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
        return [];
    }
}

export function saveRecord(record) {
    const records = loadRecords();
    const i = records.findIndex(r => r.id === record.id);
    if (i !== -1) records[i] = record;
    else records.push(record);
    localStorage.setItem(KEY, JSON.stringify(records));
    return records;
}

export function deleteRecord(id) {
    const records = loadRecords().filter(r => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify(records));
    return records;
}

/** 每人帳面：paid = 實際付出，owed = 應分擔（自己付的那份不計入欠款） */
function computeNet(participants, paymentRecords) {
    const paid = new Map(participants.map(p => [p, 0]));
    const owed = new Map(participants.map(p => [p, 0]));
    paymentRecords.forEach(r => {
        const amount = parseFloat(r.amount);
        paid.set(r.payer, (paid.get(r.payer) || 0) + amount);
        const share = amount / r.splitAmong.length;
        r.splitAmong.forEach(person => {
            if (person !== r.payer) {
                owed.set(person, (owed.get(person) || 0) + share);
            }
        });
    });
    return { paid, owed };
}

/** 貪婪結算：欠最多的優先還給墊最多的，把轉帳次數壓到最少 */
export function calculateSettlement(participants, paymentRecords) {
    const { paid, owed } = computeNet(participants, paymentRecords);
    const net = participants.map(p => [p, (paid.get(p) || 0) - (owed.get(p) || 0)]);
    const debtors = net.filter(([, n]) => n < 0).sort((a, b) => a[1] - b[1]);
    const creditors = net.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

    const settlements = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
        const amount = Math.min(-debtors[i][1], creditors[j][1]);
        if (amount > 0) {
            settlements.push({
                debtor: debtors[i][0],
                creditor: creditors[j][0],
                amount,
            });
        }
        debtors[i][1] += amount;
        creditors[j][1] -= amount;
        if (Math.abs(debtors[i][1]) < 0.01) i++;
        if (Math.abs(creditors[j][1]) < 0.01) j++;
    }
    return settlements;
}

/** 舊版同款 CSV（含 BOM，Excel 直接開不亂碼） */
export function buildCsv(title, paymentRecords, settlements) {
    let csv = '\ufeff';
    csv += `分帳標題: ${title}\n`;
    csv += '付款紀錄\n';
    csv += '標題,付款人,金額,分擔人\n';
    paymentRecords.forEach(r => {
        csv += `"${r.title || ''}","${r.payer}","${r.amount}","${r.splitAmong.join(';')}"\n`;
    });
    csv += '\n結算結果\n';
    csv += '應付人,收款人,金額\n';
    settlements.forEach(s => {
        csv += `"${s.debtor}","${s.creditor}","${s.amount.toFixed(2)}"\n`;
    });
    return csv;
}

export function downloadCsv(title, paymentRecords, settlements) {
    const blob = new Blob([buildCsv(title, paymentRecords, settlements)], {
        type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `分帳結果_${title || new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
