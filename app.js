/**
 * app.js - 初期化・設定管理・ドロップダウン更新
 */

// ---- localStorage キー ----
const KEY_GAS_URL = 'dr_gas_url';
const KEY_PASSCODE = 'dr_passcode';
const KEY_VEHICLES = 'dr_vehicles';
const KEY_DRIVERS = 'dr_drivers';
const KEY_CHECKERS = 'dr_checkers';

// ---- 設定の読み書き ----
function loadSettings() {
    const url = localStorage.getItem(KEY_GAS_URL) || '';
    const pass = localStorage.getItem(KEY_PASSCODE) || '';
    const vehicles = getList(KEY_VEHICLES);
    const drivers = getList(KEY_DRIVERS);
    const checkers = getList(KEY_CHECKERS);

    document.getElementById('gas-url-input').value = url;
    document.getElementById('passcode-input').value = pass;

    renderTagList('vehicle-tag-list', vehicles, KEY_VEHICLES);
    renderTagList('driver-tag-list', drivers, KEY_DRIVERS);
    renderTagList('checker-tag-list', checkers, KEY_CHECKERS);

    updateDropdown('vehicle-id', vehicles, '車両を選択');
    updateDropdown('driver-name-1', drivers, '運転者を選択');
    updateDropdown('driver-name-2', drivers, '運転者を選択');
    updateDropdown('driver-name-3', drivers, '運転者を選択');
    updateDropdown('pre-checker', checkers, '確認者を選択');
    updateDropdown('post-checker', checkers, '確認者を選択');
}

function saveSettings() {
    const url = document.getElementById('gas-url-input').value.trim();
    const pass = document.getElementById('passcode-input').value.trim();
    localStorage.setItem(KEY_GAS_URL, url);
    localStorage.setItem(KEY_PASSCODE, pass);
}

// ---- リスト管理 ----
function getList(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
}

function saveList(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
}

function addToList(key, value, tagContainerId, dropdownIds) {
    const val = value.trim();
    if (!val) return;
    const list = getList(key);
    if (list.includes(val)) return;
    list.push(val);
    saveList(key, list);
    renderTagList(tagContainerId, list, key);
    dropdownIds.forEach(id => updateDropdown(id, list));
}

function removeFromList(key, value) {
    const list = getList(key).filter(v => v !== value);
    saveList(key, list);
    return list;
}

