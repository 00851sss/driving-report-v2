/**
 * info.js - アプリのバージョン管理と更新履歴
 */

const APP_VERSION = "1.2.9";
const REPORT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdA8xbIC7D6Z2ocp42pcwG8L_ZAFqlItyqTfAxpWZxvb3Z1Ng/viewform?usp=dialog"; // TODO: ここにGoogleフォームなどのURLを設定してください

const UPDATE_HISTORY = [
    {
        version: "1.2.9",
        date: "2026-03-28",
        content: "不具合修正\n・「別タブで開く」操作時、日付を変更しても以前の月（現在の日付など）のタブが開かれてしまう不具合を修正（日付変更時に対応する月のURLを再取得するよう改善）"
    },
    {
        version: "1.2.8",
        date: "2026-03-28",
        content: "新機能とUI改善\n・日付入力欄の横に「今日」ボタンを追加（ボタン押下時に確認ダイアログも表示）\n・アプリを開いたまま日付が変わった際に自動で再読み込み確認を出す機能を追加\n・ヘッダーの「運行日報」タイトルに他ツールへのリンク用メニューを追加（現在準備中）\n・給油・特記事項の未入力チェックの変更"
    },
    {
        version: "1.2.7",
        date: "2026-03-28",
        content: "不具合修正\n・更新・日付変更ボタンを押すとGAS URLやパスコードなど共通設定が消えてしまう不具合を修正\n・ページ更新後に運行前点検チェックの選択が外れた状態で送信されてしまう不具合を修正（読込時に正しく復元されるよう対応）\n・出発・取消・送信ボタン押下時にエラーが表示されないケースがある問題を修正（アラートでも通知するよう強化）\n・車両持帰の選択を任意に変更（未選択のまま送信できるよう修正）"
    },
    {
        version: "1.2.6",
        date: "2026-03-08",
        content: "安全機能の追加\n未登録車両での送信・出発を防止するバリデーションを追加\nマスタに登録されていない車両では送信・出発操作ができないよう制限"
    },
    {
        version: "1.2.4",
        date: "2026-03-08",
        content: "重大な不具合の修正と安全機能の追加\n日またぎ（夜間勤務）時のデータ消失防止の確認ダイアログ追加\nデフォルト車両以外を選択している場合の警告表示機能（車両間違い防止）\n過去・未来の日付を編集している場合の警告表示機能（上書き防止）\n「アプリ内で見る」の表示データ漏れ（給油量・400km超等）の修正\nその他運用安定性の向上"
    },
    {
        version: "1.2.3",
        date: "2026-03-08",
        content: "不具合の修正\nデフォルトに設定した車両がホームの｢別タブで開く｣が同期されない\n同期データの時間表示のズレ\nデータ同期の処理方法の変更\n一部設定の変更\nGAS保存時のエラー修正\nその他軽微な修正"
    },
    {
        version: "1.2.0",
        date: "2026-03-03",
        content: "操作安定性を大幅に向上させました。車両スプレッドシートURLの自動取得に対応し、手動設定が不要になりました。"
    },
    {
        pinned: true,
        type: "urgent",
        date: "2026-03-03",
        content: "【制作途中の機能】\n・アプリ内で見る現在作成中\n・一部エラー表示設定未完成\n・その他安定性"
    },
    {
        version: "1.1.1",
        date: "2026-03-02",
        content: "仮不具合報告・要望を送る機能を追加しました。"
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

    // 初回お知らせ取得
    fetchGlobalNotifications();

    // 定期取得 (3分おき)
    setInterval(fetchGlobalNotifications, 3 * 60 * 1000);

    let _lastActiveDay = new Date().getDate();
    let _dateChangeDialogShown = false; // ダイアログ重複表示防止フラグ

    // 日付またぎチェックの共通処理
    const checkDateChange = async () => {
        const currentDay = new Date().getDate();
        if (currentDay !== _lastActiveDay && !_dateChangeDialogShown) {
            _lastActiveDay = currentDay;
            _dateChangeDialogShown = true;
            const dateInput = document.getElementById('report-date');
            if (dateInput) {
                const ok = await window.showCustomConfirm('日付が更新されています。\n操作日を【本日】にリセットしますか？\n（現在入力中のデータは失われます。夜間運行を継続する場合は「キャンセル」を選んでください）');
                if (ok) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateInput.value = `${yyyy}-${mm}-${dd}`;
                    if (window.showCustomAlert) {
                        window.showCustomAlert('操作日を本日にリセットしました。');
                    }
                    if (typeof window.loadFormData === 'function') {
                        const currentVid = document.getElementById('vehicle-id')?.value;
                        if (currentVid) window.loadFormData();
                    }
                }
            }
            _dateChangeDialogShown = false;
        }
    };

    // ① 毎分定期チェック（アプリを開いたまま24時を越えた時に対応）
    setInterval(checkDateChange, 60 * 1000);

    // ② タブ復帰時の日付またぎチェック
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            fetchGlobalNotifications();
            await checkDateChange();

            // 日付が変わっていない場合は最新データを再取得
            if (new Date().getDate() === _lastActiveDay) {
                if (typeof window.loadFormData === 'function') {
                    const currentVid = document.getElementById('vehicle-id')?.value;
                    if (currentVid) window.loadFormData();
                }
            }
        }
    });

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

    // 重要なお知らせアクセントラインの制御
    const topAccentLine = document.getElementById('top-accent-line');
    if (topAccentLine) {
        const urgentItem = allNotifications.find(n => n.type === 'emergency' || n.type === 'urgent');
        if (urgentItem) {
            topAccentLine.style.display = 'block';
            topAccentLine.style.backgroundColor = urgentItem.type === 'emergency' ? '#e11d48' : '#f59e0b';
        } else {
            topAccentLine.style.display = 'none';
        }
    }
}

/**
 * お知らせ専用GASからデータを取得
 */
async function fetchGlobalNotifications() {
    // お知らせ取得専用のGAS URL (※ユーザー側で設定した本物のURLをここに記述してください)
    // もしURLが不明な場合は、管理者用のGAS設定画面から取得してください。
    const INFO_GAS_URL = "https://script.google.com/macros/s/AKfycbwWKilj5EdkG15FB0sjj52WAOX6WlHL9xT_Ugj1hkK5y3c0TqVD_i14LG8UhEJ5m1Z0/exec";

    // プレースホルダーの場合はスキップ（エラーではなく警告のみ）
    if (INFO_GAS_URL.includes("n7n-n7n")) {
        console.info("[info.js] Dedicated notification URL is a placeholder. Skipping fetch.");
        return;
    }

    try {
        const res = await fetch(INFO_GAS_URL);
        if (!res.ok) return;
        const result = await res.json();

        if (result.status === 'success' && result.notifications) {
            renderUpdateHistory(result.notifications);
        }
    } catch (e) {
        console.warn("[info.js] Failed to fetch global notifications:", e);
    }
}
