// --- QRコードスキャナー制御 ---
let html5QrCode = null;

function initQRScanner() {
    const btnScan = document.getElementById('btn-qr-scan');
    const qrModal = document.getElementById('qr-modal');
    const btnCancel = document.getElementById('btn-qr-cancel');

    if (!btnScan || !qrModal || !btnCancel) return;

    const stopScanner = () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                window.closeModal(qrModal);
            }).catch(err => {
                console.error("スキャナー停止エラー", err);
                window.closeModal(qrModal);
            });
        } else {
            window.closeModal(qrModal);
        }
    };

    btnScan.addEventListener('click', () => {
        qrModal.classList.add('open');

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        // 読み取り精度のチューニング
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // 読み取り成功時
                const selectElement = document.getElementById('vehicle-id');
                if (selectElement) {
                    const options = Array.from(selectElement.options);
                    const match = options.find(opt => opt.value === decodedText);

                    if (match) {
                        selectElement.value = decodedText;
                        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        window.showCustomAlert(`「${decodedText}」は車両マスターに登録されていません。`);
                    }
                }
                stopScanner();
            },
            (errorMessage) => {
                // 読み取り継続中のエラーは無視
            }
        ).catch((err) => {
            console.error("カメラ起動エラー", err);
            window.showCustomAlert("カメラの起動に失敗しました。ブラウザのカメラアクセス許可を確認してください。");
            stopScanner();
        });
    });

    btnCancel.addEventListener('click', stopScanner);

    // 背景タップで閉じる
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) stopScanner();
    });
}

// --- 車両別QRコード表示・生成 ---
let currentQRVehicle = null;

function initQRDisplay() {
    const modal = document.getElementById('qr-display-modal');
    const btnPrint = document.getElementById('btn-qr-print');
    const btnClose = document.getElementById('btn-qr-display-close');

    if (!modal || !btnPrint || !btnClose) return;

    btnPrint.onclick = () => {
        if (currentQRVehicle) printVehicleQR(currentQRVehicle);
    };

    btnClose.onclick = () => {
        window.closeModal(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) window.closeModal(modal);
    };
}

window.showVehicleQR = function (vehicle) {
    const modal = document.getElementById('qr-display-modal');
    const container = document.getElementById('qr-code-container');
    const plateDisplay = document.getElementById('qr-plate-display');
    const titleDisplay = document.getElementById('qr-display-title');

    if (!modal || !container || !plateDisplay) return;

    currentQRVehicle = vehicle;
    const plate = vehicle.plate || '';
    const nickname = vehicle.nickname || '';

    titleDisplay.textContent = nickname ? `${nickname} のQRコード` : '車両QRコード';
    plateDisplay.textContent = plate;
    container.innerHTML = '';

    // スキャン時に車両を選択するためのURLを生成
    // hash形式で渡すことで、ページ遷移後にJSで処理しやすくする
    const baseUrl = window.location.origin + window.location.pathname;
    const qrText = `${baseUrl}#vehicle=${encodeURIComponent(plate)}`;

    try {
        new QRCode(container, {
            text: qrText,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
        modal.classList.add('open');
    } catch (e) {
        console.error("QR生成エラー", e);
        window.showCustomConfirm("QRコードの生成に失敗しました。");
    }
};

function printVehicleQR(vehicle) {
    const plate = vehicle.plate || '';
    const nickname = vehicle.nickname || '';
    const qrCanvas = document.querySelector('#qr-code-container canvas');
    if (!qrCanvas) return;

    const qrDataUrl = qrCanvas.toDataURL("image/png");
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>車両QRプリント - ${plate}</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 40px; }
                .card { border: 2px solid #ccc; padding: 40px; display: inline-block; border-radius: 16px; }
                .nickname { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                .plate { font-size: 18px; color: #666; margin-bottom: 24px; }
                img { width: 300px; height: 300px; }
                .hint { margin-top: 24px; color: #888; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="nickname">${nickname || '車両'}</div>
                <div class="plate">${plate}</div>
                <img src="${qrDataUrl}">
                <div class="hint">このQRをスキャンすると車両が自動選択されます</div>
            </div>
            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}