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
            document.getElementById('settings-modal').classList.add('open');
        });
    }

    const closeSettingsBtn = document.getElementById('btn-close-settings');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('open');
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

    loadSettings();
});

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

function loadSettings() {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
        try {
            appData = { ...appData, ...JSON.parse(saved) };
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

function addItemToList(type) {
    const input = document.getElementById(`input-add-${type}`);
    const name = input.value.trim();
    if (!name) return;

    if (type === 'vehicle' && !appData.vehicles.includes(name)) {
        appData.vehicles.push(name);
    } else if (type === 'driver' && !appData.drivers.includes(name)) {
        appData.drivers.push(name);
    } else if (type === 'checker' && !appData.checkers.includes(name)) {
        appData.checkers.push(name);
    } else if (type === 'destination' && !appData.destinations.includes(name)) {
        appData.destinations.push(name);
    }

    input.value = '';
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

function removeItemFromList(type, name) {
    if (type === 'vehicle') {
        appData.vehicles = appData.vehicles.filter(v => v !== name);
    } else if (type === 'driver') {
        appData.drivers = appData.drivers.filter(d => d !== name);
    } else if (type === 'checker') {
        appData.checkers = appData.checkers.filter(c => c !== name);
    } else if (type === 'destination') {
        appData.destinations = appData.destinations.filter(d => d !== name);
    }
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

function renderTagList(type) {
    const container = document.getElementById(`${type}-tag-list`);
    if (!container) return;
    container.innerHTML = '';

    let list = [];
    if (type === 'vehicle') list = appData.vehicles;
    else if (type === 'driver') list = appData.drivers;
    else if (type === 'checker') list = appData.checkers;
    else if (type === 'destination') list = appData.destinations || [];

    list.forEach(name => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        const text = document.createElement('span');
        text.textContent = name;
        const delBtn = document.createElement('button');
        delBtn.className = 'tag-del';
        delBtn.innerHTML = '✕';
        delBtn.onclick = () => removeItemFromList(type, name);

        tag.appendChild(text);
        tag.appendChild(delBtn);
        container.appendChild(tag);
    });
}

function updateSelectOptions(type) {
    let list = [];
    let selectors = [];

    if (type === 'vehicle') {
        list = appData.vehicles;
        selectors = ['vehicle-id', 'default-vehicle'];
    } else if (type === 'driver') {
        list = appData.drivers;
        selectors = ['driver-name-1', 'driver-name-2', 'driver-name-3', 'default-driver'];
    } else if (type === 'checker') {
        list = appData.checkers;
        selectors = ['pre-checker', 'post-checker'];
    } else if (type === 'destination') {
        list = appData.destinations || [];
        selectors = ['destination-1', 'destination-2', 'destination-3'];
    }

    selectors.forEach(id => {
        const selectEl = document.getElementById(id);
        if (!selectEl) return;

        const currentVal = selectEl.value;
        const defaultOption = selectEl.options[0];
        selectEl.innerHTML = '';

        if (defaultOption) {
            selectEl.appendChild(defaultOption);
        } else {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.textContent = "未選択";
            selectEl.appendChild(defaultOpt);
        }

        list.forEach(item => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = item;
            selectEl.appendChild(opt);
        });

        if (list.includes(currentVal)) {
            selectEl.value = currentVal;
        }
    });
}

// --- テーマ切り替えロジック ---
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
        // ダークモードなら「月(🌓)」、ライトモードなら「太陽(☀)」のような白黒アイコン
        btn.innerHTML = theme === 'dark' ? '◐' : '◑';
    }
}

// --- View切り替え ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    window.scrollTo(0, 0);
}

// --- セクションを開く際の確認 ---
window.openSectionView = async function (viewId, badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge && badge.innerHTML.includes('送信済')) {
        const ok = await window.showCustomConfirm('この項目はすでに送信済みです。\n新しく再送信（上書き）してよろしいですか？');
        if (!ok) return; // キャンセルされたら開かない
    }
    switchView(viewId);
};

// --- グローバルローディング制御 ---
window.showLoading = function (message = '処理中...') {
    const loader = document.getElementById('global-loading');
    const msgEl = document.getElementById('loading-message');
    if (loader) {
        if (msgEl) msgEl.textContent = message;
        loader.style.display = 'flex';
    }
};

window.hideLoading = function () {
    const loader = document.getElementById('global-loading');
    if (loader) {
        loader.style.display = 'none';
    }
};

// --- カスタムポップアップ制御 ---
window.showCustomAlert = function (message) {
    return new Promise((resolve) => {
        const popup = document.getElementById('custom-popup');
        const msgEl = document.getElementById('popup-message');
        const btnOk = document.getElementById('btn-popup-ok');
        const btnCancel = document.getElementById('btn-popup-cancel');

        if (!popup || !msgEl || !btnOk || !btnCancel) {
            alert(message); // HTMLがない場合のフォールバック
            resolve();
            return;
        }

        msgEl.textContent = message;
        btnCancel.style.display = 'none'; // Alert時はキャンセル非表示

        const handleOk = () => {
            popup.style.display = 'none';
            btnOk.removeEventListener('click', handleOk);
            resolve();
        };

        btnOk.addEventListener('click', handleOk);
        popup.style.display = 'flex';
    });
};

window.showCustomConfirm = function (message) {
    return new Promise((resolve) => {
        const popup = document.getElementById('custom-popup');
        const msgEl = document.getElementById('popup-message');
        const btnOk = document.getElementById('btn-popup-ok');
        const btnCancel = document.getElementById('btn-popup-cancel');

        if (!popup || !msgEl || !btnOk || !btnCancel) {
            resolve(confirm(message)); // HTMLがない場合のフォールバック
            return;
        }

        msgEl.textContent = message;
        btnCancel.style.display = 'block'; // Confirm時はキャンセル表示

        const cleanup = () => {
            popup.style.display = 'none';
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
        };

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
        popup.style.display = 'flex';
    });
};