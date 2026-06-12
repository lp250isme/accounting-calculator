# accounting-calculator — Split 分帳計算器

[English](#english) | [繁體中文](#繁體中文)

🔗 **Live Demo**: [accounting.kvcc.me](https://accounting.kvcc.me)

---

## English

A bill-splitting calculator for trips and group dinners. Record who paid what and who shares each expense, then settle up with the **fewest possible transfers** — a greedy algorithm matches the biggest debtor with the biggest creditor until everyone is square.

### ✨ Features

- **Per-expense split**: Each payment can be shared by any subset of participants — tap the chips to toggle who's in.
- **Live min-transfer settlement**: Results update instantly as you add payments — exactly who pays whom, with the minimum number of transfers. No "calculate" button needed.
- **Per-person summary**: See at a glance how much each person paid, owes, and their net balance.
- **Share as text**: One tap turns the settlement into group-chat-ready text — native share sheet on mobile, clipboard on desktop.
- **Multiple saved splits**: Every split (e.g. a trip) is auto-saved to `localStorage` as you type — switch between them anytime (most recently edited first). Data never leaves your browser.
- **CSV export**: Download payment records + settlement results as UTF-8 CSV (with BOM, opens cleanly in Excel).
- **Liquid Glass UI**: Apple-style refractive glass (SVG `feDisplacementMap`, after [jh3y's technique](https://codepen.io/jh3y/pen/EajLxJV)) on Chromium, frosted-blur fallback on Safari/Firefox.
- **Light / Dark / Auto Theme**: Follows the system by default; manual override is remembered in `localStorage`.

### 🛠 Tech

- React 18 + Vite
- [liquid-glass-kit](https://github.com/lp250isme/liquid-glass-kit) — `<LiquidGlass>` refraction + frosted glass materials (`--lg-*` design tokens, iOS semantic colors)
- [more-by-kv](https://github.com/lp250isme/more-by-kv) — centralized cross-promo registry + `<MoreByKv>` card list
- Deployed on Vercel

### 🔗 More by kv

- [GTC — Maps Coordinate Converter](https://gtc.kvcc.me/) · [repo](https://github.com/lp250isme/maps-coords-api)
- [Indigo — Playlist Cover Maker](https://indigo.kvcc.me/) · [repo](https://github.com/lp250isme/playlist-cover-maker)
- [a2o — i18n Numeronym Generator](https://a2o.kvcc.me/) · [repo](https://github.com/lp250isme/a2o-i18n)

---

## 繁體中文

旅行、聚餐的分帳計算器。記錄每筆「誰付的、誰要分」，即時算出「誰該給誰多少錢」——貪婪演算法讓欠最多的優先還給墊最多的，**把轉帳次數壓到最少**。

### ✨ 功能

- **逐筆指定分擔人**：每筆付款都能用 chips 點選由哪些人分擔。
- **即時最少轉帳結算**：付款一輸入結果就自動更新——誰該給誰多少錢、次數最少，不用按「計算」。
- **個人小結**：每人付了多少、應分多少、淨額一目了然。
- **結果一鍵分享**：結算組成可直接貼進群組的文字——手機走系統分享、桌機複製到剪貼簿。
- **多筆分帳儲存**：每個分帳（例如一趟旅行）邊打邊自動存進 `localStorage`，隨時切換（最近編輯的排前面）。資料不離開你的瀏覽器。
- **CSV 匯出**：付款紀錄 + 結算結果下載成 UTF-8 CSV（含 BOM，Excel 直接開不亂碼）。
- **Liquid Glass UI**：Apple 風折射玻璃（SVG `feDisplacementMap` 位移貼圖，採用 [jh3y 的技法](https://codepen.io/jh3y/pen/EajLxJV)），Chromium 限定，Safari/Firefox 自動退回霜化模糊玻璃。
- **淺色 / 深色 / 自動主題**：預設跟隨系統，手動切換會記在 `localStorage`。

### 🛠 技術

- React 18 + Vite
- [liquid-glass-kit](https://github.com/lp250isme/liquid-glass-kit) —— `<LiquidGlass>` 折射玻璃 + 霜化玻璃材質（`--lg-*` design token、iOS 語意色）
- [more-by-kv](https://github.com/lp250isme/more-by-kv) —— 集中管理的跨作品註冊表 + `<MoreByKv>` 卡片元件
- 部署於 Vercel

### 🔗 kv 的其他作品

- [GTC — 地圖座標轉換](https://gtc.kvcc.me/) · [repo](https://github.com/lp250isme/maps-coords-api)
- [Indigo — 歌單封面製作](https://indigo.kvcc.me/) · [repo](https://github.com/lp250isme/playlist-cover-maker)
- [a2o — i18n 縮寫產生器](https://a2o.kvcc.me/) · [repo](https://github.com/lp250isme/a2o-i18n)
