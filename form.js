// --- フォーム入力制御と状態管理 ---

function setCurrentTime(inputId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(inputId).value = `${hours}:${minutes}`;
}

// UI状態をコントロールする関数
window.markAsDone = function (taskId) {
    const badge = document.getElementById(`badge-${taskId}`);
    if (badge) { badge.innerHTML = '<span class="material-symbols-rounded">check_circle</span> 送信済'; badge.className = 'task-status badge-success'; }
};
window.markAsDriving = function (num) {
    const badge = document.getElementById(`badge-record-${num}`);
    if (badge) { badge.innerHTML = '<span class="material-symbols-rounded">play_circle</span> 運転中'; badge.className = 'task-status badge-driving'; }
    const depInputs = document.getElementById(`record-${num}-departure-inputs`);
    if (depInputs) depInputs.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
    const btnStart = document.getElementById(`btn-start-record-${num}`);
    if (btnStart) btnStart.style.display = 'none';
    const arrivalSection = document.getElementById(`record-${num}-arrival`);
    if (arrivalSection) arrivalSection.style.display = 'block';
};
window.removeDrivingState = function (num) {
    const depInputs = document.getElementById(`record-${num}-departure-inputs`);
    if (depInputs) depInputs.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
    const btnStart = document.getElementById(`btn-start-record-${num}`);
    if (btnStart) btnStart.style.display = 'block';
    const arrivalSection = document.getElementById(`record-${num}-arrival`);
    if (arrivalSection) arrivalSection.style.display = 'none';
};
window.markAsUnsent = function (taskId, defaultText = '未送信') {
    const badge = document.getElementById(`badge-${taskId}`);
    if (badge) { badge.innerHTML = defaultText; badge.className = 'task-status badge-warning'; }
};

