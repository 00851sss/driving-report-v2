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

    initSettings();
    initQRScanner();
    initQRDisplay();

    // URLハッシュによる自動車両選択（QRスキャン結果等で遷移してきた場合）
    handleUrlHash();

    // モーダルのスワイプで閉じる機能
    setupModalDragToClose();

    // 履歴管理の初期化（ブラウザの戻るボタン対応）
    initHistoryManagement();

    loadSettings();
});

function initHistoryManagement() {
    // 初回の状態（ホーム）を履歴にセット
    if (!window.history.state) {
        window.history.replaceState({ viewId: 'view-home' }, '', '');
    }

    // ブラウザの戻る/進むボタン操作を検知
    window.addEventListener('popstate', (event) => {
        const state = event.state;

        // 全てのモーダルを一旦閉じる
        document.querySelectorAll('.modal-overlay.open').forEach(m => {
            m.classList.remove('open', 'closing');
        });

        if (state) {
            if (state.modalId) {
                // モーダルを開く状態
                const modal = document.getElementById(state.modalId);
                if (modal) modal.classList.add('open');
            } else if (state.viewId) {
                // 通常のView切り替え
                internalSwitchView(state.viewId);
            }
        } else {
            internalSwitchView('view-home');
        }
    });
}

/**
 * 履歴を積みつつモーダルを開く
 */
function openModalWithHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('open');
    window.history.pushState({ modalId: modalId }, '', '');
}

/**
 * モーダルを閉じる（履歴を一つ戻すことで popstate に任せる）
 */
window.closeModal = function (modalEl) {
    if (!modalEl) return;

    // もし現在の履歴がこのモーダルのものなら、戻るボタンをシミュレートする
    if (window.history.state && window.history.state.modalId === modalEl.id) {
        window.history.back();
    } else {
        // そうでなければ（履歴管理外で開かれた場合など）直接閉じる
        modalEl.classList.add('closing');
        setTimeout(() => {
            modalEl.classList.remove('open', 'closing');
        }, 300);
    }
}

function handleUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#vehicle=')) {
        const plate = decodeURIComponent(hash.split('=')[1]);
        const vSelect = document.getElementById('vehicle-id');
        if (vSelect) {
            vSelect.value = plate;
            vSelect.dispatchEvent(new Event('change', { bubbles: true }));
            // ハッシュをクリアして何度も実行されないようにする
            history.replaceState(null, null, window.location.pathname);
        }
    }
}

let currentDestinationTargetId = null;

