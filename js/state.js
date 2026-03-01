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
    document.getElementById('gas-url-input').value = appData.gasUrl || '';
    document.getElementById('passcode-input').value = appData.passcode || '';

    ['vehicle', 'driver', 'checker', 'destination'].forEach(type => {
        renderTagList(type);
        updateSelectOptions(type);
    });

    // オプション生成後に選択状態を復元
    const vSel = document.getElementById('default-vehicle');
    if (vSel) {
        vSel.value = appData.defaultVehicle || '';
        vSel.addEventListener('change', saveSettings);
    }
    const dSel = document.getElementById('default-driver');
    if (dSel) {
        dSel.value = appData.defaultDriver || '';
        dSel.addEventListener('change', saveSettings);
    }

    document.getElementById('gas-url-input').addEventListener('change', saveSettings);
    document.getElementById('passcode-input').addEventListener('change', saveSettings);
}

function saveSettings() {
    appData.gasUrl = document.getElementById('gas-url-input').value.trim();
    appData.passcode = document.getElementById('passcode-input').value.trim();
    const vSel = document.getElementById('default-vehicle');
    if (vSel) appData.defaultVehicle = vSel.value;
    const dSel = document.getElementById('default-driver');
    if (dSel) appData.defaultDriver = dSel.value;

    localStorage.setItem('app-settings', JSON.stringify(appData));
}