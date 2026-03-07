/**
 * gas.js - GAS通信（起動時データ読込・セクション別送信）
 */

/**
 * 起動時または手動同期ボタンクリック時: 当日データをGASから読み込む
 * @param {boolean} isManual 手動ボタンからの呼び出し時にバリデーションを表示するかどうか
 */
async function loadDayData(isManual = false) {
    const url = appData.gasUrl;
    const pass = appData.passcode;
    const date = document.getElementById('report-date')?.value;
    const vid = document.getElementById('vehicle-id')?.value;

    // 手動実行時のバリデーション
    if (isManual) {
        if (!url || !pass) {
            window.showCustomAlert('設定画面でGAS URLとパスワードを入力してください。');
            return;
        }
        if (!vid) {
            window.showCustomAlert('車両を選択してください。');
            return;
        }

        // 車両マスタに存在するかチェック
        const exists = appData.vehicles && appData.vehicles.some(v => (v.plate || v) === vid);
        if (!exists) {
            const ok = await window.showCustomConfirm(`車両「${vid}」はマスタに登録されていません。\nこのままデータを読み込みますか？`);
            if (!ok) return;
        }
    }

    // 自動実行時 (isManual=false) の最低限のチェック
    if (!url || !pass || !date || !vid) return;

    if (window.showLoading) window.showLoading('データ読込中...');

    try {
        if (typeof updateSyncStatus === 'function') updateSyncStatus('syncing');
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
        if (isManual) {
            window.showCustomAlert(`データの読み込みに失敗しました:\n${e.message}`);
        }
    } finally {
        if (typeof updateSyncStatus === 'function') updateSyncStatus();
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
        // "1899-12-30T12:05:00.000Z" のようなISO形式、または "21:05" のような文字列の両方に対応する正規表現
        const m = String(val).match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2})?(?:Z|\.\d+Z)?$/) || String(val).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
        if (m) {
            let hh = parseInt(m[1], 10);
            const mm = m[2];
            // もしUTCのZがついていて、日本時間とずれている場合（1899-12-30T12:05:00.000Z はJSTで 21:05）
            if (String(val).endsWith('Z') && val.includes('1899-12-30T')) {
                hh = (hh + 9) % 24;
            }
            return `${String(hh).padStart(2, '0')}:${mm}`;
        }

        // スプレッドシートに直接「930」や「1700」と入力されたケースへの対応
        const digitMatch = String(val).match(/^(\d{1,2})(\d{2})$/);
        if (digitMatch) {
            return `${String(digitMatch[1]).padStart(2, '0')}:${digitMatch[2]}`;
        }

        return String(val);
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
    setVal('pre-alcohol-val', v(2, 12)); // 3行目 M列
    if ((v(0, 6) || v(2, 12)) && window.markAsDone) window.markAsDone('pre-check');

    setVal('driver-name-1', v(0, 2));
    setVal('destination-1', v(0, 3));
    setVal('start-time-1', fmtTime(v(0, 16)));
    setVal('end-time-1', fmtTime(v(0, 17)));
    setVal('start-meter-1', v(0, 18));
    setVal('end-meter-1', v(0, 19));

    // 出発メーター: 前回到着メーターとして引継ぎ
    const prevEndMeter = (lastEndMeter !== undefined && lastEndMeter !== null) ? String(lastEndMeter) : "";
    if (prevEndMeter !== "" && !v(0, 18)) {
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
    setVal('post-alcohol-val', v(2, 14)); // 3行目 O列
    if ((v(1, 6) || v(2, 14)) && window.markAsDone) window.markAsDone('post-check');

    // 記録1の運転者と到着メーターを、記録2の初期値として自動セット
    const autoDriver2 = v(0, 2);
    // 記録2の出発メーターは、記録1の到着メーターを優先。無ければ現在DOMにある記録1の値を採用。
    const autoMeter2 = v(0, 19) || document.getElementById('end-meter-1')?.value;

    setVal('driver-name-2', v(1, 2) || (autoMeter2 ? autoDriver2 : ''));
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
    const autoMeter3 = v(1, 19) || document.getElementById('end-meter-2')?.value;

    setVal('driver-name-3', v(2, 2) || (autoMeter3 ? autoDriver3 : ''));
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
        if (typeof updateSyncStatus === 'function') updateSyncStatus('syncing');
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
        if (typeof updateSyncStatus === 'function') updateSyncStatus();
        if (window.hideLoading) window.hideLoading();
    }
}

