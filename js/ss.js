/**
 * ss.js - 車両別スプレッドシート連携 & カスタム月間日報ビューア
 * v2 - スプレッドシート完全準拠レイアウト
 */

// ======================================
// URL / リンクエリア
// ======================================
function getCurrentVehicleSheetUrl() {
    const vid = document.getElementById('vehicle-id')?.value;
    if (!vid) return null;
    const v = appData.vehicles.find(v => v.plate === vid);
    return v?.sheetUrl || null;
}
function getCurrentVehicle() {
    const vid = document.getElementById('vehicle-id')?.value;
    if (!vid) return null;
    return appData.vehicles.find(v => v.plate === vid) || null;
}

// GASから車両URLを自動取得してキャッシュする
let _fetchingUrlFor = '';
async function fetchAndCacheVehicleUrl(vid) {
    if (_fetchingUrlFor === vid) return; // 多重実行防止
    _fetchingUrlFor = vid;
    const gasUrl = appData.gasUrl, pass = appData.passcode;
    if (!gasUrl || !pass) { _fetchingUrlFor = ''; return; }
    const date = document.getElementById('report-date')?.value
        || new Date().toISOString().slice(0, 10);
    try {
        const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getVehicleUrl', passcode: pass, vehicleId: vid, date })
        });
        const result = await res.json();
        if (result.status === 'success' && result.url) {
            const v = appData.vehicles.find(v => v.plate === vid);
            if (v) { v.sheetUrl = result.url; persistSettings(); }
            updateSsLinkArea(); // URL取得後に再描画
        }
    } catch (e) { console.warn('[ss.js] fetchAndCacheVehicleUrl:', e.message); }
    finally { _fetchingUrlFor = ''; }
}

function updateSsLinkArea() {
    const area = document.getElementById('vehicle-ss-link-area');
    const btnOpen = document.getElementById('btn-open-ss');
    const btnView = document.getElementById('btn-view-ss');
    if (!area) return;
    area.style.display = 'block';
    const vid = document.getElementById('vehicle-id')?.value;
    const url = getCurrentVehicleSheetUrl();
    const hasGas = !!(appData.gasUrl && appData.passcode);
    if (btnOpen) { btnOpen.disabled = !url; btnOpen.style.opacity = url ? '' : '0.4'; }
    if (btnView) { btnView.disabled = !hasGas; btnView.style.opacity = hasGas ? '' : '0.4'; }
}
function openSpreadsheet() {
    const url = getCurrentVehicleSheetUrl();
    if (url) window.open(url, '_blank');
    else window.showCustomAlert('この車両にはシートURLが設定されていません。\n設定（⚙）→ 車両リストの🔗ボタンで設定してください。');
}

// ======================================
// ビューア状態
// ======================================
const svState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    rows: null,
    aiEnabled: true
};

// ======================================
// フォーマットユーティリティ
// ======================================
function svFmtTime(val) {
    if (!val) return '';
    // Dateオブジェクトによる直接処理
    if (typeof val === 'object' && typeof val.getHours === 'function')
        return String(val.getHours()).padStart(2, '0') + ':' + String(val.getMinutes()).padStart(2, '0');

    // 文字列処理
    const m = String(val).match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2})?(?:Z|\.\d+Z)?$/) || String(val).match(/(\d{1,2}):(\d{2})/);
    if (m) {
        let hh = parseInt(m[1], 10);
        const mm = m[2];
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

    return '';
}
function svFmtNum(val) {
    if (val === '' || val == null) return '';
    const n = Number(val);
    return isNaN(n) || n === 0 ? '' : n.toLocaleString();
}

