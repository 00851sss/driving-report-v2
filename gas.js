/**
 * gas.js - GAS通信（起動時データ読込・セクション別送信）
 */

// ---- 起動時: 当日データをGASから読み込む ----
async function loadDayData() {
    const url = appData.gasUrl;
    const pass = appData.passcode;
    const date = document.getElementById('report-date')?.value;
    const vid = document.getElementById('vehicle-id')?.value;

    if (!url || !pass || !date || !vid) return;

    if (window.showLoading) window.showLoading('データ読込中...');

    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'read', date, vehicleId: vid, passcode: pass }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const result = await res.json();
        if (result.status !== 'success' || !result.values) throw new Error('データの中身がありません');

        applyDayData(result.values, result.lastEndMeter);
    } catch (e) {
        console.warn('[gas.js] loadDayData failed:', e.message);
        // エラーは通知しない（任意読込なので失敗してもOK）
    } finally {
        if (window.hideLoading) window.hideLoading();
    }
}

/**
 * GASから返された3行分のデータをフォームに反映
 * values: [[row1...], [row2...], [row3...]] (列0=A)
 * C列=index2 が基準
 */
function applyDayData(values, lastEndMeter) {
    const v = (row, col) => {
        if (!values[row] || values[row][col] === undefined) return '';
        return String(values[row][col]);
    };

    const fmtTime = val => {
        if (!val) return '';
        const m = String(val).match(/T(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : String(val);
    };

    const setVal = (id, val) => {
        if (!val) return;
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') {
                // セレクトボックスにその値が存在しない場合は、一時的に選択肢を追加する（過去の自由入力データ用）
                if (!Array.from(el.options).some(opt => opt.value === String(val))) {
                    const newOpt = document.createElement('option');
                    newOpt.value = newOpt.textContent = val;
                    el.appendChild(newOpt);
                }
            }
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    // Row0 (記録1 + 乗車前チェック)
    setVal('pre-check-time', fmtTime(v(0, 6)));
    setVal('pre-checker', v(0, 11));
    if (v(0, 6) && window.markAsDone) window.markAsDone('pre-check');

    setVal('driver-name-1', v(0, 2));
    setVal('destination-1', v(0, 3));
    setVal('start-time-1', fmtTime(v(0, 16)));
    setVal('end-time-1', fmtTime(v(0, 17)));
    setVal('start-meter-1', v(0, 18));
    setVal('end-meter-1', v(0, 19));

    // 出発メーター: 前回到着メーターとして引継ぎ
    const prevEndMeter = lastEndMeter; // 昨日の最終メーター
    if (prevEndMeter && !v(0, 18)) {
        const sm1 = document.getElementById('start-meter-1');
        if (sm1 && !sm1.value) {
            setVal('start-meter-1', prevEndMeter);
        }
    }

    if (v(0, 19) && window.markAsDone) {
        window.markAsDone('record-1');
        if (window.removeDrivingState) window.removeDrivingState('1');
    } else if (v(0, 16) && window.markAsDriving) {
        window.markAsDriving('1');
    }

    // Row1 (記録2 + 乗車後チェック)
    setVal('post-check-time', fmtTime(v(1, 6)));
    setVal('post-checker', v(1, 11));
    if (v(1, 6) && window.markAsDone) window.markAsDone('post-check');

    // 記録1の運転者と到着メーターを、記録2の初期値として自動セット
    const autoDriver2 = v(0, 2);
    const autoMeter2 = v(0, 19);

    setVal('driver-name-2', v(1, 2) || (v(0, 19) ? autoDriver2 : ''));
    setVal('destination-2', v(1, 3));
    setVal('start-time-2', fmtTime(v(1, 16)));

    // ======== メーター引き継ぎ処理 ========
    const sm2 = document.getElementById('start-meter-2');
    if (v(1, 18)) {
        setVal('start-meter-2', v(1, 18));
    } else if (autoMeter2 && sm2 && !sm2.value) {
        setVal('start-meter-2', autoMeter2);
    }

    setVal('end-meter-2', v(1, 19));

    if (v(1, 19) && window.markAsDone) {
        window.markAsDone('record-2');
        if (window.removeDrivingState) window.removeDrivingState('2');
    } else if (v(1, 16) && window.markAsDriving) {
        window.markAsDriving('2');
    }

    // Row2 (記録3)
    // 記録2の運転者と到着メーターを、記録3の初期値として自動セット
    const autoDriver3 = v(1, 2) || autoDriver2;
    const autoMeter3 = v(1, 19);

    setVal('driver-name-3', v(2, 2) || (v(1, 19) ? autoDriver3 : ''));
    setVal('destination-3', v(2, 3));
    setVal('start-time-3', fmtTime(v(2, 16)));

    // ======== メーター引き継ぎ処理 ========
    const sm3 = document.getElementById('start-meter-3');
    if (v(2, 18)) {
        setVal('start-meter-3', v(2, 18));
    } else if (autoMeter3 && sm3 && !sm3.value) {
        setVal('start-meter-3', autoMeter3);
    }

    setVal('end-meter-3', v(2, 19));

    if (v(2, 19) && window.markAsDone) {
        window.markAsDone('record-3');
        if (window.removeDrivingState) window.removeDrivingState('3');
    } else if (v(2, 16) && window.markAsDriving) {
        window.markAsDriving('3');
    }

    // 給油・特記の反映 (GASからの取得はA列〜Z列なので、W列はインデックス22、Y列は24)
    setVal('refuel-amount', v(0, 22)); // 記録1のW列
    setVal('refuel-meter', v(1, 22));  // 記録2のW列
    setVal('notes', v(0, 24));         // 記録1のY列

    if ((v(0, 22) || v(1, 22) || v(0, 24)) && window.markAsDone) {
        window.markAsDone('refuel');
    }

    // 距離再計算
    ['1', '2', '3'].forEach(n => {
        if (window.calcDistance) window.calcDistance(`start-meter-${n}`, `end-meter-${n}`, `calc-distance-${n}`);
    });
}

// ---- セクション別送信 ----
async function submitSection(section) {
    const url = appData.gasUrl;
    const pass = appData.passcode;

    if (!url) return 'GAS URLが設定されていません';
    if (!pass) return 'パスコードが設定されていません';
    if (!url.startsWith('https://')) return 'URLはhttps://で始まる必要があります';

    const date = document.getElementById('report-date')?.value;
    const vid = document.getElementById('vehicle-id')?.value;
    if (!date) return '日付を選択してください';
    if (!vid) return '車両を選択してください';

    const data = collectData();
    data.section = section; // 新しいGASの「部分更新」判定用に追加

    if (window.showLoading) window.showLoading('送信中...');

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
    } finally {
        if (window.hideLoading) window.hideLoading();
    }
}

// ---- マスタデータ同期 ----
async function syncMasterData() {
    const url = appData.gasUrl;
    const pass = appData.passcode;
    const msgEl = document.getElementById('status-sync');

    if (!url || !pass || !url.startsWith('https://')) {
        if (msgEl) { msgEl.textContent = 'GAS URLとパスコードを正しく設定してください'; msgEl.className = 'status-msg visible error'; }
        return;
    }

    if (msgEl) { msgEl.textContent = '同期中...'; msgEl.className = 'status-msg visible sending'; }
    if (window.showLoading) window.showLoading('マスタデータ同期中...');

    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'getMaster', passcode: pass }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        if (result.status !== 'success') {
            throw new Error(result.message || 'マスタデータ取得に失敗しました');
        }

        // リストを上書き（重複や空欄はGAS側で処理済み）
        appData.vehicles = (result.vehicles || []);
        appData.drivers = (result.drivers || []);
        appData.checkers = (result.checkers || []);
        appData.destinations = (result.destinations || []);

        // フロントエンドのUIに反映して保存
        saveSettings();
        ['vehicle', 'driver', 'checker', 'destination'].forEach(type => {
            renderTagList(type);
            updateSelectOptions(type);
        });

        if (msgEl) { msgEl.textContent = '同期完了！'; msgEl.className = 'status-msg visible success'; }
        setTimeout(() => { if (msgEl) msgEl.className = 'status-msg'; }, 3000);

    } catch (e) {
        console.error('[gas.js] syncMasterData:', e);
        if (msgEl) { msgEl.textContent = `エラー: ${e.message}`; msgEl.className = 'status-msg visible error'; }
    } finally {
        if (window.hideLoading) window.hideLoading();
    }
}