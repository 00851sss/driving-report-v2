/**
 * ss.js - 車両別スプレッドシート連携
 */

/**
 * 現在選択中の車両のシートURLを取得
 */
function getCurrentVehicleSheetUrl() {
    const vid = document.getElementById('vehicle-id')?.value;
    if (!vid) return null;
    const vehicle = appData.vehicles.find(v => v.plate === vid);
    return vehicle?.sheetUrl || null;
}

/**
 * 現在選択中の車両オブジェクトを取得
 */
function getCurrentVehicle() {
    const vid = document.getElementById('vehicle-id')?.value;
    if (!vid) return null;
    return appData.vehicles.find(v => v.plate === vid) || null;
}

/**
 * スプレッドシート連携エリアの表示更新
 * 車両が選択されていれば常に表示し、URLの有無でボタンの状態を変える
 */
function updateSsLinkArea() {
    const area = document.getElementById('vehicle-ss-link-area');
    const btnOpen = document.getElementById('btn-open-ss');
    const btnView = document.getElementById('btn-view-ss');
    if (!area) return;

    // 常に表示
    area.style.display = 'block';

    const url = getCurrentVehicleSheetUrl();

    if (url) {
        if (btnOpen) { btnOpen.disabled = false; btnOpen.style.opacity = ''; }
        if (btnView) { btnView.disabled = false; btnView.style.opacity = ''; }
    } else {
        if (btnOpen) { btnOpen.disabled = true; btnOpen.style.opacity = '0.4'; }
        if (btnView) { btnView.disabled = true; btnView.style.opacity = '0.4'; }
    }
}

/**
 * 別タブでスプレッドシートを開く
 */
function openSpreadsheet() {
    const url = getCurrentVehicleSheetUrl();
    if (url) {
        window.open(url, '_blank');
    } else {
        window.showCustomAlert('この車両にはシートURLが設定されていません。\n設定画面（⚙）の車両リストにある🔗ボタンから設定してください。');
    }
}

/**
 * アプリ内モーダルでスプレッドシートを表示
 */
function openSpreadsheetInApp() {
    const url = getCurrentVehicleSheetUrl();
    if (!url) {
        window.showCustomAlert('この車両にはシートURLが設定されていません。\n設定画面（⚙）の車両リストにある🔗ボタンから設定してください。');
        return;
    }

    const modal = document.getElementById('ss-viewer-modal');
    const iframe = document.getElementById('ss-viewer-iframe');
    const title = document.getElementById('ss-viewer-title');

    if (!modal || !iframe) return;

    const vehicle = getCurrentVehicle();
    if (title) title.textContent = vehicle?.nickname || vehicle?.plate || 'スプレッドシート';

    iframe.src = url;

    if (window.openModalWithHistory) {
        window.openModalWithHistory('ss-viewer-modal');
    } else {
        modal.classList.add('open');
    }
}

/**
 * 車両のシートURLを編集する (設定画面から呼び出し)
 */
async function editVehicleSheetUrl(vehicleObj) {
    if (typeof vehicleObj !== 'object') return;
    const current = vehicleObj.sheetUrl || '';
    const newUrl = await window.showCustomPrompt(
        'シートURL設定',
        `「${vehicleObj.nickname || vehicleObj.plate}」のGoogleスプレッドシートのURLを入力してください`,
        current
    );
    if (newUrl !== null) {
        const trimmed = newUrl.trim();
        vehicleObj.sheetUrl = trimmed;
        saveSettings();
        renderTagList('vehicle');
        updateSsLinkArea();
        if (trimmed) {
            window.showCustomAlert('シートURLを設定しました。');
        } else {
            window.showCustomAlert('シートURLをクリアしました。');
        }
    }
}

/**
 * ss.js の初期化
 */
function initSs() {
    const btnOpen = document.getElementById('btn-open-ss');
    if (btnOpen) btnOpen.addEventListener('click', openSpreadsheet);

    const btnView = document.getElementById('btn-view-ss');
    if (btnView) btnView.addEventListener('click', openSpreadsheetInApp);

    const btnClose = document.getElementById('btn-close-ss-viewer');
    if (btnClose) btnClose.addEventListener('click', () => {
        window.closeModal(document.getElementById('ss-viewer-modal'));
        const iframe = document.getElementById('ss-viewer-iframe');
        if (iframe) iframe.src = '';
    });

    // 車両選択が変わったときにエリアを更新
    const vSel = document.getElementById('vehicle-id');
    if (vSel) vSel.addEventListener('change', updateSsLinkArea);

    // 初期表示
    updateSsLinkArea();
}