// ======================================
// 3行 → 1日データに変換
// ======================================
function svParseDayData(rows, di, year, month) {
    const r0 = rows[di * 3] || [];
    const r1 = rows[di * 3 + 1] || [];
    const r2 = rows[di * 3 + 2] || [];
    const n = v => Number(v) || 0;
    const isChk = v => String(v).match(/^(true|TRUE|1|✓|○|yes|Yes|YES)$/) ? '✓' : '';
    const fmtMethod = row => row[7] === true || String(row[7]).toUpperCase() === 'TRUE' ? '対面' : (row[9] === true || String(row[9]).toUpperCase() === 'TRUE' ? '電話' : '');
    const fmtAlcohol = row => row[12] === true || String(row[12]).toUpperCase() === 'TRUE' ? '有' : (row[14] === true || String(row[14]).toUpperCase() === 'TRUE' ? '無' : '');

    return {
        dayNum: di + 1,
        dow: new Date(year, month - 1, di + 1).getDay(),
        // 乗車前チェック
        preCheckTime: svFmtTime(r0[6]),
        preMethod: fmtMethod(r0),
        preChecker: r0[11] || '',
        preAlcohol: fmtAlcohol(r0),
        preAlcoholVal: r2[12] || '',
        // 乗車後チェック
        postCheckTime: svFmtTime(r1[6]),
        postMethod: fmtMethod(r1),
        postChecker: r1[11] || '',
        postAlcohol: fmtAlcohol(r1),
        postAlcoholVal: r2[13] || '',
        // 記録1
        driver1: r0[2] || '', dest1: r0[3] || '',
        start1: svFmtTime(r0[16]), end1: svFmtTime(r0[17]),
        depKm1: svFmtNum(r0[18]), arrKm1: svFmtNum(r0[19]), dist1: svFmtNum(r0[20]),
        isOver1: isChk(r0[21]), preInsp1: isChk(r0[23]),
        vReturn1: r0[25] || '', refuelAmt: svFmtNum(r0[22]), notes: r0[24] || '',
        _dep1: n(r0[18]), _arr1: n(r0[19]),
        // 記録2
        driver2: r1[2] || '', dest2: r1[3] || '',
        start2: svFmtTime(r1[16]), end2: svFmtTime(r1[17]),
        depKm2: svFmtNum(r1[18]), arrKm2: svFmtNum(r1[19]), dist2: svFmtNum(r1[20]),
        isOver2: isChk(r1[21]), preInsp2: isChk(r1[23]),
        vReturn2: r1[25] || '', refuelMeter: svFmtNum(r1[22]),
        _dep2: n(r1[18]), _arr2: n(r1[19]),
        // 記録3
        driver3: r2[2] || '', dest3: r2[3] || '',
        start3: svFmtTime(r2[16]), end3: svFmtTime(r2[17]),
        depKm3: svFmtNum(r2[18]), arrKm3: svFmtNum(r2[19]), dist3: svFmtNum(r2[20]),
        isOver3: isChk(r2[21]), preInsp3: isChk(r2[23]),
        vReturn3: r2[25] || '',
        _dep3: n(r2[18]), _arr3: n(r2[19]),
    };
}

// ======================================
// AIチェック
// ======================================
function svAiCheck(day, prev) {
    const issues = [];
    const hasDriving = !!(day.driver1 || day.start1 || day.driver2 || day.start2);
    if (hasDriving && !day.preCheckTime) issues.push({ col: 'preCheckTime', msg: '乗務前AC未確認' });
    if ((day.end1 || day.end2 || day.end3) && !day.postCheckTime) issues.push({ col: 'postCheckTime', msg: '乗務後AC未確認' });
    if (day.start1 && !day.end1) issues.push({ col: 'end1', msg: '到着①未入力' });
    if (day.start2 && !day.end2) issues.push({ col: 'end2', msg: '到着②未入力' });
    if (day.start3 && !day.end3) issues.push({ col: 'end3', msg: '到着③未入力' });
    if (day.driver1 && !day.start1) issues.push({ col: 'start1', msg: '出発①時刻なし' });
    if (day.driver2 && !day.start2) issues.push({ col: 'start2', msg: '出発②時刻なし' });
    if (day._arr1 && day._dep1 && day._arr1 < day._dep1) issues.push({ col: 'arrKm1', msg: '到着km①＜出発km' });
    if (day._arr2 && day._dep2 && day._arr2 < day._dep2) issues.push({ col: 'arrKm2', msg: '到着km②＜出発km' });
    if (prev && day._dep1) {
        const pArr = Math.max(prev._arr1 || 0, prev._arr2 || 0, prev._arr3 || 0);
        if (pArr && Math.abs(day._dep1 - pArr) > 200) issues.push({ col: 'depKm1', msg: `前日との距離差大(${Math.abs(day._dep1 - pArr)}km)` });
    }
    return issues;
}

