import { useCallback, useEffect, useState } from 'react';

const KEY = 'acc-theme'; // 偏好：'auto' | 'light' | 'dark'
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const resolve = pref =>
    pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref;

/** auto 跟隨系統、手動覆寫存 localStorage。
 *  解析後的主題永遠寫到 <html data-theme>，kit 的玻璃材質
 *  （.dark / [data-theme="dark"] 啟動）因此自動跟上。 */
export default function useTheme() {
    const [pref, setPref] = useState(
        () => localStorage.getItem(KEY) || 'auto'
    );
    const [theme, setTheme] = useState(() => resolve(pref));

    useEffect(() => {
        const apply = () => {
            const t = resolve(pref);
            setTheme(t);
            document.documentElement.dataset.theme = t;
            document
                .querySelector('meta[name="theme-color"]')
                ?.setAttribute('content', t === 'dark' ? '#000000' : '#f2f2f7');
        };
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, [pref]);

    const cycle = useCallback(() => {
        setPref(p => {
            const next =
                p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto';
            localStorage.setItem(KEY, next);
            return next;
        });
    }, []);

    return { pref, theme, cycle };
}