function initDestinationModal() {
    const modal = document.getElementById('destination-modal');
    const inputArea = document.getElementById('destination-modal-input');
    const btnOk = document.getElementById('btn-dest-modal-ok');
    const btnCancel = document.getElementById('btn-dest-modal-cancel');

    if (!modal || !inputArea || !btnOk || !btnCancel) return;

    // 記録1〜3の入力欄クリックでモーダルを開く
    ['destination-1', 'destination-2', 'destination-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                currentDestinationTargetId = id;
                inputArea.value = el.value || ''; // 現在の値をテキストエリアにセット
                renderDestinationModalChips();
                openModalWithHistory('destination-1' === id ? 'destination-modal' : 'destination-modal'); // IDに関わらずモーダル自体を開く
            });
        }
    });

    // ※修正：行番号がズレるため destination-modal も History 対応させる

    // 決定ボタン
    btnOk.addEventListener('click', () => {
        if (currentDestinationTargetId) {
            const el = document.getElementById(currentDestinationTargetId);
            if (el) {
                el.value = inputArea.value.trim();
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        window.closeModal(modal);
        currentDestinationTargetId = null;
    });

    // キャンセルボタン
    btnCancel.addEventListener('click', () => {
        window.closeModal(modal);
        currentDestinationTargetId = null;
    });
}

function renderDestinationModalChips() {
    const container = document.getElementById('destination-modal-chip-list');
    const inputArea = document.getElementById('destination-modal-input');
    if (!container || !inputArea) return;

    container.innerHTML = '';
    const list = appData.destinations || [];

    // お気に入りを優先してソート
    const sortedList = [...list].sort((a, b) => {
        const aFav = (typeof a === 'object' && a.favorite) ? 1 : 0;
        const bFav = (typeof b === 'object' && b.favorite) ? 1 : 0;
        return bFav - aFav;
    });

    // 現在の入力値を配列化（チェック状態の判定用、全角・半角スペース両方対応）
    const currentValues = inputArea.value.split(/[\s　]+/).filter(v => v.length > 0);

    sortedList.forEach((item) => {
        const name = typeof item === 'object' ? item.name : item;
        const isFav = typeof item === 'object' && item.favorite;
        const isChecked = currentValues.includes(name);

        const wrapper = document.createElement('label');
        wrapper.className = 'checkbox-item' + (isChecked ? ' checked' : '') + (isFav ? ' priority' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;

        const labelText = document.createElement('span');
        labelText.className = 'item-label';
        labelText.textContent = name;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(labelText);

        checkbox.addEventListener('change', () => {
            // デザイン用のクラス切り替え
            if (checkbox.checked) {
                wrapper.classList.add('checked');
            } else {
                wrapper.classList.remove('checked');
            }

            let vals = inputArea.value.split(/[\s　]+/).filter(v => v.length > 0);
            if (checkbox.checked) {
                if (!vals.includes(name)) {
                    vals.push(name);
                }
            } else {
                vals = vals.filter(v => v !== name);
            }
            inputArea.value = vals.join(' ');
        });

        container.appendChild(wrapper);
    });
}

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

function addItemToList(type) {
    const input = document.getElementById(`input-add-${type}`);
    const name = input.value.trim();
    if (type === 'vehicle') {
        const nickInput = document.getElementById('input-add-vehicle-nickname');
        const nickname = nickInput ? nickInput.value.trim() : '';
        const plate = name; // メイン入力はナンバー
        if (!plate && !nickname) return;

        const exists = appData.vehicles.some(v => (v.plate || '') === plate);
        if (!exists) {
            appData.vehicles.push({ plate: plate, nickname: nickname });
            if (nickInput) nickInput.value = '';
            input.value = '';
            saveSettings();
            renderTagList(type);
            updateSelectOptions(type);
        }
        return;
    }

    if (!name) return;

    const newItem = { name: name, favorite: false };
    if (type === 'driver' && !appData.drivers.some(d => d.name === name)) {
        appData.drivers.push(newItem);
    } else if (type === 'checker' && !appData.checkers.some(c => c.name === name)) {
        appData.checkers.push(newItem);
    } else if (type === 'destination' && !appData.destinations.some(d => d.name === name)) {
        appData.destinations.push(newItem);
    }

    input.value = '';
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

async function removeItemFromList(type, name) {
    let displayName = name;
    if (typeof name === 'object' && name.nickname) {
        displayName = name.nickname;
    } else if (typeof name === 'object' && name.plate) {
        displayName = name.plate;
    }

    const ok = await window.showCustomConfirm(`「${displayName}」を削除してもよろしいですか？`);
    if (!ok) return;

    if (type === 'vehicle') {
        appData.vehicles = appData.vehicles.filter(v => v.plate !== name.plate);
    } else if (type === 'driver') {
        appData.drivers = appData.drivers.filter(d => (typeof d === 'string' ? d : d.name) !== (typeof name === 'string' ? name : name.name));
    } else if (type === 'checker') {
        appData.checkers = appData.checkers.filter(c => (typeof c === 'string' ? c : c.name) !== (typeof name === 'string' ? name : name.name));
    } else if (type === 'destination') {
        appData.destinations = appData.destinations.filter(d => (typeof d === 'string' ? d : d.name) !== (typeof name === 'string' ? name : name.name));
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

    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'list-card';

        const info = document.createElement('div');
        info.className = 'card-info';

        const nameLabel = document.createElement('div');
        nameLabel.className = 'card-name';

        const subLabel = document.createElement('div');
        subLabel.className = 'card-sub';

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        if (type === 'vehicle' && typeof item === 'object') {
            nameLabel.textContent = item.nickname || '車両';
            subLabel.textContent = item.plate;
        } else {
            nameLabel.textContent = typeof item === 'object' ? item.name : item;
            subLabel.style.display = 'none';
        }

        info.appendChild(nameLabel);
        info.appendChild(subLabel);
        card.appendChild(info);

        // Edit Button (Vehicles only)
        if (type === 'vehicle') {
            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn edit';
            editBtn.title = 'ニックネームを編集';
            editBtn.innerHTML = '<span class="material-symbols-rounded">edit</span>';
            editBtn.onclick = () => editVehicleNickname(item);
            actions.appendChild(editBtn);
        }

        // QR Button (Vehicles only)
        if (type === 'vehicle') {
            const qrBtn = document.createElement('button');
            qrBtn.className = 'icon-btn qr';
            qrBtn.title = 'QRコードを表示';
            qrBtn.innerHTML = '<span class="material-symbols-rounded">qr_code_2</span>';
            qrBtn.onclick = () => typeof showVehicleQR === 'function' && showVehicleQR(item);
            actions.appendChild(qrBtn);
        }

        // Favorite Button (Driver, Checker, Destination)
        if (type !== 'vehicle') {
            const favBtn = document.createElement('button');
            const isFav = typeof item === 'object' && item.favorite;
            favBtn.className = `icon-btn fav ${isFav ? 'active' : ''}`;
            favBtn.title = isFav ? 'お気に入り解除' : 'お気に入り登録';
            favBtn.innerHTML = `<span class="material-symbols-rounded">${isFav ? 'star' : 'grade'}</span>`;
            favBtn.onclick = () => toggleFavorite(type, item);
            actions.appendChild(favBtn);
        }

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn delete';
        delBtn.title = '削除';
        delBtn.innerHTML = '<span class="material-symbols-rounded">delete_outline</span>';
        delBtn.onclick = () => removeItemFromList(type, item);
        actions.appendChild(delBtn);

        card.appendChild(actions);
        container.appendChild(card);
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

        const sortedList = [...list].sort((a, b) => {
            const aFav = typeof a === 'object' && a.favorite ? 1 : 0;
            const bFav = typeof b === 'object' && b.favorite ? 1 : 0;
            return bFav - aFav; // お気に入りを上に
        });

        sortedList.forEach(item => {
            const opt = document.createElement('option');
            if (type === 'vehicle' && typeof item === 'object') {
                opt.value = item.plate || '';
                opt.textContent = item.nickname ? `${item.nickname} (${item.plate})` : item.plate;
            } else {
                const val = typeof item === 'object' ? item.name : item;
                const isFav = typeof item === 'object' && item.favorite;
                opt.value = opt.textContent = val;
                if (isFav) opt.textContent = `★ ${val}`;
            }
            selectEl.appendChild(opt);
        });

        if (type === 'vehicle') {
            if (list.some(v => (v.plate || v) === currentVal)) {
                selectEl.value = currentVal;
            }
        } else {
            const exists = list.some(i => (typeof i === 'object' ? i.name : i) === currentVal);
            if (exists) selectEl.value = currentVal;
        }
    });
}

function toggleFavorite(type, item) {
    if (typeof item !== 'object') return;
    item.favorite = !item.favorite;
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
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
        btn.innerHTML = theme === 'dark' ? '<span class="material-symbols-rounded">light_mode</span>' : '<span class="material-symbols-rounded">dark_mode</span>';
    }
}

// --- View切り替え（内部用：履歴に追加しない） ---
function internalSwitchView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    window.scrollTo(0, 0);
}