// ======================================
// テーブル描画（スプレッドシート完全準拠版）
// ======================================
function svRenderTable(rows) {
    const container = document.getElementById('sv-table-container');
    const loadMsg = document.getElementById('sv-loading-msg');
    if (!container) return;

    const { year, month } = svState;
    const days = new Date(year, month, 0).getDate();
    const DOW = ['日', '月', '火', '水', '木', '金', '土'];
    const v = getCurrentVehicle();
    const vLabel = v ? (v.nickname || v.plate) : '—';

    const dayDataList = Array.from({ length: days }, (_, i) => svParseDayData(rows, i, year, month));

    let totalIssues = 0;
    const issuesList = dayDataList.map((d, i) => {
        if (!svState.aiEnabled) return [];
        const iss = svAiCheck(d, i > 0 ? dayDataList[i - 1] : null);
        totalIssues += iss.length;
        return iss;
    });

    const badge = document.getElementById('sv-issue-badge');
    if (badge) {
        badge.textContent = svState.aiEnabled ? (totalIssues > 0 ? `⚠ ${totalIssues}件の問題` : '✓ 問題なし') : '';
        badge.className = 'sv-issue-badge ' + (totalIssues > 0 ? 'sv-badge-err' : 'sv-badge-ok');
    }



    // ── テーブル ──
    const tbl = document.createElement('table');
    tbl.className = 'sv-table sv-table-report';

    // thead: 2行構成
    const thead = tbl.createTHead();
    const hr1 = thead.insertRow();
    const hr2 = thead.insertRow();

    const mth = (row, html, rs, cs, cls) => {
        const t = document.createElement('th');
        t.innerHTML = html;
        if (rs > 1) t.rowSpan = rs;
        if (cs > 1) t.colSpan = cs;
        if (cls) t.className = cls || 'sv-th';
        else t.className = 'sv-th';
        row.appendChild(t);
    };

    // 1行目
    mth(hr1, '日付', 2, 1, 'sv-th sv-sticky-th sv-w-day');
    mth(hr1, '曜', 2, 1, 'sv-th sv-w-dow');
    mth(hr1, '運転者', 2, 1, 'sv-th sv-w-name');
    mth(hr1, '訪問先・現場名等', 2, 1, 'sv-th sv-w-dest');
    mth(hr1, 'ALC確認<br><small>上段:乗前 / 下段:乗後</small>', 1, 4, 'sv-th sv-group-alc');
    mth(hr1, '使用時間', 1, 2, 'sv-th sv-group');
    mth(hr1, 'メーター数', 1, 3, 'sv-th sv-group');
    mth(hr1, '走行<br>400km超', 2, 1, 'sv-th sv-w-sm');
    mth(hr1, '給油<br><small>上:量/下:km</small>', 2, 1, 'sv-th sv-w-sm');
    mth(hr1, '運行前<br>点検', 2, 1, 'sv-th sv-w-sm');
    mth(hr1, '特記事項', 2, 1, 'sv-th sv-w-notes');
    mth(hr1, '車両<br>持帰', 2, 1, 'sv-th sv-w-sm');
    mth(hr1, '管理者<br>確認', 2, 1, 'sv-th sv-w-sm');

    // 2行目（ALC 4 + 使用時間 2 + メーター 3）
    ['時刻', '確認方法', '確認相手', '酒気帯'].forEach(t => mth(hr2, t, 1, 1, 'sv-th sv-w-time'));
    ['出発', '運転終了'].forEach(t => mth(hr2, t, 1, 1, 'sv-th sv-w-time'));
    ['出発時', '帰社時', '走行距離'].forEach(t => mth(hr2, t, 1, 1, 'sv-th sv-w-km'));

    // tbody: 3行/日
    const tbody = tbl.createTBody();
    const mkTd = (row, text, cls, rs) => {
        const c = row.insertCell();
        c.textContent = text ?? '';
        if (cls) c.className = cls;
        if (rs > 1) c.rowSpan = rs;
        return c;
    };

    dayDataList.forEach((day, i) => {
        const issues = issuesList[i];
        const issKeys = new Set(issues.map(x => x.col));
        const isEmpty = !day.driver1 && !day.start1 && !day.preCheckTime;
        const isHoliday = day.dow === 0, isSat = day.dow === 6;
        const baseCls = (isEmpty ? 'sv-row-empty' : '') + (issues.length && svState.aiEnabled ? ' sv-row-issue' : '') + (isHoliday ? ' sv-row-holiday' : isSat ? ' sv-row-saturday' : '');

        const mark = (cell, key) => {
            if (issKeys.has(key) && svState.aiEnabled) {
                cell.classList.add('sv-cell-issue');
                cell.title = issues.find(x => x.col === key)?.msg || '';
            }
        };

        // --- Row 1: 乗車前ALC + 記録1 ---
        const r1 = tbody.insertRow(); r1.className = baseCls;
        // 日付・曜日 (rowspan=3)
        const dc = mkTd(r1, day.dayNum, 'sv-cell-day sv-sticky', 3);
        if (isHoliday) dc.classList.add('sv-sun'); else if (isSat) dc.classList.add('sv-sat');
        const wc = mkTd(r1, DOW[day.dow], 'sv-cell-dow', 3);
        if (isHoliday) wc.classList.add('sv-sun'); else if (isSat) wc.classList.add('sv-sat');
        // ALC前
        mark(mkTd(r1, day.driver1, 'sv-cell-name'), 'driver1');
        mkTd(r1, day.dest1, 'sv-cell-dest-td');
        mark(mkTd(r1, day.preCheckTime, 'sv-cell-time'), 'preCheckTime');
        mkTd(r1, day.preMethod, 'sv-cell-center');
        mkTd(r1, day.preChecker, '');
        mkTd(r1, day.preAlcohol, 'sv-cell-center');
        // 記録1
        mark(mkTd(r1, day.start1, 'sv-cell-time'), 'start1');
        mark(mkTd(r1, day.end1, 'sv-cell-time'), 'end1');
        mkTd(r1, day.depKm1, 'sv-cell-num');
        mark(mkTd(r1, day.arrKm1, 'sv-cell-num'), 'arrKm1');
        mkTd(r1, day.dist1, 'sv-cell-num');
        mkTd(r1, day.isOver1, 'sv-cell-center sv-cell-isover', 3);
        mkTd(r1, day.refuelAmt, 'sv-cell-num');
        mkTd(r1, day.preInsp1, 'sv-cell-center');
        mkTd(r1, day.notes, 'sv-cell-notes-td');
        mkTd(r1, day.vReturn1, 'sv-cell-center');
        mkTd(r1, '', '');

        // --- Row 2: 乗車後ALC + 記録2 ---
        const r2 = tbody.insertRow(); r2.className = baseCls;
        mark(mkTd(r2, day.driver2, 'sv-cell-name'), 'driver2');
        mkTd(r2, day.dest2, 'sv-cell-dest-td');
        mark(mkTd(r2, day.postCheckTime, 'sv-cell-time'), 'postCheckTime');
        mkTd(r2, day.postMethod, 'sv-cell-center');
        mkTd(r2, day.postChecker, '');
        mkTd(r2, day.postAlcohol, 'sv-cell-center');
        mark(mkTd(r2, day.start2, 'sv-cell-time'), 'start2');
        mark(mkTd(r2, day.end2, 'sv-cell-time'), 'end2');
        mkTd(r2, day.depKm2, 'sv-cell-num');
        mark(mkTd(r2, day.arrKm2, 'sv-cell-num'), 'arrKm2');
        mkTd(r2, day.dist2, 'sv-cell-num');
        mkTd(r2, day.refuelMeter, 'sv-cell-num');
        mkTd(r2, day.preInsp2, 'sv-cell-center');
        mkTd(r2, '', ''); mkTd(r2, day.vReturn2, 'sv-cell-center'); mkTd(r2, '', '');

        // --- Row 3: アルコール数値行 + 記録3 ---
        const r3 = tbody.insertRow(); r3.className = baseCls;
        mkTd(r3, day.driver3, 'sv-cell-name');
        mkTd(r3, day.dest3, 'sv-cell-dest-td');
        mkTd(r3, '', 'sv-cell-alc-val');
        mkTd(r3, '', ''); mkTd(r3, '', ''); mkTd(r3, '', '');
        mark(mkTd(r3, day.start3, 'sv-cell-time'), 'start3');
        mark(mkTd(r3, day.end3, 'sv-cell-time'), 'end3');
        mkTd(r3, day.depKm3, 'sv-cell-num');
        mkTd(r3, day.arrKm3, 'sv-cell-num');
        mkTd(r3, day.dist3, 'sv-cell-num');
        mkTd(r3, '', '');
        mkTd(r3, day.preInsp3, 'sv-cell-center');
        mkTd(r3, '', ''); mkTd(r3, day.vReturn3, 'sv-cell-center'); mkTd(r3, '', '');

        // 問題は外部パネルに集約（テーブル内行は削除）
    });

    // 問題パネルに集約表示
    const panel = document.getElementById('sv-issues-panel');
    if (panel) {
        if (svState.aiEnabled && totalIssues > 0) {
            const DOW2 = ['日', '月', '火', '水', '木', '金', '土'];
            panel.innerHTML = `<div class="sv-panel-title">⚠ ${totalIssues}件の問題が見つかりました</div>` +
                dayDataList.map((d, i) => {
                    const iss = issuesList[i];
                    if (!iss.length) return '';
                    return `<div class="sv-panel-item"><span class="sv-panel-day">${d.dayNum}日（${DOW2[d.dow]}）</span>${iss.map(x => `<span>⚠ ${x.msg}</span>`).join('')}</div>`;
                }).join('');
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    container.innerHTML = '';
    container.appendChild(tbl);
    container.style.display = 'block';
    if (loadMsg) loadMsg.style.display = 'none';
}

// ======================================
// GASからデータ取得して描画
// ======================================
let _svAbortCtrl = null;  // 前回のfetchキャンセル用
let _svFetchId = 0;     // リクエストID（古いレスポンス無視用）

async function svFetchAndRender() {
    // 前回リクエストをキャンセル
    if (_svAbortCtrl) { _svAbortCtrl.abort(); }
    _svAbortCtrl = new AbortController();
    const myId = ++_svFetchId;

    const loadMsg = document.getElementById('sv-loading-msg');
    const container = document.getElementById('sv-table-container');
    const panel = document.getElementById('sv-issues-panel');
    if (loadMsg) { loadMsg.innerHTML = '<span class="material-symbols-rounded" style="font-size:2rem;animation:spin 1s linear infinite;">sync</span><span>データ取得中...</span>'; loadMsg.style.display = 'flex'; }
    if (container) container.style.display = 'none';
    if (panel) panel.style.display = 'none';

    const gasUrl = appData.gasUrl, pass = appData.passcode;
    const vid = document.getElementById('vehicle-id')?.value;

    if (!gasUrl || !pass) { if (loadMsg) { loadMsg.style.display = 'flex'; loadMsg.innerHTML = '<span>設定画面でGAS URLとパスコードを設定してください</span>'; } return; }
    if (!vid) { if (loadMsg) { loadMsg.style.display = 'flex'; loadMsg.innerHTML = '<span>車両を選択してください</span>'; } return; }

    const dateStr = `${svState.year}-${String(svState.month).padStart(2, '0')}-01`;
    try {
        const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getMonthData', passcode: pass, date: dateStr, vehicleId: vid }),
            signal: _svAbortCtrl.signal
        });
        const result = await res.json();

        // 後から返ってきた古いレスポンスは無視
        if (myId !== _svFetchId) return;

        if (result.status !== 'success') throw new Error(result.message);
        svState.rows = result.rows;
        svRenderTable(result.rows);
    } catch (e) {
        if (e.name === 'AbortError') return; // キャンセルは正常（エラー表示しない）
        if (myId !== _svFetchId) return;
        if (loadMsg) { loadMsg.style.display = 'flex'; loadMsg.innerHTML = `<span style="color:var(--color-error)">エラー: ${e.message}</span>`; }
    }
}

