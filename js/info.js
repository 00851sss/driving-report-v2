/**
 * info.js - アプリのバージョン管理と更新履歴
 */

const APP_VERSION = "1.1.1";
const REPORT_URL = ""; // TODO: ここにGoogleフォームなどのURLを設定してください

const UPDATE_HISTORY = [
    {
        version: "1.1.1",
        date: "2026-03-02",
        content: "不具合報告・要望を送る機能を追加しましたが、まだ実装されていません。"
    },
    {
        version: "1.1.0",
        date: "2026-03-02",
        content: "更新履歴・バージョン表示機能を追加しました。設定ボタンの隣のアイコンから過去の修正内容を確認できます。"
    },
    {
        version: "1.0.4",
        date: "2026-03-02",
        content: "QRコードの認識精度を向上させました。別の端末で生成したQRコードでも正しく車両が選択されるよう修正しました。"
    },
    {
        version: "1.0.3",
        date: "2026-03-02",
        content: "QRコード生成エラーを修正しました。車両名が長い場合でも確実にQRコードが表示されるよう容量上限を調整しました。"
    },
    {
        version: "1.0.2",
        date: "2026-03-02",
        content: "入力ミス防止機能（バリデーション）を追加しました。到着メーターが出発より小さい場合に警告を表示します。"
    },
    {
        version: "1.0.1",
        date: "2026-03-01",
        content: "表示不具合の修正。ローディング画面が消えなくなる問題や、ヘッダーの表示崩れを解決しました。"
    }
];

function initInfo() {
    checkVersionUpdate();
    renderUpdateHistory();

    const btnInfo = document.getElementById('btn-info');
    if (btnInfo) {
        btnInfo.addEventListener('click', () => {
            openUpdateModal();
        });
    }

    const btnCloseInfo = document.getElementById('btn-close-info');
    if (btnCloseInfo) {
        btnCloseInfo.addEventListener('click', () => {
            window.closeModal(document.getElementById('info-modal'));
        });
    }

    const btnReport = document.getElementById('btn-report');
    if (btnReport) {
        btnReport.addEventListener('click', () => {
            const url = REPORT_URL;
            if (url) {
                window.open(url, '_blank');
            } else {
                window.showCustomAlert("報告先URLが準備中です。完了までしばらくお待ちください。");
            }
        });
    }
}

/**
 * 前回の起動バージョンと比較し、新しければ通知バッジを表示
 */
function checkVersionUpdate() {
    const lastVersion = localStorage.getItem('app-last-version');
    const badge = document.getElementById('info-badge');

    if (lastVersion !== APP_VERSION) {
        if (badge) badge.style.display = 'block';
    } else {
        if (badge) badge.style.display = 'none';
    }
}

/**
 * 更新履歴モーダルを開く
 */
function openUpdateModal() {
    const modal = document.getElementById('info-modal');
    if (!modal) return;

    // 既読にする
    localStorage.setItem('app-last-version', APP_VERSION);
    const badge = document.getElementById('info-badge');
    if (badge) badge.style.display = 'none';

    if (window.openModalWithHistory) {
        window.openModalWithHistory('info-modal');
    } else {
        modal.classList.add('open');
    }
}

/**
 * 更新履歴リストを描画
 */
function renderUpdateHistory(customNotifications = []) {
    const container = document.getElementById('update-history-list');
    const versionDisplay = document.getElementById('app-version-display');
    if (!container) return;

    if (versionDisplay) versionDisplay.textContent = `v${APP_VERSION}`;

    // 既存の履歴アイテムに type を追加 (初期は normal)
    const localHistory = UPDATE_HISTORY.map(item => ({ ...item, type: 'normal', pinned: false }));

    // マージしてソート (pinned が上)
    const allNotifications = [...customNotifications, ...localHistory].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
    });

    container.innerHTML = allNotifications.map(item => {
        const badgeHtml = `
            <div class="history-badges">
                ${item.pinned ? '<span class="history-badge fixed"><span class="material-symbols-rounded">push_pin</span>固定</span>' : ''}
                ${item.type === 'emergency' ? '<span class="history-badge emergency"><span class="material-symbols-rounded">error</span>緊急</span>' : ''}
                ${item.type === 'urgent' ? '<span class="history-badge urgent"><span class="material-symbols-rounded">priority_high</span>重要</span>' : ''}
            </div>
        `;

        return `
            <div class="history-item">
                <div class="history-meta">
                    <div class="history-main-meta">
                        ${item.version ? `<span class="history-version">v${item.version}</span>` : ''}
                        <span class="history-date">${item.date}</span>
                    </div>
                    ${badgeHtml}
                </div>
                <div class="history-content">${item.content}</div>
            </div>
        `;
    }).join('');
}
