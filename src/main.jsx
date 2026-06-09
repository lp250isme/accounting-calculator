import React from 'react';
import ReactDOM from 'react-dom/client';
import 'liquid-glass-kit/styles.css';
import 'more-by-kv/styles.css';
import './index.css';
import App from './App.jsx';
import { lockViewport } from 'viewport-lock';

lockViewport(); // 擋行動裝置雙指/雙擊縮放,保留捲動

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
