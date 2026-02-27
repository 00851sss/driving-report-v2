// ---- 現在時刻をセットする関数 ----
window.setCurrentTime = function (targetId) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const el = document.getElementById(targetId);
    if (el) el.value = `${hh}:${mm}`;
};

// ---- 距離計算 ----
function calcDistance(startId, endId, displayId) {
    const s = parseFloat(document.getElementById(startId)?.value);
    const e = parseFloat(document.getElementById(endId)?.value);
    const el = document.getElementById(displayId);
    if (!el) return;
    el.textContent = (!isNaN(s) && !isNaN(e) && e >= s) ? (e - s).toFixed(1) : '—';
}

// ---- バリデーション ----
function validate(fields) {
    let ok = true;
    fields.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const empty = !el.value;
        el.classList.toggle('error', empty);
        if (empty) ok = false;
    });
    return ok;
}

// ---- ステータス・バッジ ----
function showStatus(id, type, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.className = `status-msg visible ${type}`;
}
function markAsDone(taskId) {
    const badge = document.getElementById(`badge-${taskId}`);
    if (badge) { badge.innerHTML = '✅ 送信済'; badge.className = 'task-status badge-success'; }
}

// ---- イベント設定 ----
document.addEventListener('DOMContentLoaded', () => {
    // メーター計算
    ['1', '2', '3'].forEach(n => {
        ['start-meter-', 'end-meter-'].forEach(prefix => {
            document.getElementById(prefix + n)?.addEventListener('input', () => calcDistance(`start-meter-${n}`, `end-meter-${n}`, `calc-distance-${n}`));
        });
    });

    // 共通送信処理（到着・チェック用）
    const setupSubmit = (btnId, taskName, sectionId, badgeId, fields) => {
        document.getElementById(btnId)?.addEventListener('click', async () => {
            const statusId = `status-${sectionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            if (!validate(fields)) { showStatus(statusId, 'error', '必須項目を入力してください'); return; }

            showStatus(statusId, 'sending', '送信中...');
            const err = await submitSection(sectionId);
            if (err) { showStatus(statusId, 'error', err); return; }

            document.getElementById(statusId).className = 'status-msg';
            markAsDone(badgeId);

            // 記録1~3なら、送信完了後に「運転中」の目印を消す
            const numMatch = sectionId.match(/\d/);
            if (numMatch) localStorage.removeItem(`dr_driving_${numMatch[0]}`);

            switchView('view-home');
        });
    };

    // 各セクションの送信設定（訪問先・到着時刻・到着メーターなどを必須チェック）
    setupSubmit('btn-submit-pre-check', '乗車前', 'preCheck', 'pre-check', [{ id: 'pre-check-time' }, { id: 'pre-checker' }]);
    setupSubmit('btn-submit-record-1', '記録1', 'record1', 'record-1', [{ id: 'destination-1' }, { id: 'end-time-1' }, { id: 'end-meter-1' }]);
    setupSubmit('btn-submit-record-2', '記録2', 'record2', 'record-2', [{ id: 'destination-2' }, { id: 'end-time-2' }, { id: 'end-meter-2' }]);
    setupSubmit('btn-submit-record-3', '記録3', 'record3', 'record-3', [{ id: 'destination-3' }, { id: 'end-time-3' }, { id: 'end-meter-3' }]);
    setupSubmit('btn-submit-post-check', '乗車後', 'postCheck', 'post-check', [{ id: 'post-check-time' }, { id: 'post-checker' }]);

    // ---- 2ステップ（一時保存）の処理 ----
    ['1', '2', '3'].forEach(num => {
        applyDrivingState(num); // 起動時に状態復元

        // 出発ボタン
        document.getElementById(`btn-start-record-${num}`)?.addEventListener('click', () => {
            const ok = validate([{ id: `driver-name-${num}` }, { id: `start-time-${num}` }, { id: `start-meter-${num}` }]);
            if (!ok) { alert("運転者、出発時刻、出発メーターを入力してください"); return; }
            localStorage.setItem(`dr_driving_${num}`, 'true');
            applyDrivingState(num);
            switchView('view-home');
        });

        // 取消ボタン
        document.getElementById(`btn-cancel-record-${num}`)?.addEventListener('click', () => {
            if (confirm("出発を取り消して入力をやり直しますか？")) {
                localStorage.removeItem(`dr_driving_${num}`);
                removeDrivingState(num);
            }
        });
    });
});

// 画面を「運転中」にする
function applyDrivingState(num) {
    if (localStorage.getItem(`dr_driving_${num}`) !== 'true') return;
    const depInputs = document.getElementById(`record-${num}-departure-inputs`);
    if (depInputs) { depInputs.style.pointerEvents = 'none'; depInputs.style.opacity = '0.6'; }
    const startBtn = document.getElementById(`btn-start-record-${num}`);
    if (startBtn) startBtn.style.display = 'none';
    const arrivalArea = document.getElementById(`record-${num}-arrival`);
    if (arrivalArea) arrivalArea.style.display = 'block';

    const badge = document.getElementById(`badge-record-${num}`);
    if (badge && !badge.innerHTML.includes('送信済')) {
        badge.innerHTML = '🚗 運転中'; badge.className = 'task-status badge-driving';
    }
}

// 画面を「出発前」に戻す
function removeDrivingState(num) {
    const depInputs = document.getElementById(`record-${num}-departure-inputs`);
    if (depInputs) { depInputs.style.pointerEvents = 'auto'; depInputs.style.opacity = '1'; }
    const startBtn = document.getElementById(`btn-start-record-${num}`);
    if (startBtn) startBtn.style.display = 'block';
    const arrivalArea = document.getElementById(`record-${num}-arrival`);
    if (arrivalArea) arrivalArea.style.display = 'none';

    const badge = document.getElementById(`badge-record-${num}`);
    if (badge && !badge.innerHTML.includes('送信済')) {
        badge.innerHTML = '未送信'; badge.className = 'task-status badge-warning';
    }
}

// ---- データ収集処理 ----
function collectData() {
    const g = id => document.getElementById(id)?.value ?? '';
    const r = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

    const isR2 = g('start-meter-2') !== '' || g('driver-name-2') !== '';
    const isR3 = g('start-meter-3') !== '' || g('driver-name-3') !== '';
    const calcDist = (start, end) => { const s = parseFloat(start), e = parseFloat(end); return (!isNaN(s) && !isNaN(e) && e >= s) ? String((e - s).toFixed(1)) : '0'; };

    const sm1 = g('start-meter-1'), em1 = g('end-meter-1');
    const sm2 = g('start-meter-2'), em2 = g('end-meter-2');
    const sm3 = g('start-meter-3'), em3 = g('end-meter-3');
    const d1 = calcDist(sm1, em1); const d2 = isR2 ? calcDist(sm2, em2) : '0'; const d3 = isR3 ? calcDist(sm3, em3) : '0';
    const total = (parseFloat(d1) || 0) + (parseFloat(d2) || 0) + (parseFloat(d3) || 0);

    return {
        date: g('report-date'), vehicleId: g('vehicle-id'), passcode: localStorage.getItem(KEY_PASSCODE) || '',
        preCheckTime: g('pre-check-time'), preCheckMethod: r('pre-check-method'), preChecker: g('pre-checker'), preAlcohol: r('pre-alcohol'), preAlcoholVal: g('pre-alcohol-val'),

        driver1: g('driver-name-1'), destination1: g('destination-1'), startTime1: g('start-time-1'), endTime1: g('end-time-1'), startMeter1: sm1, endMeter1: em1, distance1: d1, preInspection1: r('pre-inspection-1'), vehicleReturn1: g('vehicle-return-1'),
        driver2: isR2 ? g('driver-name-2') : '', destination2: isR2 ? g('destination-2') : '', startTime2: isR2 ? g('start-time-2') : '', endTime2: isR2 ? g('end-time-2') : '', startMeter2: isR2 ? sm2 : '', endMeter2: isR2 ? em2 : '', distance2: d2, preInspection2: isR2 ? r('pre-inspection-2') : '', vehicleReturn2: isR2 ? g('vehicle-return-2') : '',
        driver3: isR3 ? g('driver-name-3') : '', destination3: isR3 ? g('destination-3') : '', startTime3: isR3 ? g('start-time-3') : '', endTime3: isR3 ? g('end-time-3') : '', startMeter3: isR3 ? sm3 : '', endMeter3: isR3 ? em3 : '', distance3: d3, preInspection3: isR3 ? r('pre-inspection-3') : '', vehicleReturn3: isR3 ? g('vehicle-return-3') : '',

        postCheckTime: g('post-check-time'), postCheckMethod: r('post-check-method'), postChecker: g('post-checker'), postAlcohol: r('post-alcohol'),
        refuelAmount: g('refuel-amount'), refuelMeter: g('refuel-meter'), notes: g('notes'),
        totalDistance: String(total.toFixed(1)), isOver400km: total > 400,
    };
}