window.resetForm = function () {
    // 1. 各種入力のクリア (ラジオボタン、日付、車両IDを除く)
    const inputs = document.querySelectorAll('input:not([type="radio"]), select, textarea');
    inputs.forEach(el => {
        if (el.id !== 'report-date' && el.id !== 'vehicle-id') {
            el.value = '';
        }
    });
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.status-msg').forEach(el => el.className = 'status-msg');

    // 2. ラジオボタンのリセット（未選択へ）
    document.querySelectorAll('input[type="radio"]').forEach(el => el.checked = false);
    const alcohol1Group = document.getElementById('pre-alcohol-val-group');
    if (alcohol1Group) alcohol1Group.style.display = 'none';

    // 3. 運転状態とバッジのリセット
    [1, 2, 3].forEach(n => {
        if (window.removeDrivingState) window.removeDrivingState(n);
        const dist = document.getElementById(`calc-distance-${n}`);
        if (dist) dist.textContent = '—';
    });

    const tasks = ['pre-check', 'post-check', 'record-1', 'record-2', 'record-3'];
    tasks.forEach(t => {
        if (window.markAsUnsent) window.markAsUnsent(t, '未送信');
    });
    if (window.markAsUnsent) window.markAsUnsent('refuel', '入力可');

    // 4. デフォルト運転者の再セット
    if (typeof appData !== 'undefined' && appData.defaultDriver) {
        ['driver-name-1', 'driver-name-2', 'driver-name-3'].forEach(id => {
            const d = document.getElementById(id);
            if (d) d.value = appData.defaultDriver;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('report-date');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    if (appData.defaultVehicle) {
        const vId = document.getElementById('vehicle-id');
        if (vId) vId.value = appData.defaultVehicle;
    }
    if (appData.defaultDriver) {
        ['driver-name-1', 'driver-name-2', 'driver-name-3'].forEach(id => {
            const dId = document.getElementById(id);
            if (dId && !dId.value) dId.value = appData.defaultDriver;
        });
    }

    document.getElementById('report-date')?.addEventListener('change', () => {
        if (window.resetForm) window.resetForm();
        if (typeof loadDayData === 'function') loadDayData();
    });
    document.getElementById('vehicle-id')?.addEventListener('change', () => {
        if (window.resetForm) window.resetForm();
        if (typeof loadDayData === 'function') loadDayData();
    });

    setTimeout(() => { if (typeof loadDayData === 'function') loadDayData(); }, 100);

    setupAlcoholToggle('pre-alcohol', 'pre-alcohol-val-group', 'pre-alcohol-val');
    setupAlcoholToggle('post-alcohol', null, null);

    setupDistanceCalc(1); setupDistanceCalc(2); setupDistanceCalc(3);

    // ★ 到着メーター入力時に、次の記録の出発メーターへ自動コピー
    const setupAutoCopy = (fromId, toId) => {
        const fromEl = document.getElementById(fromId);
        const toEl = document.getElementById(toId);
        if (fromEl && toEl) {
            fromEl.addEventListener('input', (e) => {
                // 次の出発メーターが空欄か、または前回の自動コピーから引き続いている場合のみ上書く
                if (!toEl.value || toEl.dataset.autoCopiedFrom === fromId) {
                    toEl.value = e.target.value;
                    toEl.dataset.autoCopiedFrom = fromId; // 自動コピーされた印をつける
                    toEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            // ユーザーが手動で出発メーターを書き換えた場合は、自動コピーの印を解除
            toEl.addEventListener('input', (e) => {
                if (e.isTrusted) { // ユーザーの直接操作
                    delete toEl.dataset.autoCopiedFrom;
                }
            });
        }
    };
    setupAutoCopy('end-meter-1', 'start-meter-2');
    setupAutoCopy('end-meter-2', 'start-meter-3');

    // ★ 運転者の自動引き継ぎ動作
    const setupAutoDriver = (fromId, toId) => {
        const fromEl = document.getElementById(fromId);
        const toEl = document.getElementById(toId);
        if (fromEl && toEl) {
            fromEl.addEventListener('change', (e) => {
                if (!toEl.value) {
                    toEl.value = e.target.value;
                }
            });
        }
    };
    setupAutoDriver('driver-name-1', 'driver-name-2');
    setupAutoDriver('driver-name-2', 'driver-name-3');

    setupRecordPhases(1); setupRecordPhases(2); setupRecordPhases(3);

    // 送信ボタンの処理
    const setupSubmit = (btnId, sectionId, badgeId, fields) => {
        const btn = document.getElementById(btnId);
        btn?.addEventListener('click', async () => {
            const msgEl = document.getElementById(`status-${badgeId}`);
            let ok = true;
            fields.forEach(({ id }) => {
                const el = document.getElementById(id);
                if (el && !el.value) { el.classList.add('error'); ok = false; }
                else if (el) { el.classList.remove('error'); }
            });

            if (!ok) {
                if (msgEl) { msgEl.textContent = '必須項目を入力してください'; msgEl.className = 'status-msg visible error'; }
                return;
            }

            // ▼ 送信中のUIロック（二重送信防止）
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = ' 送信中...';
                btn.style.opacity = '0.7';
            }
            if (msgEl) { msgEl.textContent = '送信中...'; msgEl.className = 'status-msg visible sending'; }

            const err = await submitSection(sectionId);

            // ▼ 送信完了後のUIロック解除
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-rounded">check_circle</span> 到着・送信'; // 元のテキスト（CSS等で上書きされるため仮）
                btn.style.opacity = '1';
            }

            if (err) {
                if (msgEl) { msgEl.textContent = err; msgEl.className = 'status-msg visible error'; }
                return;
            }

            if (msgEl) msgEl.className = 'status-msg';

            // バッジとUIの更新
            markAsDone(badgeId);
            const match = sectionId.match(/\d/);
            if (match) {
                removeDrivingState(match[0]);
            }

            switchView('view-home');
        });
    };

    setupSubmit('btn-submit-pre-check', 'preCheck', 'pre-check', [{ id: 'pre-check-time' }, { id: 'pre-checker' }]);
    setupSubmit('btn-submit-record-1', 'record1', 'record-1', [{ id: 'destination-1' }, { id: 'end-time-1' }, { id: 'end-meter-1' }]);
    setupSubmit('btn-submit-record-2', 'record2', 'record-2', [{ id: 'destination-2' }, { id: 'end-time-2' }, { id: 'end-meter-2' }]);
    setupSubmit('btn-submit-record-3', 'record3', 'record-3', [{ id: 'destination-3' }, { id: 'end-time-3' }, { id: 'end-meter-3' }]);
    setupSubmit('btn-submit-post-check', 'postCheck', 'post-check', [{ id: 'post-check-time' }, { id: 'post-checker' }]);
    setupSubmit('btn-submit-refuel', 'refuel', 'refuel', []);
});

function setupAlcoholToggle(radioName, groupId, inputId) {
    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    const group = groupId ? document.getElementById(groupId) : null;
    const input = inputId ? document.getElementById(inputId) : null;
    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (group) {
                if (e.target.value === '有') { group.style.display = 'flex'; }
                else { group.style.display = 'none'; if (input) input.value = ''; }
            }
        });
    });
}

