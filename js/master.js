// --- マスタデータ管理 ---
function addItemToList(type) {
    const input = document.getElementById(`input-add-${type}`);
    const name = input.value.trim();
    if (type === 'vehicle') {
        const nickInput = document.getElementById('input-add-vehicle-nickname');
        const nickname = nickInput ? nickInput.value.trim() : '';
        const plate = name; // メイン入力はナンバー
        if (!plate && !nickname) return;

        const exists = appData.vehicles.some(v => (v.plate || '') === plate);
        if (!exists) {
            appData.vehicles.push({ plate: plate, nickname: nickname });
            if (nickInput) nickInput.value = '';
            input.value = '';
            saveSettings();
            renderTagList(type);
            updateSelectOptions(type);
        }
        return;
    }

    if (!name) return;

    const newItem = { name: name, favorite: false };
    if (type === 'driver' && !appData.drivers.some(d => d.name === name)) {
        appData.drivers.push(newItem);
    } else if (type === 'checker' && !appData.checkers.some(c => c.name === name)) {
        appData.checkers.push(newItem);
    } else if (type === 'destination' && !appData.destinations.some(d => d.name === name)) {
        appData.destinations.push(newItem);
    }

    input.value = '';
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

async function removeItemFromList(type, name) {
    let displayName = name;
    if (typeof name === 'object') {
        if (name.nickname) {
            displayName = name.nickname;
        } else if (name.plate) {
            displayName = name.plate;
        } else if (name.name) {
            displayName = name.name;
        } else {
            // fallback if it's an object but has no recognizable name property
            displayName = JSON.stringify(name);
        }
    }

    const ok = await window.showCustomConfirm(`「${displayName}」を削除してもよろしいですか？`);
    if (!ok) return;

    if (type === 'vehicle') {
        appData.vehicles = appData.vehicles.filter(v => v.plate !== name.plate);
    } else if (type === 'driver') {
        appData.drivers = appData.drivers.filter(d => (typeof d === 'string' ? d : d.name) !== (typeof name === 'string' ? name : name.name));
    } else if (type === 'checker') {
        appData.checkers = appData.checkers.filter(c => (typeof c === 'string' ? c : c.name) !== (typeof name === 'string' ? name : name.name));
    } else if (type === 'destination') {
        appData.destinations = appData.destinations.filter(d => (typeof d === 'string' ? d : d.name) !== (typeof name === 'string' ? name : name.name));
    }
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

function renderTagList(type) {
    const container = document.getElementById(`${type}-tag-list`);
    if (!container) return;
    container.innerHTML = '';

    let list = [];
    if (type === 'vehicle') list = appData.vehicles;
    else if (type === 'driver') list = appData.drivers;
    else if (type === 'checker') list = appData.checkers;
    else if (type === 'destination') list = appData.destinations || [];

    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'list-card';

        const info = document.createElement('div');
        info.className = 'card-info';

        const nameLabel = document.createElement('div');
        nameLabel.className = 'card-name';

        const subLabel = document.createElement('div');
        subLabel.className = 'card-sub';

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        if (type === 'vehicle' && typeof item === 'object') {
            nameLabel.textContent = item.nickname || '車両';
            subLabel.textContent = item.plate;
        } else {
            nameLabel.textContent = typeof item === 'object' ? item.name : item;
            subLabel.style.display = 'none';
        }

        info.appendChild(nameLabel);
        info.appendChild(subLabel);
        card.appendChild(info);

        // Edit Button (Vehicles only)
        if (type === 'vehicle') {
            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn edit';
            editBtn.title = 'ニックネームを編集';
            editBtn.innerHTML = '<span class="material-symbols-rounded">edit</span>';
            editBtn.onclick = () => editVehicleNickname(item);
            actions.appendChild(editBtn);
        }

        // QR Button (Vehicles only)
        if (type === 'vehicle') {
            const qrBtn = document.createElement('button');
            qrBtn.className = 'icon-btn qr';
            qrBtn.title = 'QRコードを表示';
            qrBtn.innerHTML = '<span class="material-symbols-rounded">qr_code_2</span>';
            qrBtn.onclick = () => typeof showVehicleQR === 'function' && showVehicleQR(item);
            actions.appendChild(qrBtn);
        }

        // Favorite Button (Driver, Checker, Destination)
        if (type !== 'vehicle') {
            const favBtn = document.createElement('button');
            const isFav = typeof item === 'object' && item.favorite;
            favBtn.className = `icon-btn fav ${isFav ? 'active' : ''}`;
            favBtn.title = isFav ? 'お気に入り解除' : 'お気に入り登録';
            favBtn.innerHTML = `<span class="material-symbols-rounded">${isFav ? 'star' : 'grade'}</span>`;
            favBtn.onclick = () => toggleFavorite(type, item);
            actions.appendChild(favBtn);
        }

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn delete';
        delBtn.title = '削除';
        delBtn.innerHTML = '<span class="material-symbols-rounded">delete_outline</span>';
        delBtn.onclick = () => removeItemFromList(type, item);
        actions.appendChild(delBtn);

        card.appendChild(actions);
        container.appendChild(card);
    });
}

