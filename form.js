/**
 * form.js - フォームロジック・バリデーション・距離計算・送信状態管理
 */

// ---- 送信済みフラグ ----
const submitted = {
    preCheck: false,
    record1: false,
    record2: false,
    record3: false,
    postCheck: false,
};

// ---- 距離計算 ----
function calcDistance(startId, endId, displayId) {
    const start = parseFloat(document.getElementById(startId)?.value);
    const end = parseFloat(document.getElementById(endId)?.value);
    const el = document.getElementById(displayId);
    if (!el) return;
    if (!isNaN(start) && !isNaN(end) && end >= start) {
        el.textContent = (end - start).toFixed(1);
    } else {
        el.textContent = '—';
    }
}

// ---- バリデーション ----
function validate(fields) {
    let ok = true;
    fields.forEach(({ id, label }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const empty = !el.value;
        el.classList.toggle('error', empty);
        if (empty) ok = false;
    });
    return ok;
}

// ---- セクションをロック（送信済み） ----
function lockSection(cardId, badgeId) {
    const card = document.getElementById(cardId);
    const badge = document.getElementById(badgeId);
    if (card) card.classList.add('is-done');
    if (badge) { badge.textContent = '送信済み'; badge.className = 'section-badge done'; }
}

// ---- ステータスメッセージ ----
function showStatus(id, type, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `status-msg visible ${type}`;
}

function clearStatus(id) {
    const el = document.getElementById(id);
    if (el) el.className = 'status-msg';
}

// ---- 送信ボタン・イベント ----
document.addEventListener('DOMContentLoaded', () => {

    // メーター → 距離計算
    ['1', '2', '3'].forEach(n => {
        ['start-meter-', 'end-meter-'].forEach(prefix => {
            const el = document.getElementById(prefix + n);
            if (el) el.addEventListener('input', () => calcDistance(`start-meter-${n}`, `end-meter-${n}`, `calc-distance-${n}`));
        });
    });

    // リアルタイム矛盾チェック（時刻）
    ['1', '2', '3'].forEach(n => {
        ['start-time-', 'end-time-'].forEach(prefix => {
            const el = document.getElementById(prefix + n);
            if (el) el.addEventListener('change', () => checkTimeConflict(n));
        });
    });

    // ---- 乗車前チェック送信 ----
    document.getElementById('btn-submit-pre-check').addEventListener('click', async () => {
        const ok = validate([
            { id: 'pre-check-time', label: '確認時刻' },
            { id: 'pre-checker', label: '確認者' },
        ]);
        if (!ok) { showStatus('status-pre-check', 'error', '必須項目を入力してください'); return; }

        showStatus('status-pre-check', 'sending', '送信中...');
        const err = await submitSection('preCheck');
        if (err) { showStatus('status-pre-check', 'error', err); return; }
        submitted.preCheck = true;
        lockSection('card-pre-check', 'badge-pre-check');
        clearStatus('status-pre-check');
    });

    // ---- 記録1送信 ----
    document.getElementById('btn-submit-record-1').addEventListener('click', async () => {
        const ok = validate([
            { id: 'driver-name-1', label: '運転者' },
            { id: 'start-time-1', label: '出発時刻' },
            { id: 'end-time-1', label: '到着時刻' },
            { id: 'start-meter-1', label: '出発メーター' },
            { id: 'end-meter-1', label: '到着メーター' },
        ]);
        if (!ok) { showStatus('status-record-1', 'error', '必須項目を入力してください'); return; }

        showStatus('status-record-1', 'sending', '送信中...');
        const err = await submitSection('record1');
        if (err) { showStatus('status-record-1', 'error', err); return; }
        submitted.record1 = true;
        lockSection('card-record-1', 'badge-record-1');
        clearStatus('status-record-1');
    });

    // ---- 記録2送信 ----
    document.getElementById('btn-submit-record-2').addEventListener('click', async () => {
        const ok = validate([
            { id: 'driver-name-2', label: '運転者' },
            { id: 'start-time-2', label: '出発時刻' },
            { id: 'end-time-2', label: '到着時刻' },
            { id: 'start-meter-2', label: '出発メーター' },
            { id: 'end-meter-2', label: '到着メーター' },
        ]);
        if (!ok) { showStatus('status-record-2', 'error', '必須項目を入力してください'); return; }

        showStatus('status-record-2', 'sending', '送信中...');
        const err = await submitSection('record2');
        if (err) { showStatus('status-record-2', 'error', err); return; }
        submitted.record2 = true;
        lockSection('card-record-2', 'badge-record-2');
        clearStatus('status-record-2');
    });

    // ---- 記録3送信 ----
    document.getElementById('btn-submit-record-3').addEventListener('click', async () => {
        const ok = validate([
            { id: 'driver-name-3', label: '運転者' },
            { id: 'start-time-3', label: '出発時刻' },
            { id: 'end-time-3', label: '到着時刻' },
            { id: 'start-meter-3', label: '出発メーター' },
            { id: 'end-meter-3', label: '到着メーター' },
        ]);
        if (!ok) { showStatus('status-record-3', 'error', '必須項目を入力してください'); return; }

        showStatus('status-record-3', 'sending', '送信中...');
        const err = await submitSection('record3');
        if (err) { showStatus('status-record-3', 'error', err); return; }
        submitted.record3 = true;
        lockSection('card-record-3', 'badge-record-3');
        clearStatus('status-record-3');
    });

    // ---- 乗車後チェック送信 ----
    document.getElementById('btn-submit-post-check').addEventListener('click', async () => {
        const ok = validate([
            { id: 'post-check-time', label: '確認時刻' },
            { id: 'post-checker', label: '確認者' },
        ]);
        if (!ok) { showStatus('status-post-check', 'error', '必須項目を入力してください'); return; }

        showStatus('status-post-check', 'sending', '送信中...');
        const err = await submitSection('postCheck');
        if (err) { showStatus('status-post-check', 'error', err); return; }
        submitted.postCheck = true;
        lockSection('card-post-check', 'badge-post-check');
        clearStatus('status-post-check');
    });
});

