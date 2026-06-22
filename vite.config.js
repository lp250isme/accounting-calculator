import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Build version = git SHA（Vercel 注入；本機 fallback git）。同 GTC 範本。
const gitSha = (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    (() => { try { return execSync('git rev-parse HEAD').toString(); } catch { return 'dev'; } })()
).trim().slice(0, 7);

export default defineConfig({
    define: { __GIT_SHA__: JSON.stringify(gitSha) },
    plugins: [react()],
});