// ---- タグUI描画 ----
function renderTagList(containerId, list, key) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<span style="font-size:0.8rem;color:#aaa">まだ登録がありません</span>';
        return;
    }

    list.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${item}<button class="tag-del" aria-label="削除" data-key="${key}" data-val="${item}">✕</button>`;
        container.appendChild(tag);
    });

    container.querySelectorAll('.tag-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const list = removeFromList(btn.dataset.key, btn.dataset.val);
            renderTagList(containerId, list, btn.dataset.key);
            // ドロップダウンも更新
            refreshAllDropdowns();
        });
    });
}

// ---- ドロップダウン更新 ----
function updateDropdown(id, list, placeholder = '-- 選択 --') {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        sel.appendChild(opt);
    });
    if (list.includes(current)) sel.value = current;
}

function refreshAllDropdowns() {
    const vehicles = getList(KEY_VEHICLES);
    const drivers = getList(KEY_DRIVERS);
    const checkers = getList(KEY_CHECKERS);
    updateDropdown('vehicle-id', vehicles, '車両を選択');
    updateDropdown('driver-name-1', drivers, '運転者を選択');
    updateDropdown('driver-name-2', drivers, '運転者を選択');
    updateDropdown('driver-name-3', drivers, '運転者を選択');
    updateDropdown('pre-checker', checkers, '確認者を選択');
    updateDropdown('post-checker', checkers, '確認者を選択');
}

// ---- ヘッダー更新 ----
function updateHeader() {
    const date = document.getElementById('report-date').value;
    const vehicle = document.getElementById('vehicle-id').value;

    const headerDate = document.getElementById('header-date');
    const headerVehicle = document.getElementById('header-vehicle');

    if (date) {
        const d = new Date(date);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        headerDate.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
    } else {
        headerDate.textContent = '日付未選択';
    }

    if (vehicle) {
        headerVehicle.textContent = vehicle;
        headerVehicle.classList.remove('empty');
    } else {
        headerVehicle.textContent = '車両を選択してください';
        headerVehicle.classList.add('empty');
    }
}

// ---- 記録2・3の表示制御 ----
function showRecord(num) {
    document.getElementById(`card-record-${num}`).style.display = '';
    document.getElementById(`btn-add-record-${num}`).style.display = 'none';
}

function hideRecord(num) {
    document.getElementById(`card-record-${num}`).style.display = 'none';
    document.getElementById(`btn-add-record-${num}`).style.display = '';
}

// ---- 設定モーダル ----
function openSettings() {
    loadSettings();
    document.getElementById('settings-modal').classList.add('open');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('open');
}

// ---- 初期化 ----
document.addEventListener('DOMContentLoaded', () => {
    // 今日の日付をセット
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('report-date').value = `${yyyy}-${mm}-${dd}`;

    loadSettings();
    updateHeader();

    // 記録2・3追加ボタンを初期表示
    document.getElementById('btn-add-record-2').style.display = '';
    document.getElementById('btn-add-record-3').style.display = 'none';

    // イベントリスナー
    document.getElementById('report-date').addEventListener('change', () => {
        updateHeader();
        loadDayData();
    });

    document.getElementById('vehicle-id').addEventListener('change', () => {
        updateHeader();
        loadDayData();
    });

    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('settings-modal').addEventListener('click', e => {
        if (e.target.id === 'settings-modal') closeSettings();
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        saveSettings();
        closeSettings();
    });

    // リスト追加ボタン
    document.getElementById('btn-add-vehicle').addEventListener('click', () => {
        addToList(KEY_VEHICLES, document.getElementById('input-add-vehicle').value,
            'vehicle-tag-list', ['vehicle-id']);
        document.getElementById('input-add-vehicle').value = '';
    });
    document.getElementById('input-add-vehicle').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-add-vehicle').click();
    });

    document.getElementById('btn-add-driver').addEventListener('click', () => {
        addToList(KEY_DRIVERS, document.getElementById('input-add-driver').value,
            'driver-tag-list', ['driver-name-1', 'driver-name-2', 'driver-name-3']);
        document.getElementById('input-add-driver').value = '';
    });
    document.getElementById('input-add-driver').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-add-driver').click();
    });

    document.getElementById('btn-add-checker').addEventListener('click', () => {
        addToList(KEY_CHECKERS, document.getElementById('input-add-checker').value,
            'checker-tag-list', ['pre-checker', 'post-checker']);
        document.getElementById('input-add-checker').value = '';
    });
    document.getElementById('input-add-checker').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-add-checker').click();
    });

    // 記録2・3の追加・削除
    document.getElementById('btn-add-record-2').addEventListener('click', () => {
        // 記録1の到着メーターを記録2の出発メーターに引継ぎ（空の場合のみ）
        const e1 = document.getElementById('end-meter-1');
        const s2 = document.getElementById('start-meter-2');
        if (e1 && s2 && e1.value && !s2.value) s2.value = e1.value;
        showRecord(2);
        document.getElementById('btn-add-record-3').style.display = '';
    });

    document.getElementById('btn-add-record-3').addEventListener('click', () => {
        const e2 = document.getElementById('end-meter-2');
        const s3 = document.getElementById('start-meter-3');
        if (e2 && s3 && e2.value && !s3.value) s3.value = e2.value;
        showRecord(3);
        document.getElementById('btn-add-record-3').style.display = 'none';
    });

    document.getElementById('btn-remove-record-2').addEventListener('click', () => {
        hideRecord(2);
        hideRecord(3);
        document.getElementById('btn-add-record-3').style.display = 'none';
    });

    document.getElementById('btn-remove-record-3').addEventListener('click', () => {
        hideRecord(3);
        document.getElementById('btn-add-record-3').style.display = '';
    });

    // 酒気帯び「有」の数値入力欄
    document.querySelectorAll('input[name="pre-alcohol"]').forEach(r => {
        r.addEventListener('change', e => {
            document.getElementById('pre-alcohol-val-group').style.display =
                e.target.value === '有' ? '' : 'none';
        });
    });
});