// ---- 時刻矛盾チェック（リアルタイム） ----
function checkTimeConflict(n) {
    const st = document.getElementById(`start-time-${n}`)?.value;
    const et = document.getElementById(`end-time-${n}`)?.value;
    const endEl = document.getElementById(`end-time-${n}`);
    if (!st || !et || !endEl) return;
    endEl.classList.toggle('error', et < st);
}

// ---- フォームデータ収集 ----
function collectData() {
    const g = id => document.getElementById(id)?.value ?? '';
    const r = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

    const isRecord2Visible = document.getElementById('card-record-2')?.style.display !== 'none';
    const isRecord3Visible = document.getElementById('card-record-3')?.style.display !== 'none';

    const calcDist = (start, end) => {
        const s = parseFloat(start), e = parseFloat(end);
        return (!isNaN(s) && !isNaN(e) && e >= s) ? String((e - s).toFixed(1)) : '0';
    };

    const sm1 = g('start-meter-1'), em1 = g('end-meter-1');
    const sm2 = g('start-meter-2'), em2 = g('end-meter-2');
    const sm3 = g('start-meter-3'), em3 = g('end-meter-3');

    const d1 = calcDist(sm1, em1);
    const d2 = isRecord2Visible ? calcDist(sm2, em2) : '0';
    const d3 = isRecord3Visible ? calcDist(sm3, em3) : '0';
    const total = (parseFloat(d1) || 0) + (parseFloat(d2) || 0) + (parseFloat(d3) || 0);

    return {
        date: g('report-date'),
        vehicleId: g('vehicle-id'),
        passcode: localStorage.getItem(KEY_PASSCODE) || '',

        preCheckTime: g('pre-check-time'),
        preCheckMethod: r('pre-check-method'),
        preChecker: g('pre-checker'),
        preAlcohol: r('pre-alcohol'),
        preAlcoholVal: g('pre-alcohol-val'),

        driver1: g('driver-name-1'),
        destination1: g('destination-1'),
        startTime1: g('start-time-1'),
        endTime1: g('end-time-1'),
        startMeter1: sm1,
        endMeter1: em1,
        distance1: d1,
        preInspection1: r('pre-inspection-1'),
        vehicleReturn1: g('vehicle-return-1'),

        driver2: isRecord2Visible ? g('driver-name-2') : '',
        destination2: isRecord2Visible ? g('destination-2') : '',
        startTime2: isRecord2Visible ? g('start-time-2') : '',
        endTime2: isRecord2Visible ? g('end-time-2') : '',
        startMeter2: isRecord2Visible ? sm2 : '',
        endMeter2: isRecord2Visible ? em2 : '',
        distance2: d2,
        preInspection2: isRecord2Visible ? r('pre-inspection-2') : '',
        vehicleReturn2: isRecord2Visible ? g('vehicle-return-2') : '',

        driver3: isRecord3Visible ? g('driver-name-3') : '',
        destination3: isRecord3Visible ? g('destination-3') : '',
        startTime3: isRecord3Visible ? g('start-time-3') : '',
        endTime3: isRecord3Visible ? g('end-time-3') : '',
        startMeter3: isRecord3Visible ? sm3 : '',
        endMeter3: isRecord3Visible ? em3 : '',
        distance3: d3,
        preInspection3: isRecord3Visible ? r('pre-inspection-3') : '',
        vehicleReturn3: isRecord3Visible ? g('vehicle-return-3') : '',

        postCheckTime: g('post-check-time'),
        postCheckMethod: r('post-check-method'),
        postChecker: g('post-checker'),
        postAlcohol: r('post-alcohol'),

        refuelAmount: g('refuel-amount'),
        refuelMeter: g('refuel-meter'),
        notes: g('notes'),

        totalDistance: String(total.toFixed(1)),
        isOver400km: total > 400,
    };
}
