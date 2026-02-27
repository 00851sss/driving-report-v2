/**
 * gas.js - GAS通信（起動時データ読込・セクション別送信）
 */

// ---- 起動時: 当日データをGASから読み込む ----
async function loadDayData() {
    const url = localStorage.getItem(KEY_GAS_URL) || '';
    const pass = localStorage.getItem(KEY_PASSCODE) || '';
    const date = document.getElementById('report-date')?.value;
    const vid = document.getElementById('vehicle-id')?.value;

    if (!url || !pass || !date || !vid) return;

    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'read', date, vehicleId: vid, passcode: pass }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.status !== 'success' || !result.values) return;

        applyDayData(result.values);
    } catch (e) {
        console.warn('[gas.js] loadDayData failed:', e.message);
        // エラーは通知しない（任意読込なので失敗してもOK）
    }
}

/**
 * GASから返された3行分のデータをフォームに反映
 * values: [[row1...], [row2...], [row3...]] (列0=A)
 * C列=index2 が基準
 */
function applyDayData(values) {
    const v = (row, col) => {
        if (!values[row] || values[row][col] === undefined) return '';
        return String(values[row][col]);
    };

    const fmtTime = val => {
        if (!val) return '';
        const m = String(val).match(/T(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : String(val);
    };

    // Row0 (記録1 + 乗車前チェック)
    setIfEmpty('pre-check-time', fmtTime(v(0, 6)));
    setIfEmpty('pre-checker', v(0, 11));
    setIfEmpty('driver-name-1', v(0, 2));
    setIfEmpty('destination-1', v(0, 3));
    setIfEmpty('start-time-1', fmtTime(v(0, 16)));
    setIfEmpty('end-time-1', fmtTime(v(0, 17)));
    setIfEmpty('start-meter-1', v(0, 18));
    setIfEmpty('end-meter-1', v(0, 19));

    // 出発メーター: 前回到着メーターとして引継ぎ（同日データがない場合）
    // 前回メーターは end-meter-1 の値があれば start-meter-1 に引継ぎ
    const prevEndMeter = v(0, 19);
    if (prevEndMeter) {
        const sm1 = document.getElementById('start-meter-1');
        if (sm1 && !sm1.value) sm1.value = prevEndMeter;
    }

    // Row1 (記録2 + 乗車後チェック)
    setIfEmpty('post-check-time', fmtTime(v(1, 6)));
    setIfEmpty('post-checker', v(1, 11));
    setIfEmpty('driver-name-2', v(1, 2));
    setIfEmpty('destination-2', v(1, 3));
    setIfEmpty('start-time-2', fmtTime(v(1, 16)));
    setIfEmpty('end-time-2', fmtTime(v(1, 17)));
    setIfEmpty('start-meter-2', v(1, 18));
    setIfEmpty('end-meter-2', v(1, 19));

    // Row2 (記録3)
    setIfEmpty('driver-name-3', v(2, 2));
    setIfEmpty('destination-3', v(2, 3));
    setIfEmpty('start-time-3', fmtTime(v(2, 16)));
    setIfEmpty('end-time-3', fmtTime(v(2, 17)));
    setIfEmpty('start-meter-3', v(2, 18));
    setIfEmpty('end-meter-3', v(2, 19));

    // 距離再計算
    ['1', '2', '3'].forEach(n => calcDistance(`start-meter-${n}`, `end-meter-${n}`, `calc-distance-${n}`));
}

function setIfEmpty(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el && !el.value) el.value = val;
}

// ---- セクション別送信 ----
async function submitSection(section) {
    const url = localStorage.getItem(KEY_GAS_URL) || '';
    const pass = localStorage.getItem(KEY_PASSCODE) || '';

    if (!url) return 'GAS URLが設定されていません';
    if (!pass) return 'パスコードが設定されていません';
    if (!url.startsWith('https://')) return 'URLはhttps://で始まる必要があります';

    const date = document.getElementById('report-date')?.value;
    const vid = document.getElementById('vehicle-id')?.value;
    if (!date) return '日付を選択してください';
    if (!vid) return '車両を選択してください';

    const data = collectData();

    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        if (result.status === 'success') return null; // 成功
        return result.message || 'GASでエラーが発生しました';
    } catch (e) {
        return `通信エラー: ${e.message}`;
    }
}
