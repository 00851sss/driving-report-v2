// --- 状態管理・設定保存 ---
let appData = {
    vehicles: [],
    drivers: [],
    checkers: [],
    destinations: [],
    gasUrl: '',
    passcode: '',
    defaultVehicle: '',
    defaultDriver: ''
};

function initSettings() {
    loadSettings(); // 既存のloadSettingsを呼び出す
    // 必要であれば、ここで他の設定関連の初期化処理を追加
}

function loadSettings() {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
        try {
            appData = { ...appData, ...JSON.parse(saved) };
            // データ構造のマイグレーション
            if (appData.vehicles && appData.vehicles.length > 0 && typeof appData.vehicles[0] === 'string') {
                appData.vehicles = appData.vehicles.map(v => ({ plate: v, nickname: '' }));
            }
            // 運転者・確認者・訪問先のマイグレーション
            ['drivers', 'checkers', 'destinations'].forEach(key => {
                if (appData[key] && appData[key].length > 0 && typeof appData[key][0] === 'string') {
                    appData[key] = appData[key].map(name => ({ name: name, favorite: false }));
                }
            });
        } catch (e) { }
    }
    const gasUrlEl = document.getElementById('gas-url-input');
    const passEl = document.getElementById('passcode-input');
    if (gasUrlEl) gasUrlEl.value = appData.gasUrl || '';
    if (passEl) passEl.value = appData.passcode || '';

    ['vehicle', 'driver', 'checker', 'destination'].forEach(type => {
        renderTagList(type);
        updateSelectOptions(type);
    });

    // オプション生成後に選択状態を復元
    const vSel = document.getElementById('default-vehicle');
    if (vSel) {
        vSel.value = appData.defaultVehicle || '';
        if (!_listenersAdded.has('default-vehicle')) {
            vSel.addEventListener('change', saveSettings);
            _listenersAdded.add('default-vehicle');
        }
    }
    const dSel = document.getElementById('default-driver');
    if (dSel) {
        dSel.value = appData.defaultDriver || '';
        if (!_listenersAdded.has('default-driver')) {
            dSel.addEventListener('change', saveSettings);
            _listenersAdded.add('default-driver');
        }
    }

    // GAS URLとパスコードは自動保存せず、専用ボタンで手動保存する
    const btnSaveGas = document.getElementById('btn-save-gas-settings');
    if (btnSaveGas && !_listenersAdded.has('btn-save-gas-settings')) {
        btnSaveGas.addEventListener('click', () => {
            saveSettings();
            if (window.showCustomAlert) {
                window.showCustomAlert('「共通」の設定を保存しました。');
            } else {
                alert('「共通」の設定を保存しました。');
            }
        });
        _listenersAdded.add('btn-save-gas-settings');
    }
}

/**
 * 内部状態 (appData) を localStorage に書き出す。
 * UIの状態に関わらず、現在の appData をそのまま保存する安全な方法。
 */
function persistSettings() {
    localStorage.setItem('app-settings', JSON.stringify(appData));
}

const _listenersAdded = new Set();
/**
 * UI（ドロップダウン等）から値を読み取って appData を更新し、保存する。
 * 主に「設定」タブでのユーザー操作時に使用する。
 */
function saveSettings() {
    const gasUrlEl = document.getElementById('gas-url-input');
    const passcodeEl = document.getElementById('passcode-input');
    const vSel = document.getElementById('default-vehicle');
    const dSel = document.getElementById('default-driver');

    const activeEl = document.activeElement;

    // DOMから設定用の入力要素が取得できた場合のみ、値を読み取って appData を更新する
    if (gasUrlEl) {
        const newGasUrl = gasUrlEl.value.trim();
        // 意図しない空保存の防止: 
        // 既存の値があるのに新しく読み取った値が空で、かつユーザーがその入力欄を操作していない場合は保存をスキップ
        if (appData.gasUrl && !newGasUrl && activeEl !== gasUrlEl) {
            console.warn('[state.js] Attempted to clear GAS URL automatically. Blocked.');
        } else {
            appData.gasUrl = newGasUrl;
        }
    }

    if (passcodeEl) {
        const newPasscode = passcodeEl.value.trim();
        if (appData.passcode && !newPasscode && activeEl !== passcodeEl) {
            console.warn('[state.js] Attempted to clear Passcode automatically. Blocked.');
        } else {
            appData.passcode = newPasscode;
        }
    }

    // デフォルト設定も同様にガード
    if (vSel) {
        const newV = vSel.value;
        if (appData.defaultVehicle && !newV && activeEl !== vSel) {
            console.warn('[state.js] Attempted to clear Default Vehicle automatically. Blocked.');
        } else {
            appData.defaultVehicle = newV;
        }
    }
    if (dSel) {
        const newD = dSel.value;
        if (appData.defaultDriver && !newD && activeEl !== dSel) {
            console.warn('[state.js] Attempted to clear Default Driver automatically. Blocked.');
        } else {
            appData.defaultDriver = newD;
        }
    }

    persistSettings();
}