// ======================================
// ビューアを開く
// ======================================
function openMonthViewer() {
    const vid = document.getElementById('vehicle-id')?.value;
    if (!vid) { window.showCustomAlert('車両を選択してください。'); return; }
    const now = new Date();
    svState.year = now.getFullYear();
    svState.month = now.getMonth() + 1;
    svState.rows = null;
    svUpdateNavHeader();
    const modal = document.getElementById('ss-viewer-modal');
    if (!modal) return;
    if (window.openModalWithHistory) window.openModalWithHistory('ss-viewer-modal');
    else modal.classList.add('open');
    svFetchAndRender();
}

function svUpdateNavHeader() {
    const lbl = document.getElementById('sv-month-label');
    const vlbl = document.getElementById('sv-vehicle-label');
    if (lbl) lbl.textContent = `${svState.year}年${String(svState.month).padStart(2, '0')}月`;
    if (vlbl) { const v = getCurrentVehicle(); vlbl.textContent = v ? (v.nickname || v.plate) : '—'; }
}


// ======================================
// 初期化
// ======================================
function initSs() {
    document.getElementById('btn-open-ss')?.addEventListener('click', openSpreadsheet);
    document.getElementById('btn-view-ss')?.addEventListener('click', openMonthViewer);
    document.getElementById('btn-close-ss-viewer')?.addEventListener('click', () => window.closeModal(document.getElementById('ss-viewer-modal')));
    document.getElementById('btn-sv-prev')?.addEventListener('click', () => {
        if (svState.month === 1) { svState.year--; svState.month = 12; } else svState.month--;
        svUpdateNavHeader(); svFetchAndRender();
    });
    document.getElementById('btn-sv-next')?.addEventListener('click', () => {
        if (svState.month === 12) { svState.year++; svState.month = 1; } else svState.month++;
        svUpdateNavHeader(); svFetchAndRender();
    });
    document.getElementById('sv-ai-check-toggle')?.addEventListener('change', e => {
        svState.aiEnabled = e.target.checked;
        if (svState.rows) svRenderTable(svState.rows);
    });
    document.getElementById('vehicle-id')?.addEventListener('change', () => {
        updateSsLinkArea();
        // 車両選択時、常に最新のURLをGASから取得（当月タブへの自動リンク適用のため）
        const vid = document.getElementById('vehicle-id')?.value;
        if (vid && appData.gasUrl && appData.passcode) {
            setTimeout(() => fetchAndCacheVehicleUrl(vid), 1500);
        }
    });

    document.getElementById('report-date')?.addEventListener('change', () => {
        // 日付変更時にも新しいURL（新しい月のタブなど）を取得し直す
        const vid = document.getElementById('vehicle-id')?.value;
        if (vid && appData.gasUrl && appData.passcode) {
            setTimeout(() => fetchAndCacheVehicleUrl(vid), 1500);
        }
    });

    updateSsLinkArea();
}