// --- View切り替え（通常用：履歴に追加する） ---
function switchView(viewId) {
    const currentView = document.querySelector('.view.active');
    if (currentView && currentView.id === viewId) return;

    internalSwitchView(viewId);

    // 履歴に状態を追加
    window.history.pushState({ viewId: viewId }, '', '');
}

// --- 安全な画面遷移（未送信チェック付き） ---
window.safeSwitchView = async function (targetViewId) {
    const currentActiveView = document.querySelector('.view.active');

    // 現在ホーム画面か、移動先が現在の画面と同じなら何もしない（チェック不要）
    if (!currentActiveView || currentActiveView.id === 'view-home' || currentActiveView.id === targetViewId) {
        switchView(targetViewId);
        return;
    }

    const currentViewId = currentActiveView.id;
    let isDriving = false;
    let hasInput = false;

    // (1) 運転中バッジの確認
    const matchRecord = currentViewId.match(/view-record-(\d)/);
    if (matchRecord) {
        const num = matchRecord[1];
        const currentBadge = document.getElementById(`badge-record-${num}`);
        if (currentBadge && currentBadge.innerHTML.includes('運転中')) {
            isDriving = true;
        }
    }

    // (2) 入力変更の確認
    const currentInputs = currentActiveView.querySelectorAll('input:not([type="radio"]):not([type="time"]), select, textarea');
    for (const el of currentInputs) {
        if (el.value !== '' && !el.readOnly) {
            hasInput = true;
            break;
        }
    }

    if (isDriving || hasInput) {
        const ok = await window.showCustomConfirm('現在入力中（または運転中）のデータがあります。\nホームへ戻るなど別の画面へ移動してもよろしいですか？\n(※送信していないデータは失われる可能性があります)');
        if (!ok) return;
    }

    switchView(targetViewId);
};

