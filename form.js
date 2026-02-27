// --- フォーム入力制御と状態管理 ---

function setCurrentTime(inputId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(inputId).value = `${hours}:${minutes}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('report-date');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    setupAlcoholToggle('pre-alcohol', 'pre-alcohol-val-group', 'pre-alcohol-val');
    setupAlcoholToggle('post-alcohol', null, null);

    setupDistanceCalc(1);
    setupDistanceCalc(2);
    setupDistanceCalc(3);

    document.getElementById('btn-copy-meter-2')?.addEventListener('click', () => copyArrivalMeter(1, 2));
    document.getElementById('btn-copy-meter-3')?.addEventListener('click', () => copyArrivalMeter(2, 3));

    setupRecordPhases(1);
    setupRecordPhases(2);
    setupRecordPhases(3);

    // 送信ボタンの処理
    const setupSubmit = (btnId, sectionId, badgeId, fields) => {
        document.getElementById(btnId)?.addEventListener('click', async () => {
            const statusId = `status-${sectionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            const msgEl = document.getElementById(statusId);

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

            if (msgEl) { msgEl.textContent = '送信中...'; msgEl.className = 'status-msg visible sending'; }

            const err = await submitSection(sectionId);
            if (err) {
                if (msgEl) { msgEl.textContent = err; msgEl.className = 'status-msg visible error'; }
                return;
            }

            if (msgEl) msgEl.className = 'status-msg';

            const badge = document.getElementById(`badge-${badgeId}`);
            if (badge) { badge.innerHTML = '✔ 送信済'; badge.className = 'task-status badge-success'; }

            const match = sectionId.match(/\d/);
            if (match) {
                const num = match[0];
                document.getElementById(`record-${num}-departure-inputs`)?.querySelectorAll('input, select').forEach(el => el.disabled = false);
                const arrivalSection = document.getElementById(`record-${num}-arrival`);
                if (arrivalSection) arrivalSection.style.display = 'none';
                const btnStart = document.getElementById(`btn-start-record-${num}`);
                if (btnStart) btnStart.style.display = 'block';
            }

            switchView('view-home');
        });
    };

    setupSubmit('btn-submit-pre-check', 'preCheck', 'pre-check', [{ id: 'pre-check-time' }, { id: 'pre-checker' }]);
    setupSubmit('btn-submit-record-1', 'record1', 'record-1', [{ id: 'destination-1' }, { id: 'end-time-1' }, { id: 'end-meter-1' }]);
    setupSubmit('btn-submit-record-2', 'record2', 'record-2', [{ id: 'destination-2' }, { id: 'end-time-2' }, { id: 'end-meter-2' }]);
    setupSubmit('btn-submit-record-3', 'record3', 'record-3', [{ id: 'destination-3' }, { id: 'end-time-3' }, { id: 'end-meter-3' }]);
    setupSubmit('btn-submit-post-check', 'postCheck', 'post-check', [{ id: 'post-check-time' }, { id: 'post-checker' }]);
    setupSubmit('btn-submit-refuel', 'refuel', 'refuel', []); // 必須項目はなしで送信可能
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

function setupDistanceCalc(recordNum) {
    const startInput = document.getElementById(`start-meter-${recordNum}`);
    const endInput = document.getElementById(`end-meter-${recordNum}`);
    const displaySpan = document.getElementById(`calc-distance-${recordNum}`);
    const calc = () => {
        const start = parseFloat(startInput.value);
        const end = parseFloat(endInput.value);
        if (!isNaN(start) && !isNaN(end) && end >= start) { displaySpan.textContent = (end - start).toFixed(1); }
        else { displaySpan.textContent = "—"; }
    };
    if (startInput) startInput.addEventListener('input', calc);
    if (endInput) endInput.addEventListener('input', calc);
}

function copyArrivalMeter(fromNum, toNum) {
    const fromVal = document.getElementById(`end-meter-${fromNum}`).value;
    if (fromVal) {
        document.getElementById(`start-meter-${toNum}`).value = fromVal;
        document.getElementById(`start-meter-${toNum}`).dispatchEvent(new Event('input'));
    } else {
        alert(`記録${fromNum}の到着メーターが入力されていません。`);
    }
}

function setupRecordPhases(recordNum) {
    const btnStart = document.getElementById(`btn-start-record-${recordNum}`);
    const departureInputs = document.getElementById(`record-${recordNum}-departure-inputs`);
    const arrivalSection = document.getElementById(`record-${recordNum}-arrival`);
    const btnCancel = document.getElementById(`btn-cancel-record-${recordNum}`);
    const badge = document.getElementById(`badge-record-${recordNum}`);

    if (!btnStart || !arrivalSection) return;

    btnStart.addEventListener('click', () => {
        const driver = document.getElementById(`driver-name-${recordNum}`).value;
        const sTime = document.getElementById(`start-time-${recordNum}`).value;
        const sMeter = document.getElementById(`start-meter-${recordNum}`).value;

        if (!driver || !sTime || !sMeter) { alert('運転者、出発時刻、出発メーターを入力してください。'); return; }

        departureInputs.querySelectorAll('input, select').forEach(el => el.disabled = true);
        btnStart.style.display = 'none';
        arrivalSection.style.display = 'block';

        if (badge && !badge.innerHTML.includes('送信済')) {
            badge.innerHTML = '▶ 運転中'; badge.className = 'task-status badge-driving';
        }
    });

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (confirm('出発状態を取り消し、入力内容を解除しますか？')) {
                departureInputs.querySelectorAll('input, select').forEach(el => el.disabled = false);
                btnStart.style.display = 'block';
                arrivalSection.style.display = 'none';
                document.getElementById(`destination-${recordNum}`).value = '';
                document.getElementById(`end-time-${recordNum}`).value = '';
                document.getElementById(`end-meter-${recordNum}`).value = '';
                document.getElementById(`vehicle-return-${recordNum}`).value = '';
                document.getElementById(`start-meter-${recordNum}`).dispatchEvent(new Event('input'));

                if (badge && !badge.innerHTML.includes('送信済')) {
                    badge.innerHTML = '未送信'; badge.className = 'task-status badge-warning';
                }
            }
        });
    }
}

// GASへ送るために画面のすべての入力値をかき集める関数
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