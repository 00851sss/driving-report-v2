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

    // QRコードリーダーの初期化
    initQRScanner();

    // モーダルのスワイプで閉じる機能
    setupModalDragToClose();

    loadSettings();
});

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
                modal.classList.add('open');
            });
        }
    });

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

    list.forEach(name => {
        const chip = document.createElement('div');
        chip.className = 'tag';
        chip.style.cursor = 'pointer';
        chip.style.backgroundColor = 'var(--color-bg)';
        chip.style.border = '1px solid var(--color-border)';
        chip.textContent = name;

        chip.addEventListener('click', () => {
            const currentText = inputArea.value.trim();
            if (currentText) {
                // 既に何か入力されていれば、カンマやスペースなどで繋ぐか、そのままくっつけるか（ここではスペース）
                inputArea.value = currentText + " " + name;
            } else {
                inputArea.value = name;
            }
        });

        container.appendChild(chip);
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
        delBtn.innerHTML = '<span class="material-symbols-rounded">close</span> ';
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
        btn.innerHTML = theme === 'dark' ? '<span class="material-symbols-rounded">light_mode</span>' : '<span class="material-symbols-rounded">dark_mode</span>';
    }
}

// --- View切り替え（内部用） ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    window.scrollTo(0, 0);
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
                e.preventDefault(); // 画面自体のスクロールを防ぐ
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
        if (e.target === qrModal) {
            stopScanner();
        }
    });
}