// --- セクションを開く際の確認 ---
window.openSectionView = async function (viewId, badgeId) {
    const badge = document.getElementById(badgeId);

    // 1. 送信済みタスクを開き直す場合の警告
    if (badge && badge.innerHTML.includes('送信済')) {
        const ok = await window.showCustomConfirm('この項目はすでに送信済みです。\n新しく再送信（上書き）してよろしいですか？');
        if (!ok) return; // キャンセルされたら開かない
    }

    // 2. 他のタスクが「入力途中」の場合などの全体チェックを呼び出す
    safeSwitchView(viewId);
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

        const cleanup = () => {
            popup.classList.add('closing');
            setTimeout(() => {
                popup.style.display = 'none';
                popup.classList.remove('open', 'closing');
            }, 200);
            btnOk.removeEventListener('click', handleOk);
            popup.removeEventListener('click', handleOverlayClick);
            resolve();
        };

        const handleOk = () => cleanup();
        const handleOverlayClick = (e) => {
            if (e.target === popup) cleanup();
        };

        btnOk.addEventListener('click', handleOk);
        popup.addEventListener('click', handleOverlayClick);
        popup.style.display = 'flex';
        popup.classList.add('open');
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
            popup.classList.add('closing');
            setTimeout(() => {
                popup.style.display = 'none';
                popup.classList.remove('open', 'closing');
            }, 200);
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
            popup.removeEventListener('click', handleOverlayClick);
        };

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        const handleOverlayClick = (e) => {
            if (e.target === popup) handleCancel();
        };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
        popup.addEventListener('click', handleOverlayClick);
        popup.style.display = 'flex';
        popup.classList.add('open');
    });
};