window.calcDistance = function (startId, endId, displayId) {
    const startInput = document.getElementById(startId);
    const endInput = document.getElementById(endId);
    const displaySpan = document.getElementById(displayId);
    if (!startInput || !endInput || !displaySpan) return;

    const start = parseFloat(startInput.value);
    const end = parseFloat(endInput.value);
    if (!isNaN(start) && !isNaN(end) && end >= start) { displaySpan.textContent = (end - start).toFixed(1); }
    else { displaySpan.textContent = "—"; }
};

function setupDistanceCalc(recordNum) {
    const startInput = document.getElementById(`start-meter-${recordNum}`);
    const endInput = document.getElementById(`end-meter-${recordNum}`);
    const calc = () => window.calcDistance(`start-meter-${recordNum}`, `end-meter-${recordNum}`, `calc-distance-${recordNum}`);

    if (startInput) startInput.addEventListener('input', calc);
    if (endInput) endInput.addEventListener('input', calc);
}

function setupRecordPhases(recordNum) {
    const btnStart = document.getElementById(`btn-start-record-${recordNum}`);
    const btnCancel = document.getElementById(`btn-cancel-record-${recordNum}`);

    if (btnStart) {
        btnStart.addEventListener('click', async () => {
            const driverEl = document.getElementById(`driver-name-${recordNum}`);
            const sTimeEl = document.getElementById(`start-time-${recordNum}`);
            const sMeterEl = document.getElementById(`start-meter-${recordNum}`);
            const msgEl = document.getElementById(`status-record-${recordNum}`);

            // すでに運転中の場合は解除確認
            if (btnStart.getAttribute('data-active') === "true") {
                const ok = await window.showCustomConfirm('出発状態を取り消し、入力内容を解除しますか？');
                if (ok) {
                    // ▼ 出発取消：入力をクリアしてGASへ空データを同期送信
                    driverEl.value = '';
                    sTimeEl.value = '';
                    sMeterEl.value = '';
                    if (msgEl) { msgEl.textContent = '取消を同期中...'; msgEl.className = 'status-msg visible sending'; }

                    btnStart.disabled = true;
                    btnStart.style.opacity = '0.5';

                    const err = await submitSection(`record${recordNum}`);

                    btnStart.disabled = false;
                    btnStart.style.opacity = '1';

                    if (err) {
                        if (msgEl) { msgEl.textContent = '同期エラー: ' + err; msgEl.className = 'status-msg visible error'; }
                    } else {
                        removeDrivingState(recordNum);
                        if (msgEl) msgEl.className = 'status-msg'; // エラー消去
                    }
                }
                return;
            }

            // 未入力チェックと赤枠表示
            let ok = true;
            [driverEl, sTimeEl, sMeterEl].forEach(el => {
                if (el && !el.value) { el.classList.add('error'); ok = false; }
                else if (el) { el.classList.remove('error'); }
            });

            if (!ok) {
                if (msgEl) { msgEl.textContent = '必須項目を入力してください'; msgEl.className = 'status-msg visible error'; }
                return;
            }

            // ▼ 出発：GASへ部分データを同期送信
            if (msgEl) { msgEl.textContent = '出発状態を同期中...'; msgEl.className = 'status-msg visible sending'; }

            // 二重送信・操作防止
            btnStart.disabled = true;
            btnStart.innerHTML = ' 同期中...';
            btnStart.style.opacity = '0.7';

            const err = await submitSection(`record${recordNum}`);

            btnStart.disabled = false;
            btnStart.innerHTML = '出発';
            btnStart.style.opacity = '1';

            if (err) {
                if (msgEl) { msgEl.textContent = '同期に失敗しました: ' + err; msgEl.className = 'status-msg visible error'; }
                return;
            }

            if (msgEl) msgEl.className = 'status-msg'; // 成功時エラー消去
            markAsDriving(recordNum);
            switchView('view-home'); // 出発したらホームに戻る
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', async () => {
            const ok = await window.showCustomConfirm('出発状態を取り消し、入力内容を解除しますか？');
            if (ok) {
                const msgEl = document.getElementById(`status-record-${recordNum}`);
                if (msgEl) { msgEl.textContent = '取消を同期中...'; msgEl.className = 'status-msg visible sending'; }

                // 全項目クリア（出発項目含む）
                document.getElementById(`driver-name-${recordNum}`).value = '';
                document.getElementById(`start-time-${recordNum}`).value = '';
                document.getElementById(`start-meter-${recordNum}`).value = '';
                document.getElementById(`destination-${recordNum}`).value = '';
                document.getElementById(`end-time-${recordNum}`).value = '';
                document.getElementById(`end-meter-${recordNum}`).value = '';
                document.getElementById(`vehicle-return-${recordNum}`).value = '';
                document.getElementById(`start-meter-${recordNum}`).dispatchEvent(new Event('input'));

                btnCancel.disabled = true;
                btnCancel.style.opacity = '0.5';

                // 出発・到着ともに空の状態でGASへ同期送信
                const err = await submitSection(`record${recordNum}`);

                btnCancel.disabled = false;
                btnCancel.style.opacity = '1';

                if (err) {
                    if (msgEl) { msgEl.textContent = '同期エラー: ' + err; msgEl.className = 'status-msg visible error'; }
                } else {
                    if (msgEl) msgEl.className = 'status-msg';
                    removeDrivingState(recordNum);
                    markAsUnsent(`record-${recordNum}`);
                }
            }
        });
    }
}

