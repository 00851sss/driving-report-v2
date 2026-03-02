// --- 初期設定と状態管理 ---

/**
 * 同期ステータス表示の初期化
 */
function initSyncStatus() {
    updateSyncStatus();
    window.addEventListener('online', () => updateSyncStatus());
    window.addEventListener('offline', () => updateSyncStatus());

    // 車両選択が変更されたときにもステータスを更新
    const vSelect = document.getElementById('vehicle-id');
    if (vSelect) {
        vSelect.addEventListener('change', () => updateSyncStatus());
    }
}

/**
 * 同期ステータス表示を更新
 * @param {string|null} customStatus 'syncing' 指定で同期中表示、null指定で現在の接続状況を表示
 */
function updateSyncStatus(customStatus = null) {
    const el = document.getElementById('sync-status');
    if (!el) return;

    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');

    el.classList.remove('online', 'offline', 'syncing', 'warning');

    if (!navigator.onLine) {
        el.classList.add('offline');
        text.textContent = 'オフライン';
    } else if (customStatus === 'syncing') {
        el.classList.add('syncing');
        text.textContent = '同期中...';
    } else if (typeof appData !== 'undefined' && !appData.gasUrl) {
        el.classList.add('offline');
        text.textContent = '設定が必要';
    } else {
        const vId = document.getElementById('vehicle-id')?.value;
        if (!vId) {
            el.classList.add('warning');
            text.textContent = '車両未選択';
        } else {
            el.classList.add('online');
            text.textContent = '準備完了';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openModalWithHistory('settings-modal');
        });
    }

    const closeSettingsBtn = document.getElementById('btn-close-settings');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            window.closeModal(document.getElementById('settings-modal'));
        });
    }

    // タブ切り替え処理
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        });
    });

    document.getElementById('btn-add-vehicle')?.addEventListener('click', () => addItemToList('vehicle'));
    document.getElementById('btn-add-driver')?.addEventListener('click', () => addItemToList('driver'));
    document.getElementById('btn-add-checker')?.addEventListener('click', () => addItemToList('checker'));
    document.getElementById('btn-add-destination')?.addEventListener('click', () => addItemToList('destination'));

    document.getElementById('btn-sync-master')?.addEventListener('click', () => {
        if (typeof syncMasterData === 'function') syncMasterData();
    });

    // 訪問先モーダル関連の初期化
    initDestinationModal();
    // 各種初期化
    initSettings();
    initQRScanner();
    initQRDisplay();
    initInfo(); // 通知・バージョン情報の初期化
    initSs();   // スプレッドシート連携の初期化
    initSyncStatus(); // 同期ステータスの初期化

    // URLハッシュによる自動車両選択（QRスキャン結果等で遷移してきた場合）
    handleUrlHash();

    // モーダル背景クリックで閉じる機能
    setupModalOverlayClickClose();

    // 履歴管理の初期化（ブラウザの戻るボタン対応）
    initHistoryManagement();
});