window.showCustomPrompt = function (title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const popup = document.getElementById('custom-prompt');
        const titleEl = document.getElementById('prompt-title');
        const msgEl = document.getElementById('prompt-message');
        const inputEl = document.getElementById('prompt-input');
        const btnOk = document.getElementById('btn-prompt-ok');
        const btnCancel = document.getElementById('btn-prompt-cancel');

        if (!popup || !inputEl || !btnOk || !btnCancel) {
            resolve(prompt(message, defaultValue));
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        inputEl.value = defaultValue;

        const cleanup = () => {
            popup.classList.add('closing');
            setTimeout(() => {
                popup.style.display = 'none';
                popup.classList.remove('open', 'closing');
            }, 200);
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
            inputEl.removeEventListener('keyup', handleEnter);
            popup.removeEventListener('click', handleOverlayClick);
        };

        const handleOk = () => { cleanup(); resolve(inputEl.value); };
        const handleCancel = () => { cleanup(); resolve(null); };
        const handleEnter = (e) => { if (e.key === 'Enter') handleOk(); };
        const handleOverlayClick = (e) => { if (e.target === popup) handleCancel(); };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
        inputEl.addEventListener('keyup', handleEnter);
        popup.addEventListener('click', handleOverlayClick);

        popup.style.display = 'flex';
        popup.classList.add('open');
        setTimeout(() => inputEl.focus(), 100);
    });
};

async function editVehicleNickname(vehicleObj) {
    if (typeof vehicleObj !== 'object') return;
    const newName = await window.showCustomPrompt('車両編集', '新しいニックネームを入力してください', vehicleObj.nickname || '');
    if (newName !== null) {
        vehicleObj.nickname = newName;
        saveSettings();
        renderTagList('vehicle');
        updateSelectOptions('vehicle');
        showStatus('ニックネームを更新しました');
    }
}

// --- モーダルを下へスワイプして閉じる処理 ---
function setupModalDragToClose() {
    const modals = [document.getElementById('settings-modal'), document.getElementById('destination-modal')];

    modals.forEach(modal => {
        if (!modal) return;
        const sheet = modal.querySelector('.modal-sheet');
        if (!sheet) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const handleStart = (e) => {
            // スクロール可能なエリア（リスト等）を触っているときはドラッグ処理しない
            if (sheet.scrollTop > 0) return;
            isDragging = true;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            sheet.style.transition = 'none'; // ドラッグ中はアニメーションを切る
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            const y = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            currentY = Math.max(0, y - startY); // 下方向のみ許可

            // 少しでも下に引っ張ったら即座に反映
            if (currentY > 0) {
                if (e.cancelable) {
                    e.preventDefault(); // 画面自体のスクロールを防ぐ
                }
                sheet.style.transform = `translateY(${currentY}px)`;
            }
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

            if (currentY > 100) {
                // 一定以上引っ張ったら滑らかに閉じる (共通関数でお任せ)
                window.closeModal(modal);
                // すぐに手動の translateY を解除し、.closing クラスの CSS アニメーション(modalSlideDown)に引き継ぐ
                sheet.style.transform = '';
            } else {
                // 引っ張りが足りない場合は元に戻す
                sheet.style.transform = 'translateY(0)';
            }
            currentY = 0;
        };

        // マウスとタッチ両方に対応
        sheet.addEventListener('touchstart', handleStart, { passive: true });
        sheet.addEventListener('touchmove', handleMove, { passive: false });
        sheet.addEventListener('touchend', handleEnd);

        // マウス用にハンドル（.modal-handle）自体でのみドラッグを開始できるようにする
        const handle = sheet.querySelector('.modal-handle');
        if (handle) {
            handle.addEventListener('mousedown', handleStart);
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
        }
    });
}

// --- モーダルを閉じる共通処理（アニメーション付き） ---
window.closeModal = function (modal) {
    if (!modal) return;
    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('open');
        modal.classList.remove('closing');
    }, 300);
};


// --- QRコードスキャナー制御 ---
let html5QrCode = null;

