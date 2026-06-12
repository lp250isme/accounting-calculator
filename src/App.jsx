import { useEffect, useMemo, useRef, useState } from 'react';
import { LiquidGlass } from 'liquid-glass-kit';
import { MoreByKv } from 'more-by-kv';
import useTheme from './useTheme';
import {
    loadRecords,
    saveRecord,
    deleteRecord,
    calculateSettlement,
    computePersonSummary,
    buildShareText,
    downloadCsv,
} from './splitBill';

const fmt = n => Number(parseFloat(n).toFixed(2)).toLocaleString();

function ThemeIcon({ pref }) {
    if (pref === 'light') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
        );
    }
    if (pref === 'dark') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
        </svg>
    );
}

function Chevron({ open }) {
    return (
        <svg className={`chevron ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

export default function App() {
    const { pref, theme, cycle } = useTheme();

    // 當前分帳 — 與舊版相同的資料模型
    const [splitId, setSplitId] = useState(null);
    const [title, setTitle] = useState('');
    const [participants, setParticipants] = useState([]);
    const [paymentRecords, setPaymentRecords] = useState([]);
    const [collapsed, setCollapsed] = useState({
        participants: false,
        savedRecords: false,
    });
    const [records, setRecords] = useState(() => loadRecords());

    // 表單
    const [nameInput, setNameInput] = useState('');
    const [payTitle, setPayTitle] = useState('');
    const [payer, setPayer] = useState('');
    const [amount, setAmount] = useState('');
    const [splitAmong, setSplitAmong] = useState(() => new Set());

    // inline 回饋（取代 alert/confirm）
    const [formError, setFormError] = useState('');
    const [participantError, setParticipantError] = useState('');
    const [confirmingId, setConfirmingId] = useState(null);
    const [shared, setShared] = useState(false);
    const participantErrTimer = useRef(null);
    const confirmTimer = useRef(null);
    const sharedTimer = useRef(null);

    const nameRef = useRef(null);
    const payTitleRef = useRef(null);
    const amountRef = useRef(null);

    const total = paymentRecords.reduce(
        (sum, r) => sum + parseFloat(r.amount),
        0
    );
    const canPay = participants.length > 1;

    // 即時結算：付款一變動就算好，不用再按「計算」
    const settlements = useMemo(
        () =>
            paymentRecords.length > 0
                ? calculateSettlement(participants, paymentRecords)
                : null,
        [participants, paymentRecords]
    );
    const personSummary = useMemo(
        () =>
            paymentRecords.length > 0
                ? computePersonSummary(participants, paymentRecords)
                : null,
        [participants, paymentRecords]
    );

    // 已儲存分帳：最近編輯在前
    const sortedRecords = useMemo(
        () =>
            [...records].sort((a, b) =>
                (b.timestamp || '').localeCompare(a.timestamp || '')
            ),
        [records]
    );

    // 自動儲存：有標題 + id 的分帳，任何變動都即時寫回 localStorage（舊版同款行為）
    useEffect(() => {
        if (!splitId || !title.trim()) return;
        setRecords(
            saveRecord({
                id: splitId,
                title: title.trim(),
                participants,
                paymentRecords,
                sectionsCollapsed: collapsed,
                timestamp: new Date().toISOString(),
            })
        );
    }, [splitId, title, participants, paymentRecords, collapsed]);

    /* ---------- 分帳標題 ---------- */
    const commitTitle = () => {
        // 第一次輸入標題就建立新分帳（保留已輸入的參與者／付款）
        if (!splitId && title.trim()) {
            setSplitId(Date.now().toString());
        }
    };

    const resetState = () => {
        setSplitId(null);
        setTitle('');
        setParticipants([]);
        setPaymentRecords([]);
        setCollapsed({ participants: false, savedRecords: false });
        setPayTitle('');
        setPayer('');
        setAmount('');
        setSplitAmong(new Set());
        setFormError('');
        setParticipantError('');
    };

    /* ---------- 參與者 ---------- */
    const addParticipant = () => {
        const name = nameInput.trim();
        setNameInput('');
        nameRef.current?.focus();
        if (!name || participants.includes(name)) return;
        setParticipants(ps => [...ps, name]);
        setSplitAmong(s => new Set([...s, name])); // 新成員預設加入分擔
    };

    const removeParticipant = name => {
        if (
            paymentRecords.some(
                r => r.payer === name || r.splitAmong.includes(name)
            )
        ) {
            setParticipantError(`「${name}」已有付款紀錄，無法移除`);
            clearTimeout(participantErrTimer.current);
            participantErrTimer.current = setTimeout(
                () => setParticipantError(''),
                3000
            );
            return;
        }
        setParticipantError('');
        setParticipants(ps => ps.filter(p => p !== name));
        setSplitAmong(s => {
            const next = new Set(s);
            next.delete(name);
            return next;
        });
        if (payer === name) setPayer('');
    };

    /* ---------- 付款 ---------- */
    const toggleSplitAmong = name => {
        setFormError('');
        setSplitAmong(s => {
            const next = new Set(s);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const addPayment = () => {
        const value = parseFloat(amount);
        if (!payer) {
            setFormError('請選擇付款人');
            return;
        }
        if (!amount || !(value > 0)) {
            setFormError('請輸入大於 0 的金額');
            amountRef.current?.focus();
            return;
        }
        if (splitAmong.size === 0) {
            setFormError('請至少選擇一位分擔人');
            return;
        }
        setFormError('');
        setPaymentRecords(rs => [
            ...rs,
            {
                payer,
                amount: value,
                splitAmong: participants.filter(p => splitAmong.has(p)),
                title: payTitle.trim(),
            },
        ]);
        setPayTitle('');
        setAmount('');
        setPayer('');
        setSplitAmong(new Set(participants)); // 回到預設全選
        payTitleRef.current?.focus();
    };

    const removePayment = index =>
        setPaymentRecords(rs => rs.filter((_, i) => i !== index));

    /* ---------- 分享 / 匯出 ---------- */
    const shareResult = async () => {
        const text = buildShareText(title.trim(), paymentRecords, settlements);
        if (navigator.share) {
            try {
                await navigator.share({ text });
            } catch {
                /* 使用者取消分享 */
            }
            return;
        }
        await navigator.clipboard.writeText(text);
        setShared(true);
        clearTimeout(sharedTimer.current);
        sharedTimer.current = setTimeout(() => setShared(false), 1600);
    };

    const exportCsv = () =>
        downloadCsv(title.trim(), paymentRecords, settlements);

    /* ---------- 已儲存分帳 ---------- */
    const loadOne = record => {
        setSplitId(record.id);
        setTitle(record.title);
        setParticipants([...record.participants]);
        setPaymentRecords([...record.paymentRecords]);
        setCollapsed(
            record.sectionsCollapsed || {
                participants: false,
                savedRecords: false,
            }
        );
        setPayTitle('');
        setPayer('');
        setAmount('');
        setSplitAmong(new Set(record.participants));
        setFormError('');
        setParticipantError('');
    };

    // 兩段式刪除：第一下進入確認狀態（3 秒自動還原），第二下才真的刪
    const removeOne = record => {
        if (confirmingId !== record.id) {
            setConfirmingId(record.id);
            clearTimeout(confirmTimer.current);
            confirmTimer.current = setTimeout(() => setConfirmingId(null), 3000);
            return;
        }
        clearTimeout(confirmTimer.current);
        setConfirmingId(null);
        setRecords(deleteRecord(record.id));
        if (splitId === record.id) resetState();
    };

    const toggleSection = key =>
        setCollapsed(c => ({ ...c, [key]: !c[key] }));

    return (
        <main className="page">
            <header className="topbar animate-fade-in">
                <img
                    src={theme === 'dark' ? '/icon-dark.png' : '/icon.png'}
                    alt="分帳計算器"
                />
                <button
                    className="glass icon-btn"
                    onClick={cycle}
                    aria-label="切換主題"
                >
                    <ThemeIcon pref={pref} />
                </button>
            </header>

            <section className="hero animate-fade-in">
                <h1>分帳計算器</h1>
                <p>
                    旅行、聚餐的多人帳一次記清楚，即時算出「誰該給誰多少錢」，
                    用最少的轉帳次數結清。資料只存在你的瀏覽器。
                </p>
            </section>

            <section className="card-stack">
                {/* 分帳標題 */}
                <LiquidGlass
                    radius={28}
                    frost={0.08}
                    className="title-card animate-fade-in"
                >
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                                e.currentTarget.blur();
                        }}
                        placeholder="分帳標題，例如：澳門旅行"
                        spellCheck={false}
                        autoComplete="off"
                    />
                </LiquidGlass>

                {/* 參與者 */}
                <div className="glass-panel section-card animate-fade-in">
                    <button
                        className="section-head"
                        onClick={() => toggleSection('participants')}
                        aria-expanded={!collapsed.participants}
                    >
                        <span className="section-title">參與者</span>
                        {participants.length > 0 && (
                            <span className="section-meta">
                                {participants.length} 人
                            </span>
                        )}
                        <Chevron open={!collapsed.participants} />
                    </button>
                    {collapsed.participants ? (
                        <div className="collapsed-summary">
                            {participants.length > 0
                                ? participants.join('、')
                                : '尚無參與者'}
                        </div>
                    ) : (
                        <>
                            <div className="field-row">
                                <input
                                    ref={nameRef}
                                    className="field"
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (
                                            e.key === 'Enter' &&
                                            !e.nativeEvent.isComposing
                                        )
                                            addParticipant();
                                    }}
                                    placeholder="輸入姓名"
                                    autoComplete="off"
                                />
                                <button
                                    className="glass-chip pill-btn"
                                    onClick={addParticipant}
                                    disabled={!nameInput.trim()}
                                >
                                    新增
                                </button>
                            </div>
                            {participants.length > 0 && (
                                <div className="people">
                                    {participants.map(p => (
                                        <span key={p} className="glass-chip person">
                                            {p}
                                            <button
                                                className="x-btn"
                                                onClick={() => removeParticipant(p)}
                                                aria-label={`移除 ${p}`}
                                            >
                                                <XIcon />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {participantError && (
                                <p className="form-error" role="alert">
                                    {participantError}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* 新增付款 */}
                <div className="glass-panel section-card animate-fade-in">
                    <div className="section-head static">
                        <span className="section-title">付款紀錄</span>
                        {total > 0 && (
                            <span className="section-meta">
                                總支出 {fmt(total)} 元
                            </span>
                        )}
                    </div>
                    {!canPay ? (
                        <p className="hint">至少需要兩位參與者才能開始分帳</p>
                    ) : (
                        <>
                            <div className="field-col">
                                <input
                                    ref={payTitleRef}
                                    className="field"
                                    value={payTitle}
                                    onChange={e => setPayTitle(e.target.value)}
                                    placeholder="項目（選填），例如：晚餐"
                                    autoComplete="off"
                                />
                                <div className="field-row">
                                    <select
                                        className="field"
                                        value={payer}
                                        onChange={e => {
                                            setFormError('');
                                            setPayer(e.target.value);
                                            if (e.target.value)
                                                amountRef.current?.focus();
                                        }}
                                    >
                                        <option value="">選擇付款人</option>
                                        {participants.map(p => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        ref={amountRef}
                                        className="field"
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => {
                                            setFormError('');
                                            setAmount(e.target.value);
                                        }}
                                        onKeyDown={e => {
                                            if (
                                                e.key === 'Enter' &&
                                                !e.nativeEvent.isComposing
                                            )
                                                addPayment();
                                        }}
                                        placeholder="金額"
                                    />
                                </div>
                            </div>
                            <div className="split-among">
                                <span className="split-label">分擔人</span>
                                <div className="people">
                                    {participants.map(p => (
                                        <button
                                            key={p}
                                            className={`glass-chip person-toggle ${
                                                splitAmong.has(p) ? 'on' : ''
                                            }`}
                                            onClick={() => toggleSplitAmong(p)}
                                            aria-pressed={splitAmong.has(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {formError && (
                                <p className="form-error" role="alert">
                                    {formError}
                                </p>
                            )}
                            <button className="primary-btn" onClick={addPayment}>
                                新增付款
                            </button>
                        </>
                    )}
                    {paymentRecords.length > 0 && (
                        <ul className="entries">
                            {paymentRecords.map((r, i) => (
                                <li key={i} className="entry">
                                    <div className="entry-text">
                                        <span>
                                            {r.title && (
                                                <span className="entry-tag">
                                                    {r.title}
                                                </span>
                                            )}
                                            <b>{r.payer}</b> 付了{' '}
                                            <b>{fmt(r.amount)}</b> 元
                                        </span>
                                        <span className="entry-sub">
                                            分擔：{r.splitAmong.join('、')}
                                        </span>
                                    </div>
                                    <button
                                        className="x-btn"
                                        onClick={() => removePayment(i)}
                                        aria-label="刪除付款"
                                    >
                                        <XIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 結算 — 付款一變動即時更新，免按計算 */}
                <div className="glass-panel section-card animate-fade-in">
                    <div className="section-head static">
                        <span className="section-title">結算結果</span>
                        <div className="head-actions">
                            <button
                                className={`glass-chip pill-btn share-btn ${
                                    shared ? 'done' : ''
                                }`}
                                onClick={shareResult}
                                disabled={!settlements}
                            >
                                {/* key 強制換 DOM 節點，避開 iOS WebKit 換字疊影 */}
                                <span key={shared ? 'done' : 'share'}>
                                    {shared ? '已複製 ✓' : '分享'}
                                </span>
                            </button>
                            <button
                                className="glass-chip pill-btn"
                                onClick={exportCsv}
                                disabled={!settlements}
                            >
                                CSV
                            </button>
                        </div>
                    </div>
                    {!settlements ? (
                        <p className="hint">新增付款後，這裡會即時算出結果</p>
                    ) : (
                        <>
                            <ul className="person-summary">
                                {personSummary.map(s => (
                                    <li key={s.name}>
                                        <span className="ps-name">{s.name}</span>
                                        <span className="ps-detail">
                                            付 {fmt(s.paid)} · 應分 {fmt(s.share)}
                                        </span>
                                        <span
                                            className={`ps-net ${
                                                s.net > 0
                                                    ? 'pos'
                                                    : s.net < 0
                                                      ? 'neg'
                                                      : ''
                                            }`}
                                        >
                                            {s.net > 0 ? '+' : ''}
                                            {fmt(s.net)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {settlements.length > 0 ? (
                                <ul className="entries">
                                    {settlements.map((s, i) => (
                                        <li key={i} className="entry settle">
                                            <span className="settle-names">
                                                <b>{s.debtor}</b>
                                                <ArrowIcon />
                                                <b>{s.creditor}</b>
                                            </span>
                                            <span className="settle-amount">
                                                {fmt(s.amount)} 元
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="hint">
                                    全部結清，沒有人需要轉帳 🎉
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* 已儲存分帳 */}
                <div className="glass-panel section-card animate-fade-in">
                    <button
                        className="section-head"
                        onClick={() => toggleSection('savedRecords')}
                        aria-expanded={!collapsed.savedRecords}
                    >
                        <span className="section-title">已儲存分帳</span>
                        {records.length > 0 && (
                            <span className="section-meta">
                                {records.length} 筆
                            </span>
                        )}
                        <Chevron open={!collapsed.savedRecords} />
                    </button>
                    {!collapsed.savedRecords && (
                        <>
                            <button
                                className="glass-chip pill-btn new-split"
                                onClick={resetState}
                            >
                                ＋ 新增分帳
                            </button>
                            {records.length === 0 ? (
                                <p className="hint">
                                    輸入分帳標題後會自動儲存在這裡
                                </p>
                            ) : (
                                <ul className="entries">
                                    {sortedRecords.map(r => (
                                        <li
                                            key={r.id}
                                            className={`entry record ${
                                                r.id === splitId ? 'current' : ''
                                            }`}
                                            onClick={() => loadOne(r)}
                                        >
                                            <div className="entry-text">
                                                <span>
                                                    <b>{r.title}</b>
                                                </span>
                                                <span className="entry-sub">
                                                    {new Date(
                                                        r.timestamp
                                                    ).toLocaleDateString()}{' '}
                                                    · {r.participants.length} 人 ·{' '}
                                                    {r.paymentRecords.length} 筆付款
                                                </span>
                                            </div>
                                            {confirmingId === r.id ? (
                                                <button
                                                    className="confirm-del"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        removeOne(r);
                                                    }}
                                                >
                                                    刪除？
                                                </button>
                                            ) : (
                                                <button
                                                    className="x-btn"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        removeOne(r);
                                                    }}
                                                    aria-label={`刪除 ${r.title}`}
                                                >
                                                    <XIcon />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* 跨作品互推 — 註冊表在 more-by-kv，更新一處全 app 跟上 */}
            <MoreByKv
                exclude={['acc']}
                lang="zh"
                theme={theme}
                className="more-by animate-fade-in"
            />

            <footer className="animate-fade-in">
                資料只存在你的瀏覽器 localStorage ·{' '}
                <a
                    href="https://github.com/lp250isme/accounting-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    GitHub
                </a>
            </footer>
        </main>
    );
}