/**
 * スマホ等から選択した CSV File を読み込んでマスタデータに反映する
 *
 * フォーマット（1行目ヘッダー、2行目以降データ）:
 *   車両,運転者,確認者,訪問先
 *   品川 123 あ 4567,田中太郎,鈴木一郎,本社
 *   横浜 456 い 8910,佐藤花子,,○○工場
 *
 * ※空欄はスキップ。ニックネームは設定画面から別途編集してください。
 */
function syncMasterData(file) {
    const msgEl = document.getElementById('status-sync');
    if (!file) return;

    if (msgEl) { msgEl.textContent = '読み込み中...'; msgEl.className = 'status-msg visible sending'; }
    if (window.showLoading) window.showLoading('CSVを読み込み中...');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            // BOM除去・行分割（1行目ヘッダーはスキップ）
            const lines = text.split(/\r?\n/)
                .map(l => l.replace(/^\uFEFF/, '').trim())
                .filter(l => l);
            // 1行目がヘッダーかどうか判定（1列目が "車両" や "vehicle" なら飛ばす）
            const firstCol = (lines[0] || '').split(',')[0].trim().toLowerCase();
            const startIdx = (firstCol === '車両' || firstCol === 'vehicle') ? 1 : 0;
            const dataLines = lines.slice(startIdx);

            // 現在のデータをベースにして、CSVからの新規分を追加する（既存のものは保持）
            const newVehicles = [...(appData.vehicles || [])];
            const newDrivers = [...(appData.drivers || [])];
            const newCheckers = [...(appData.checkers || [])];
            const newDestinations = [...(appData.destinations || [])];

            let addedCount = 0;

            for (const line of dataLines) {
                const parts = line.split(',');
                const vehicle = (parts[0] || '').trim();
                const driver = (parts[1] || '').trim();
                const checker = (parts[2] || '').trim();
                const destination = (parts[3] || '').trim();

                if (vehicle && !newVehicles.some(v => v.plate === vehicle)) {
                    newVehicles.push({ plate: vehicle, nickname: '', sheetUrl: '' });
                    addedCount++;
                }
                if (driver && !newDrivers.some(d => d.name === driver)) {
                    newDrivers.push({ name: driver, favorite: false });
                    addedCount++;
                }
                if (checker && !newCheckers.some(c => c.name === checker)) {
                    newCheckers.push({ name: checker, favorite: false });
                    addedCount++;
                }
                if (destination && !newDestinations.some(d => d.name === destination)) {
                    newDestinations.push({ name: destination, favorite: false });
                    addedCount++;
                }
            }

            if (addedCount === 0 && dataLines.length > 0) {
                // 追加分がゼロでも、エラーにはせず既存のデータをそのまま生かす
            }

            appData.vehicles = newVehicles;
            appData.drivers = newDrivers;
            appData.checkers = newCheckers;
            appData.destinations = newDestinations;

            persistSettings();
            ['vehicle', 'driver', 'checker', 'destination'].forEach(type => {
                renderTagList(type);
                updateSelectOptions(type);
            });
            if (typeof updateSsLinkArea === 'function') updateSsLinkArea();

            if (msgEl) { msgEl.textContent = `読み込み完了！ (${total} 件)`; msgEl.className = 'status-msg visible success'; }
            setTimeout(() => { if (msgEl) msgEl.className = 'status-msg'; }, 3000);

        } catch (err) {
            console.error('[gas.js] syncMasterData (CSV):', err);
            if (msgEl) { msgEl.textContent = `エラー: ${err.message}`; msgEl.className = 'status-msg visible error'; }
        } finally {
            if (window.hideLoading) window.hideLoading();
        }
    };
    reader.onerror = () => {
        if (msgEl) { msgEl.textContent = 'ファイルの読み込みに失敗しました'; msgEl.className = 'status-msg visible error'; }
        if (window.hideLoading) window.hideLoading();
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * 見本 CSV をダウンロードさせる
 */
function downloadSampleCsv() {
    const content = [
        '車両,運転者,確認者,訪問先',
        '品川 123 あ 4567,田中太郎,鈴木一郎,本社',
        '横浜 456 い 8910,佐藤花子,,○○工場',
        ',,山田確認者,△△工場',
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master.csv';
    a.click();
    URL.revokeObjectURL(url);
}