let currentCitizenPopup = null;
let debugConsole;
let consoleInput;
let consoleOutput;
let lastPlacedCitizen = null;

function updateResourcesDisplay() {
    const population = Math.floor(gameState.population) || 0;
    const availableAccommodations = (gameState.total_accommodations - gameState.used_accommodations) || 0;
    const totalAccommodations = gameState.total_accommodations || 0;
    
    document.getElementById('population-value').textContent = `${population}`;
    document.getElementById('accommodations-value').textContent = `${availableAccommodations} / ${totalAccommodations}`;
    document.getElementById('money-value').textContent = `$${gameState.money}`;
}

function updateTimeDisplay() {
    const gameDate = new Date(gameState.current_date);
    const dateString = gameDate.toDateString();
    
    const totalMinutes = Math.floor(gameState.tick / 4);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    document.getElementById('date-value').textContent = dateString;
    document.getElementById('time-value').textContent = timeString;
}

function showBuildingMenu(x, y, gridX, gridY) {
    console.log("showBuildingMenu called");
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }

    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const existingBuilding = gameState.grid[`${gridX},${gridY}`];

    if (existingBuilding) {
        console.log("Existing building found:", existingBuilding);
        const buildingData = gameState.buildings_data[existingBuilding.type];
        const upgradeOption = document.createElement('div');
        upgradeOption.textContent = `Upgrade ${buildingData.name} ($${buildingData.upgrade_cost * existingBuilding.level})`;
        upgradeOption.addEventListener('click', () => {
            upgradeBuilding(gridX, gridY);
            document.body.removeChild(menu);
        });
        menu.appendChild(upgradeOption);

        const infoOption = document.createElement('div');
        infoOption.textContent = 'Show Info';
        infoOption.addEventListener('click', () => {
            showCellPopup(gridX, gridY, existingBuilding);
            document.body.removeChild(menu);
        });
        menu.appendChild(infoOption);
    } else {
        console.log("No existing building, showing building options");
        for (const [type, data] of Object.entries(gameState.buildings_data)) {
            const option = document.createElement('div');
            option.textContent = `${data.name} ($${data.price})`;
            option.addEventListener('click', () => {
                placeBuilding(gridX, gridY, type);
                document.body.removeChild(menu);
            });
            menu.appendChild(option);
        }
    }

    document.body.appendChild(menu);
    console.log("Building menu appended to document body");

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
        const occupiedAccommodations = building.accommodations.filter(acc => acc.length > 0).length;
        const totalAccommodations = building.total_accommodations;
        const population = building.accommodations.reduce((sum, acc) => sum + acc.length, 0);
        
        popup.innerHTML = `
            <h3>${buildingData.name}</h3>
            <p>Level: ${building.level}</p>
            <p>Accommodations: ${occupiedAccommodations} / ${totalAccommodations}</p>
            <p>Population: ${population}</p>
            <p>Max People per Accommodation: ${buildingData.max_people_per_accommodation}</p>
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
        return;
    }

    const popup = document.createElement('div');
    popup.classList.add('new-citizen-popup');
    
    const birthDate = new Date(citizen.birthday);
    const gameDate = new Date(gameState.current_date);
    const age = gameDate.getFullYear() - birthDate.getFullYear();
    
    const genderIcon = citizen.gender === 'Male' ? '♂️' : '♀️';
    const genderColor = citizen.gender === 'Male' ? 'blue' : 'pink';

    popup.innerHTML = `
        <div class="popup-header">
            <button id="move-to-accommodation" title="Move to accommodation">🏠</button>
            <h3>New Citizen!</h3>
            <div style="text-align: right; font-size: 24px; color: ${genderColor};">${genderIcon}</div>
        </div>
        <div class="popup-content">
            <p>Name: ${citizen.first_name} ${citizen.last_name}</p>
            <p>Age: ${age}</p>
            <p>Previous Job: ${citizen.previous_job}</p>
            <p>🎵: ${citizen.favorite_music}</p>
        </div>
        <div class="popup-footer">
            <button id="accept-citizen">Accept</button>
            <button id="deny-citizen">Deny</button>
        </div>
    `;

    document.body.appendChild(popup);
    currentCitizenPopup = popup;
    socket.emit('citizen_popup_displayed');

    const moveToAccommodationBtn = popup.querySelector('#move-to-accommodation');
    moveToAccommodationBtn.addEventListener('click', () => {
        console.log('Move to accommodation button clicked');
        moveViewToAccommodation(citizen);
    });

    moveToAccommodationBtn.addEventListener('mouseenter', () => {
        popup.style.opacity = '0.5';
    });

    moveToAccommodationBtn.addEventListener('mouseleave', () => {
        popup.style.opacity = '1';
    });

    popup.querySelector('#accept-citizen').addEventListener('click', () => {
        socket.emit('accept_citizen', { index: gameState.pending_citizens.length - 1 });
        document.body.removeChild(popup);
        currentCitizenPopup = null;
    });

    popup.querySelector('#deny-citizen').addEventListener('click', () => {
        socket.emit('deny_citizen', { index: gameState.pending_citizens.length - 1 });
        document.body.removeChild(popup);
        currentCitizenPopup = null;
    });
}

function moveViewToAccommodation(citizen) {
    console.log('moveViewToAccommodation called for citizen:', citizen);
    if (!citizen) {
        console.error('Error: Citizen object is undefined or null');
        return;
    }
    if (!lastPlacedCitizen) {
        console.error('Error: No last placed citizen information available');
        return;
    }
    console.log('Last placed citizen:', lastPlacedCitizen);
    
    const buildingEntry = Object.entries(gameState.grid).find(([coords, building]) => 
        building.accommodations.some(acc => acc.some(c => c.id === citizen.id))
    );

    if (buildingEntry) {
        const [coords, building] = buildingEntry;
        const [x, y] = coords.split(',').map(Number);
        console.log(`Centering map on building at (${x}, ${y})`);
        centerMapOnBuilding(x, y);
    } else {
        console.error('Error: Building not found for citizen');
    }
}

function centerMapOnBuilding(x, y) {
    console.log(`Centering map on (${x}, ${y})`);
    gridOffsetX = canvas.width / 2 - x * gridSize * gridScale;
    gridOffsetY = canvas.height / 2 - y * gridSize * gridScale;
    drawGame();
}

function initDebugConsole() {
    debugConsole = document.getElementById('debug-console');
    consoleInput = document.getElementById('console-input');
    consoleOutput = document.getElementById('console-output');
    
    document.getElementById('console-submit').addEventListener('click', handleConsoleSubmit);
    consoleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleConsoleSubmit();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === '/') {
            e.preventDefault();
            debugConsole.style.display = debugConsole.style.display === 'none' ? 'block' : 'none';
        }
    });
}

function handleConsoleSubmit() {
    const command = consoleInput.value.trim();
    if (command) {
        socket.emit('console_command', { command: command }, function(response) {
            appendToConsole(`> ${command}<br>${response.replace(/\n/g, '<br>')}`);
        });
        consoleInput.value = '';
    }
}

function appendToConsole(message) {
    consoleOutput.innerHTML += message + '<br>';
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}