function updateSelectOptions(type) {
    let list = [];
    let selectors = [];

    if (type === 'vehicle') {
        list = appData.vehicles;
        selectors = ['vehicle-id', 'default-vehicle'];
    } else if (type === 'driver') {
        list = appData.drivers;
        selectors = ['driver-name-1', 'driver-name-2', 'driver-name-3', 'default-driver'];
    } else if (type === 'checker') {
        list = appData.checkers;
        selectors = ['pre-checker', 'post-checker'];
    }

    selectors.forEach(id => {
        const selectEl = document.getElementById(id);
        if (!selectEl) return;

        const currentVal = selectEl.value;
        const defaultOption = selectEl.options[0];
        selectEl.innerHTML = '';

        if (defaultOption) {
            selectEl.appendChild(defaultOption);
        } else {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.textContent = "未選択";
            selectEl.appendChild(defaultOpt);
        }

        const sortedList = [...list].sort((a, b) => {
            const aFav = typeof a === 'object' && a.favorite ? 1 : 0;
            const bFav = typeof b === 'object' && b.favorite ? 1 : 0;
            return bFav - aFav; // お気に入りを上に
        });

        sortedList.forEach(item => {
            const opt = document.createElement('option');
            if (type === 'vehicle' && typeof item === 'object') {
                opt.value = item.plate || '';
                opt.textContent = item.nickname ? `${item.nickname} (${item.plate})` : item.plate;
            } else {
                const val = typeof item === 'object' ? item.name : item;
                const isFav = typeof item === 'object' && item.favorite;
                opt.value = opt.textContent = val;
                if (isFav) opt.textContent = `★ ${val}`;
            }
            selectEl.appendChild(opt);
        });

        if (type === 'vehicle') {
            if (list.some(v => (v.plate || v) === currentVal)) {
                selectEl.value = currentVal;
            }
        } else {
            const exists = list.some(i => (typeof i === 'object' ? i.name : i) === currentVal);
            if (exists) selectEl.value = currentVal;
        }
    });
}

function toggleFavorite(type, item) {
    if (typeof item !== 'object') return;
    item.favorite = !item.favorite;
    saveSettings();
    renderTagList(type);
    updateSelectOptions(type);
}

async function editVehicleNickname(vehicleObj) {
    if (typeof vehicleObj !== 'object') return;
    const newName = await window.showCustomPrompt('車両編集', '新しいニックネームを入力してください', vehicleObj.nickname || '');
    if (newName !== null) {
        vehicleObj.nickname = newName;
        saveSettings();
        renderTagList('vehicle');
        updateSelectOptions('vehicle');
        window.showCustomAlert('ニックネームを更新しました');
    }
}