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

/** 每人淨額 = 實際付出 − 應分擔。
 *  付款人自己在分擔名單時，自己那份也算消費——這樣全體淨額和為 0，
 *  多人付款時的債權分配才會正確。
 *  （舊版把自己那份排除在欠款外、付款卻記全額，淨額被灌水：
 *    一人付全部時剛好不影響結果，多人付款時金額與分配都會算錯。） */
function computeNet(participants, paymentRecords) {
    const net = new Map(participants.map(p => [p, 0]));
    paymentRecords.forEach(r => {
        const amount = parseFloat(r.amount);
        net.set(r.payer, (net.get(r.payer) || 0) + amount);
        const share = amount / r.splitAmong.length;
        r.splitAmong.forEach(person => {
            net.set(person, (net.get(person) || 0) - share);
        });
    });
    return net;
}

/** 貪婪結算：欠最多的優先還給墊最多的，把轉帳次數壓到最少。
 *  以「分」為單位做整數運算，避免浮點殘渣（如 100/3）產生 0.00 元的轉帳列；
 *  除不盡的尾分由墊最多的人吸收。 */
export function calculateSettlement(participants, paymentRecords) {
    const net = computeNet(participants, paymentRecords);
    const cents = [...net.entries()].map(([p, n]) => [p, Math.round(n * 100)]);
    const debtors = cents.filter(([, n]) => n < 0).sort((a, b) => a[1] - b[1]);
    const creditors = cents.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

    const settlements = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
        const amount = Math.min(-debtors[i][1], creditors[j][1]);
        if (amount > 0) {
            settlements.push({
                debtor: debtors[i][0],
                creditor: creditors[j][0],
                amount: amount / 100,
            });
        }
        debtors[i][1] += amount;
        creditors[j][1] -= amount;
        if (debtors[i][1] === 0) i++;
        if (creditors[j][1] === 0) j++;
    }
    return settlements;
}

/** CSV 欄位跳脫：內含雙引號時依 RFC 4180 變成兩個 */
const q = s => `"${String(s).replace(/"/g, '""')}"`;

/** 舊版同款 CSV（含 BOM，Excel 直接開不亂碼） */
export function buildCsv(title, paymentRecords, settlements) {
    let csv = '\ufeff';
    csv += `分帳標題: ${title}\n`;
    csv += '付款紀錄\n';
    csv += '標題,付款人,金額,分擔人\n';
    paymentRecords.forEach(r => {
        csv += `${q(r.title || '')},${q(r.payer)},${q(r.amount)},${q(r.splitAmong.join(';'))}\n`;
    });
    csv += '\n結算結果\n';
    csv += '應付人,收款人,金額\n';
    settlements.forEach(s => {
        csv += `${q(s.debtor)},${q(s.creditor)},${q(s.amount.toFixed(2))}\n`;
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