function initQRScanner() {
    const btnScan = document.getElementById('btn-qr-scan');
    const qrModal = document.getElementById('qr-modal');
    const btnCancel = document.getElementById('btn-qr-cancel');

    if (!btnScan || !qrModal || !btnCancel) return;

    const stopScanner = () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                window.closeModal(qrModal);
            }).catch(err => {
                console.error("スキャナー停止エラー", err);
                window.closeModal(qrModal);
            });
        } else {
            window.closeModal(qrModal);
        }
    };

    btnScan.addEventListener('click', () => {
        qrModal.classList.add('open');

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        // 読み取り精度のチューニング
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // 読み取り成功時
                const selectElement = document.getElementById('vehicle-id');
                if (selectElement) {
                    const options = Array.from(selectElement.options);
                    const match = options.find(opt => opt.value === decodedText);

                    if (match) {
                        selectElement.value = decodedText;
                        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        window.showCustomAlert(`「${decodedText}」は車両マスターに登録されていません。`);
                    }
                }
                stopScanner();
            },
            (errorMessage) => {
                // 読み取り継続中のエラーは無視
            }
        ).catch((err) => {
            console.error("カメラ起動エラー", err);
            window.showCustomAlert("カメラの起動に失敗しました。ブラウザのカメラアクセス許可を確認してください。");
            stopScanner();
        });
    });

    btnCancel.addEventListener('click', stopScanner);

    // 背景タップで閉じる
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) stopScanner();
    });
}

// --- 車両別QRコード表示・生成 ---
let currentQRVehicle = null;

function initQRDisplay() {
    const modal = document.getElementById('qr-display-modal');
    const btnPrint = document.getElementById('btn-qr-print');
    const btnClose = document.getElementById('btn-qr-display-close');

    if (!modal || !btnPrint || !btnClose) return;

    btnPrint.onclick = () => {
        if (currentQRVehicle) printVehicleQR(currentQRVehicle);
    };

    btnClose.onclick = () => {
        window.closeModal(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) window.closeModal(modal);
    };
}

window.showVehicleQR = function (vehicle) {
    const modal = document.getElementById('qr-display-modal');
    const container = document.getElementById('qr-code-container');
    const plateDisplay = document.getElementById('qr-plate-display');
    const titleDisplay = document.getElementById('qr-display-title');

    if (!modal || !container || !plateDisplay) return;

    currentQRVehicle = vehicle;
    const plate = vehicle.plate || '';
    const nickname = vehicle.nickname || '';

    titleDisplay.textContent = nickname ? `${nickname} のQRコード` : '車両QRコード';
    plateDisplay.textContent = plate;
    container.innerHTML = '';

    // スキャン時に車両を選択するためのURLを生成
    // hash形式で渡すことで、ページ遷移後にJSで処理しやすくする
    const baseUrl = window.location.origin + window.location.pathname;
    const qrText = `${baseUrl}#vehicle=${encodeURIComponent(plate)}`;

    try {
        new QRCode(container, {
            text: qrText,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        modal.classList.add('open');
    } catch (e) {
        console.error("QR生成エラー", e);
        window.showCustomConfirm("QRコードの生成に失敗しました。");
    }
};

function printVehicleQR(vehicle) {
    const plate = vehicle.plate || '';
    const nickname = vehicle.nickname || '';
    const qrCanvas = document.querySelector('#qr-code-container canvas');
    if (!qrCanvas) return;

    const qrDataUrl = qrCanvas.toDataURL("image/png");
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>車両QRプリント - ${plate}</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 40px; }
                .card { border: 2px solid #ccc; padding: 40px; display: inline-block; border-radius: 16px; }
                .nickname { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                .plate { font-size: 18px; color: #666; margin-bottom: 24px; }
                img { width: 300px; height: 300px; }
                .hint { margin-top: 24px; color: #888; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="nickname">${nickname || '車両'}</div>
                <div class="plate">${plate}</div>
                <img src="${qrDataUrl}">
                <div class="hint">このQRをスキャンすると車両が自動選択されます</div>
            </div>
            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}