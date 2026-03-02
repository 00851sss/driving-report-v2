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

    if (gasUrlEl && !_listenersAdded.has('gas-url-input')) {
        gasUrlEl.addEventListener('change', saveSettings);
        _listenersAdded.add('gas-url-input');
    }
    if (passEl && !_listenersAdded.has('passcode-input')) {
        passEl.addEventListener('change', saveSettings);
        _listenersAdded.add('passcode-input');
    }
}

const _listenersAdded = new Set();
function saveSettings() {
    const gasUrlEl = document.getElementById('gas-url-input');
    const passcodeEl = document.getElementById('passcode-input');
    const vSel = document.getElementById('default-vehicle');
    const dSel = document.getElementById('default-driver');

    // 要素が見つからない場合は保存を中止（画面読み込みが不完全な可能性）
    if (!gasUrlEl || !passcodeEl) return;

    const newGasUrl = gasUrlEl.value.trim();
    const newPasscode = passcodeEl.value.trim();

    // 重要な設定項目が「既存あり 且つ 新規が空」という異常な状態での上書きを防止
    // (スクリプトの誤動作による消失を防ぐため)
    if (appData.gasUrl && !newGasUrl && document.activeElement !== gasUrlEl) {
        console.warn('Attempted to clear GAS URL automatically. Blocked.');
    } else {
        appData.gasUrl = newGasUrl;
    }

    if (appData.passcode && !newPasscode && document.activeElement !== passcodeEl) {
        console.warn('Attempted to clear Passcode automatically. Blocked.');
    } else {
        appData.passcode = newPasscode;
    }

    if (vSel) appData.defaultVehicle = vSel.value;
    if (dSel) appData.defaultDriver = dSel.value;

    localStorage.setItem('app-settings', JSON.stringify(appData));
}