// --- 初期設定と状態管理 ---
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

    // URLハッシュによる自動車両選択（QRスキャン結果等で遷移してきた場合）
    handleUrlHash();

    // モーダルのスワイプで閉じる機能
    setupModalDragToClose();

    // 履歴管理の初期化（ブラウザの戻るボタン対応）
    initHistoryManagement();

    loadSettings();
});