window.collectData = function () {
    const g = id => document.getElementById(id)?.value ?? '';
    const r = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

    let passcode = '';
    try { const settings = JSON.parse(localStorage.getItem('app-settings') || '{}'); passcode = settings.passcode || ''; } catch (e) { }

    const calcDist = (start, end) => {
        const s = parseFloat(start), e = parseFloat(end);
        return (!isNaN(s) && !isNaN(e) && e >= s) ? String((e - s).toFixed(1)) : '0';
    };

    const d1 = calcDist(g('start-meter-1'), g('end-meter-1'));
    const d2 = (g('start-meter-2') !== '') ? calcDist(g('start-meter-2'), g('end-meter-2')) : '0';
    const d3 = (g('start-meter-3') !== '') ? calcDist(g('start-meter-3'), g('end-meter-3')) : '0';
    const total = (parseFloat(d1) || 0) + (parseFloat(d2) || 0) + (parseFloat(d3) || 0);

    return {
        date: g('report-date'), vehicleId: g('vehicle-id'), passcode: passcode,
        preCheckTime: g('pre-check-time'), preCheckMethod: r('pre-check-method'), preChecker: g('pre-checker'), preAlcohol: r('pre-alcohol'), preAlcoholVal: g('pre-alcohol-val'),
        driver1: g('driver-name-1'), destination1: g('destination-1'), startTime1: g('start-time-1'), endTime1: g('end-time-1'), startMeter1: g('start-meter-1'), endMeter1: g('end-meter-1'), distance1: d1, preInspection1: r('pre-inspection-1'), vehicleReturn1: g('vehicle-return-1'),
        driver2: g('driver-name-2'), destination2: g('destination-2'), startTime2: g('start-time-2'), endTime2: g('end-time-2'), startMeter2: g('start-meter-2'), endMeter2: g('end-meter-2'), distance2: d2, preInspection2: r('pre-inspection-2'), vehicleReturn2: g('vehicle-return-2'),
        driver3: g('driver-name-3'), destination3: g('destination-3'), startTime3: g('start-time-3'), endTime3: g('end-time-3'), startMeter3: g('start-meter-3'), endMeter3: g('end-meter-3'), distance3: d3, preInspection3: r('pre-inspection-3'), vehicleReturn3: g('vehicle-return-3'),
        postCheckTime: g('post-check-time'), postCheckMethod: r('post-check-method'), postChecker: g('post-checker'), postAlcohol: r('post-alcohol'),
        refuelAmount: g('refuel-amount'), refuelMeter: g('refuel-meter'), notes: g('notes'),
        totalDistance: String(total.toFixed(1)), isOver400km: total > 400,
    };
};