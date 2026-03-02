/**
 * info.js - 繧｢繝励Μ縺ｮ繝舌・繧ｸ繝ｧ繝ｳ邂｡逅・→譖ｴ譁ｰ螻･豁ｴ
 */

const APP_VERSION = "1.1.1";
const REPORT_URL = ""; // TODO: 縺薙％縺ｫGoogle繝輔か繝ｼ繝縺ｪ縺ｩ縺ｮURL繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞

const UPDATE_HISTORY = [
    {
        version: "1.1.1",
        date: "2026-03-02",
        content: "荳榊・蜷亥ｱ蜻翫・隕∵悍繧帝√ｋ讖溯・繧定ｿｽ蜉縺励∪縺励◆縺後√∪縺螳溯｣・＆繧後※縺・∪縺帙ｓ縲・
    },
    {
        version: "1.1.0",
        date: "2026-03-02",
        content: "譖ｴ譁ｰ螻･豁ｴ繝ｻ繝舌・繧ｸ繝ｧ繝ｳ陦ｨ遉ｺ讖溯・繧定ｿｽ蜉縺励∪縺励◆縲りｨｭ螳壹・繧ｿ繝ｳ縺ｮ髫｣縺ｮ繧｢繧､繧ｳ繝ｳ縺九ｉ驕主悉縺ｮ菫ｮ豁｣蜀・ｮｹ繧堤｢ｺ隱阪〒縺阪∪縺吶・
    },
    {
        version: "1.0.4",
        date: "2026-03-02",
        content: "QR繧ｳ繝ｼ繝峨・隱崎ｭ倡ｲｾ蠎ｦ繧貞髄荳翫＆縺帙∪縺励◆縲ょ挨縺ｮ遶ｯ譛ｫ縺ｧ逕滓・縺励◆QR繧ｳ繝ｼ繝峨〒繧よｭ｣縺励￥霆贋ｸ｡縺碁∈謚槭＆繧後ｋ繧医≧菫ｮ豁｣縺励∪縺励◆縲・
    },
    {
        version: "1.0.3",
        date: "2026-03-02",
        content: "QR繧ｳ繝ｼ繝臥函謌舌お繝ｩ繝ｼ繧剃ｿｮ豁｣縺励∪縺励◆縲りｻ贋ｸ｡蜷阪′髟ｷ縺・ｴ蜷医〒繧ら｢ｺ螳溘↓QR繧ｳ繝ｼ繝峨′陦ｨ遉ｺ縺輔ｌ繧九ｈ縺・ｮｹ驥丈ｸ企剞繧定ｪｿ謨ｴ縺励∪縺励◆縲・
    },
    {
        version: "1.0.2",
        date: "2026-03-02",
        content: "蜈･蜉帙Α繧ｹ髦ｲ豁｢讖溯・・医ヰ繝ｪ繝・・繧ｷ繝ｧ繝ｳ・峨ｒ霑ｽ蜉縺励∪縺励◆縲ょ芦逹繝｡繝ｼ繧ｿ繝ｼ縺悟・逋ｺ繧医ｊ蟆上＆縺・ｴ蜷医↓隴ｦ蜻翫ｒ陦ｨ遉ｺ縺励∪縺吶・
    },
    {
        version: "1.0.1",
        date: "2026-03-01",
        content: "陦ｨ遉ｺ荳榊・蜷医・菫ｮ豁｣縲ゅΟ繝ｼ繝・ぅ繝ｳ繧ｰ逕ｻ髱｢縺梧ｶ医∴縺ｪ縺上↑繧句撫鬘後ｄ縲√・繝・ム繝ｼ縺ｮ陦ｨ遉ｺ蟠ｩ繧後ｒ隗｣豎ｺ縺励∪縺励◆縲・
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
                window.showCustomAlert("蝣ｱ蜻雁・URL縺梧ｺ門ｙ荳ｭ縺ｧ縺吶ょｮ御ｺ・∪縺ｧ縺励・繧峨￥縺雁ｾ・■縺上□縺輔＞縲・);
            }
        });
    }
}

/**
 * 蜑榊屓縺ｮ襍ｷ蜍輔ヰ繝ｼ繧ｸ繝ｧ繝ｳ縺ｨ豈碑ｼ・＠縲∵眠縺励￠繧後・騾夂衍繝舌ャ繧ｸ繧定｡ｨ遉ｺ
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
 * 譖ｴ譁ｰ螻･豁ｴ繝｢繝ｼ繝繝ｫ繧帝幕縺・ */
function openUpdateModal() {
    const modal = document.getElementById('info-modal');
    if (!modal) return;

    // 譌｢隱ｭ縺ｫ縺吶ｋ
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
 * 譖ｴ譁ｰ螻･豁ｴ繝ｪ繧ｹ繝医ｒ謠冗判
 */
function renderUpdateHistory() {
    const container = document.getElementById('update-history-list');
    const versionDisplay = document.getElementById('app-version-display');
    if (!container) return;

    if (versionDisplay) versionDisplay.textContent = `v${APP_VERSION}`;

    container.innerHTML = UPDATE_HISTORY.map(item => `
        <div class="history-item">
            <div class="history-meta">
                <span class="history-version">v${item.version}</span>
                <span class="history-date">${item.date}</span>
            </div>
            <div class="history-content">${item.content}</div>
        </div>
    `).join('');
}
