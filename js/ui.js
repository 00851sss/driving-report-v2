// --- UI共通制御 ---
// （スマホ戻るボタンによる履歴管理は無効）
function initHistoryManagement() {
    // 何もしない（history管理を廃止）
}

/**
 * モーダルを開く
 */
function openModalWithHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

/**
 * モーダルを閉じる
 */
window.closeModal = function (modalEl) {
    if (!modalEl || modalEl.classList.contains('closing')) return;
    modalEl.classList.add('closing');
    setTimeout(() => {
        modalEl.classList.remove('open', 'closing');
    }, 300);
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

// --- View切り替え（通常用） ---
function switchView(viewId) {
    const currentView = document.querySelector('.view.active');
    if (currentView && currentView.id === viewId) return;
    internalSwitchView(viewId);
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

/**
 * モーダル背景切り替え部分をクリックして閉じる
 */
function setupModalOverlayClickClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            // overlay自体（背景の暗い部分）がクリックされた場合のみ閉じる
            if (e.target === overlay) {
                window.closeModal(overlay);
            }
        });
    });
}

