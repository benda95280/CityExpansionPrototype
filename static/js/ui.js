let currentCitizenPopup = null;

function updateResourcesDisplay() {
    const population = Math.floor(gameState.population) || 0;
    const availableAccommodations = (gameState.total_accommodations - gameState.used_accommodations) || 0;
    const totalAccommodations = gameState.total_accommodations || 0;
    
    document.getElementById('population-value').textContent = `${population}`;
    document.getElementById('accommodations-value').textContent = `${availableAccommodations} / ${totalAccommodations}`;
    document.getElementById('money-value').textContent = `$${gameState.money}`;
}

function showBuildingMenu(x, y, gridX, gridY) {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }

    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    for (const [type, data] of Object.entries(gameState.buildings_data)) {
        const option = document.createElement('div');
        option.textContent = `${data.name} ($${data.price})`;
        option.addEventListener('click', () => {
            placeBuilding(gridX, gridY, type);
            document.body.removeChild(menu);
        });
        menu.appendChild(option);
    }

    document.body.appendChild(menu);

    document.addEventListener('click', removeMenu);
}

function removeMenu(e) {
    const menu = document.querySelector('.context-menu');
    if (menu && !menu.contains(e.target) && document.body.contains(menu)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', removeMenu);
    }
}

function showCellPopup(x, y, building) {
    const popup = document.createElement('div');
    popup.classList.add('cell-popup');

    if (building) {
        const buildingData = gameState.buildings_data[building.type];
        popup.innerHTML = `
            <h3>${buildingData.name}</h3>
            <p>Level: ${building.level}</p>
            <p>Population: ${building.accommodations.reduce((sum, acc) => sum + acc.length, 0)}</p>
            <button id="upgrade-btn">Upgrade ($${buildingData.upgrade_cost * building.level})</button>
        `;
        popup.querySelector('#upgrade-btn').addEventListener('click', () => {
            upgradeBuilding(x, y);
            document.body.removeChild(popup);
        });
    } else {
        popup.innerHTML = `<p>Empty cell (${x}, ${y})</p>`;
    }

    const { gridX, gridY } = getCanvasCoordinates(x, y);
    popup.style.left = `${gridX + gridSize / 2}px`;
    popup.style.top = `${gridY + gridSize / 2}px`;

    document.body.appendChild(popup);

    function removePopup(e) {
        const popup = document.querySelector('.cell-popup');
        if (popup && !popup.contains(e.target) && document.body.contains(popup)) {
            document.body.removeChild(popup);
            document.removeEventListener('click', removePopup);
        }
    }

    document.addEventListener('click', removePopup);
}

function showNewCitizenPopup(citizen) {
    if (currentCitizenPopup) {
        document.body.removeChild(currentCitizenPopup);
    }

    const popup = document.createElement('div');
    popup.classList.add('new-citizen-popup');
    popup.innerHTML = `
        <h3>New Citizen!</h3>
        <p>Name: ${citizen.first_name} ${citizen.last_name}</p>
        <p>Gender: ${citizen.gender}</p>
        <p>Age: ${citizen.age}</p>
        <button id="accept-citizen">Accept</button>
        <button id="deny-citizen">Deny</button>
        <button id="show-building" style="display:none;">Show Building</button>
    `;

    document.body.appendChild(popup);
    currentCitizenPopup = popup;

    popup.querySelector('#accept-citizen').addEventListener('click', () => {
        socket.emit('accept_citizen', { index: gameState.pending_citizens.length - 1 });
    });

    popup.querySelector('#deny-citizen').addEventListener('click', () => {
        socket.emit('deny_citizen', { index: gameState.pending_citizens.length - 1 });
        document.body.removeChild(popup);
        currentCitizenPopup = null;
    });

    socket.on('citizen_placed', (data) => {
        const showBuildingBtn = popup.querySelector('#show-building');
        showBuildingBtn.style.display = 'inline-block';
        showBuildingBtn.addEventListener('click', () => {
            const [x, y] = data.building.split(',').map(Number);
            centerMapOnBuilding(x, y);
            document.body.removeChild(popup);
            currentCitizenPopup = null;
        });
    });
}

function centerMapOnBuilding(x, y) {
    gridOffsetX = canvas.width / 2 - x * gridSize * gridScale;
    gridOffsetY = canvas.height / 2 - y * gridSize * gridScale;
    drawGame();
}
