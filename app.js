// ---- localStorage キー ----
const KEY_GAS_URL = 'dr_gas_url';
const KEY_PASSCODE = 'dr_passcode';
const KEY_VEHICLES = 'dr_vehicles';
const KEY_DRIVERS = 'dr_drivers';
const KEY_CHECKERS = 'dr_checkers';

// ---- 画面の切り替え機能 ----
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
}
window.switchView = switchView;

// ---- 設定の読み書き ----
function loadSettings() {
    document.getElementById('gas-url-input').value = localStorage.getItem(KEY_GAS_URL) || '';
    document.getElementById('passcode-input').value = localStorage.getItem(KEY_PASSCODE) || '';
    const vehicles = getList(KEY_VEHICLES); const drivers = getList(KEY_DRIVERS); const checkers = getList(KEY_CHECKERS);
    renderTagList('vehicle-tag-list', vehicles, KEY_VEHICLES);
    renderTagList('driver-tag-list', drivers, KEY_DRIVERS);
    renderTagList('checker-tag-list', checkers, KEY_CHECKERS);
    refreshAllDropdowns();
}

function saveSettings() {
    localStorage.setItem(KEY_GAS_URL, document.getElementById('gas-url-input').value.trim());
    localStorage.setItem(KEY_PASSCODE, document.getElementById('passcode-input').value.trim());
}

// ---- リスト管理・タグ描画・ドロップダウン ----
function getList(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function saveList(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
function addToList(key, value, tagContainerId) {
    const val = value.trim(); if (!val) return;
    const list = getList(key); if (list.includes(val)) return;
    list.push(val); saveList(key, list);
    renderTagList(tagContainerId, list, key); refreshAllDropdowns();
}
function renderTagList(containerId, list, key) {
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = list.length === 0 ? '<span style="font-size:0.8rem;color:#aaa">未登録</span>' : '';
    list.forEach(item => {
        const tag = document.createElement('span'); tag.className = 'tag';
        tag.innerHTML = `${item}<button class="tag-del" data-key="${key}" data-val="${item}">✕</button>`;
        container.appendChild(tag);
    });
    container.querySelectorAll('.tag-del').forEach(btn => {
        btn.addEventListener('click', () => {
            saveList(btn.dataset.key, getList(btn.dataset.key).filter(v => v !== btn.dataset.val));
            renderTagList(containerId, getList(btn.dataset.key), btn.dataset.key); refreshAllDropdowns();
        });
    });
}
function updateDropdown(id, list) {
    const sel = document.getElementById(id); if (!sel) return;
    const current = sel.value; sel.innerHTML = `<option value="">-- 選択 --</option>`;
    list.forEach(item => { const opt = document.createElement('option'); opt.value = item; opt.textContent = item; sel.appendChild(opt); });
    if (list.includes(current)) sel.value = current;
}
function refreshAllDropdowns() {
    const v = getList(KEY_VEHICLES), d = getList(KEY_DRIVERS), c = getList(KEY_CHECKERS);
    updateDropdown('vehicle-id', v);
    ['1', '2', '3'].forEach(n => updateDropdown(`driver-name-${n}`, d));
    updateDropdown('pre-checker', c); updateDropdown('post-checker', c);
}

// ---- 設定モーダル制御 ----
function openSettings() { loadSettings(); document.getElementById('settings-modal').classList.add('open'); }
function closeSettings() { document.getElementById('settings-modal').classList.remove('open'); }

// ---- 初期化 ----
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    document.getElementById('report-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    loadSettings();

    document.getElementById('report-date').addEventListener('change', loadDayData);
    document.getElementById('vehicle-id').addEventListener('change', loadDayData);

    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings').addEventListener('click', () => { saveSettings(); closeSettings(); });

    document.getElementById('btn-add-vehicle').addEventListener('click', () => { addToList(KEY_VEHICLES, document.getElementById('input-add-vehicle').value, 'vehicle-tag-list'); document.getElementById('input-add-vehicle').value = ''; });
    document.getElementById('btn-add-driver').addEventListener('click', () => { addToList(KEY_DRIVERS, document.getElementById('input-add-driver').value, 'driver-tag-list'); document.getElementById('input-add-driver').value = ''; });
    document.getElementById('btn-add-checker').addEventListener('click', () => { addToList(KEY_CHECKERS, document.getElementById('input-add-checker').value, 'checker-tag-list'); document.getElementById('input-add-checker').value = ''; });

    document.getElementById('btn-copy-meter-2')?.addEventListener('click', () => { const e1 = document.getElementById('end-meter-1').value; if (e1) document.getElementById('start-meter-2').value = e1; });
    document.getElementById('btn-copy-meter-3')?.addEventListener('click', () => { const e2 = document.getElementById('end-meter-2').value; if (e2) document.getElementById('start-meter-3').value = e2; });

    document.querySelectorAll('input[name="pre-alcohol"]').forEach(r => {
        r.addEventListener('change', e => document.getElementById('pre-alcohol-val-group').style.display = e.target.value === '有' ? '' : 'none');
    });
});