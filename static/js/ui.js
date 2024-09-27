window.highlightedCells = [];
window.isExpansionMode = false;
let currentCitizenPopup = null;
let debugConsole;
let consoleInput;
let consoleOutput;
let lastPlacedCitizen = null;

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

let uiUpdateScheduled = false;
function scheduleUIUpdate() {
    if (!uiUpdateScheduled) {
        uiUpdateScheduled = true;
        requestAnimationFrame(() => {
            updateUI();
            uiUpdateScheduled = false;
        });
    }
}

function updateResourcesDisplay() {
    const population = Math.floor(gameState.population) || 0;
    const availableAccommodations = gameState.grid ? Object.values(gameState.grid).reduce((sum, building) => {
    return building ? (building.is_built ? sum + (building.total_accommodations - building.accommodations.flat().length) : sum) : sum;
    showExpandOptions}, 0) : 0;
    const totalAccommodations = gameState.total_accommodations || 0;
    
    document.getElementById('population-value').textContent = `👥 ${population}`;
    document.getElementById('accommodations-value').textContent = `🏠 ${availableAccommodations} / ${totalAccommodations}`;
    document.getElementById('money-value').textContent = `💰 $${gameState.money}`;
    document.getElementById('ticking-speed-value').textContent = `⏱️ ${gameState.ticking_speed} ticks/s`;
}

function updateTimeDisplay() {
    const gameDate = new Date(gameState.current_date);
    const dateString = gameDate.toDateString();
    
    const totalMinutes = Math.floor(gameState.tick / 4);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    document.getElementById('date-value').textContent = `📅 ${dateString}`;
    document.getElementById('time-value').textContent = `🕒 ${timeString}`;
}

function dismissNotification(index) {
    socket.emit('dismiss_notification', { index: index });
}

function updateTasksNotifications() {
    const tasksList = document.getElementById('tasks-list');
    const notificationsList = document.getElementById('notifications-list');

    const tasksFragment = document.createDocumentFragment();
    const notificationsFragment = document.createDocumentFragment();

    if (gameState.tasks && gameState.tasks.tasks) {
        gameState.tasks.tasks.forEach(task => {
            if (!task.hidden) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${task.name}</span>
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${task.completion_percentage}%"></div>
                        <span class="task-progress-text">${task.completion_percentage}%</span>
                    </div>
                `;
                tasksFragment.appendChild(li);
            }
        });
    }

    if (gameState.notifications && gameState.notifications.notifications) {
        gameState.notifications.notifications.forEach((notification, index) => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            li.innerHTML = `
                <span>${notification.message}</span>
                <button class="dismiss-notification" onclick="dismissNotification(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            notificationsFragment.appendChild(li);
        });
    }

    tasksList.innerHTML = '';
    tasksList.appendChild(tasksFragment);
    notificationsList.innerHTML = '';
    notificationsList.appendChild(notificationsFragment);
}

function getBuildingEmoji(type) {
    switch (type) {
        case 'house':
            return '🏠';
        case 'apartment':
            return '🏢';
        case 'skyscraper':
            return '🏙️';
        default:
            return '🏗️';
    }
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

    const existingBuilding = gameState.grid[`${gridX},${gridY}`];

    if (existingBuilding) {
        const buildingData = existingBuilding && gameState.buildings_data[existingBuilding.type];
        if (!buildingData) {
            console.error('Building data not found for type:', existingBuilding.type);
            return;
        }
        
        const upgradeOption = document.createElement('div');
        upgradeOption.textContent = `🔧 Upgrade ${buildingData.name} ($${buildingData.upgrade_cost * existingBuilding.level})`;
        upgradeOption.addEventListener('click', () => {
            upgradeBuilding(gridX, gridY);
            document.body.removeChild(menu);
        });
        menu.appendChild(upgradeOption);

        if (existingBuilding.is_built && buildingData.expandable) {
            const currentExpansions = existingBuilding.expanded_cells ? existingBuilding.expanded_cells.length : 0;
            if (currentExpansions < buildingData.expansion_limit) {
                const expandOption = document.createElement('div');
                expandOption.textContent = `🔄 Expand (${currentExpansions}/${buildingData.expansion_limit})`;
                expandOption.addEventListener('click', () => {
                    console.log('Expand option clicked for building at', gridX, gridY);
                    showExpandOptions(gridX, gridY, existingBuilding);
                    document.body.removeChild(menu);
                });
                menu.appendChild(expandOption);
            }
        }

        const infoOption = document.createElement('div');
        infoOption.textContent = '📊 Show Info';
        infoOption.addEventListener('click', () => {
            showCellPopup(gridX, gridY, existingBuilding);
            document.body.removeChild(menu);
        });
        menu.appendChild(infoOption);
    } else {
        for (const [type, data] of Object.entries(gameState.buildings_data)) {
            const option = document.createElement('div');
            option.textContent = `${getBuildingEmoji(type)} ${data.name} ($${data.price})`;
            option.addEventListener('click', () => {
                placeBuilding(gridX, gridY, type);
                document.body.removeChild(menu);
            });
            menu.appendChild(option);
        }
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

function showExpandOptions(x, y, building) {
    window.isExpansionMode = true;
    highlightedCells = []; // Clear any previous highlighted cells

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newX = x + i;
            const newY = y + j;
            if (newX === x && newY === y) continue; // Skip the building's own cell

            const cellKey = `${newX},${newY}`;
            if (isValidExpansionCell(newX, newY)) {
                highlightedCells.push({ x: newX, y: newY, expandable: true });
            } else if (!isValidExpansionCell(newX, newY) && gameState.grid[cellKey]) { // Correct condition: not valid AND exists in the grid
                highlightedCells.push({ x: newX, y: newY, expandable: false});
            }
        }
    }

    addDirtyRect(0, 0, canvas.width, canvas.height);

    canvas.addEventListener('mousemove', handleExpansionMouseMove);
    canvas.addEventListener('click', handleExpansionClick);
}

function handleExpansionMouseMove(e) {
    if (!window.isExpansionMode) return;
    const { x, y } = getGridCoordinates(e.clientX, e.clientY);
    console.log('Expansion mouse move detected at', x, y);

    addDirtyRect(0, 0, canvas.width, canvas.height);
}

function handleExpansionClick(e) {
    if (!window.isExpansionMode) return;
    const { x, y } = getGridCoordinates(e.clientX, e.clientY);
    console.log('Expansion click detected at', x, y);

    if (isValidExpansionCell(x, y)) {
        console.log('Valid expansion clicked at', x, y);
        expandBuilding(x, y);
    }
    removeExpansionOptions();
}

function isValidExpansionCell(x, y) {
    return !gameState.grid[`${x},${y}`];
}

function removeExpansionOptions() {
    console.log('Removing expansion options');
    window.isExpansionMode = false;
    canvas.removeEventListener('mousemove', handleExpansionMouseMove);
    canvas.removeEventListener('click', handleExpansionClick);
    addDirtyRect(0, 0, canvas.width, canvas.height);
}

function showCellPopup(x, y, building) {
    console.log('showCellPopup called with:', x, y, building);
    
    const existingPopup = document.querySelector('.cell-popup');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }

    const popup = document.createElement('div');
    popup.classList.add('cell-popup');

    if (building) {
        console.log('Building data:', building);
        const buildingData = gameState.buildings_data[building.type];
        if (!buildingData) {
            console.error('Building data not found for type:', building.type);
            return;
        }
        
        const occupiedAccommodations = Array.isArray(building.accommodations) ? building.accommodations.flat().length : 0;
        const totalAccommodations = building.total_accommodations || 0;
        
        popup.innerHTML = `
            <button class="close-popup">✖️</button>
            <h3>${getBuildingEmoji(building.type)} ${buildingData.name}</h3>
            <p>🏆 Level: ${building.level}</p>
            ${building.is_built ? `
                <p>🏠 Accommodations: ${occupiedAccommodations} / ${totalAccommodations}</p>
                <p>👥 Population: ${occupiedAccommodations}</p>
                <p>👨‍👩‍👧‍👦 Max People per Accommodation: ${buildingData.max_people_per_accommodation}</p>
                <p>💰 Total Money Spent: $${building.spend_cost || 0}</p>
                <p>🔄 Expanded Cells: ${Array.isArray(building.expanded_cells) ? building.expanded_cells.length : 0} / ${buildingData.expansion_limit}</p>
            ` : `
                <p>🚧 Under Construction</p>
                <p>📊 Progress: ${Math.round((building.construction_progress || 0) * 100)}%</p>
            `}
        `;
    } else {
        popup.innerHTML = `
            <button class="close-popup">✖️</button>
            <p>🏞️ Empty cell (${x}, ${y})</p>
        `;
    }

    const { gridX, gridY } = getCanvasCoordinates(x, y);
    popup.style.left = `${gridX + gridSize * gridScale / 2}px`;
    popup.style.top = `${gridY + gridSize * gridScale / 2}px`;

    document.body.appendChild(popup);

    popup.querySelector('.close-popup').addEventListener('click', () => {
        document.body.removeChild(popup);
    });
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
            <h3>👋 New Citizen!</h3>
            <div style="text-align: right; font-size: 24px; color: ${genderColor};">${genderIcon}</div>
        </div>
        <div class="popup-content">
            <p>📛 Name: ${citizen.first_name} ${citizen.last_name}</p>
            <p>🎂 Age: ${age}</p>
            <p>💼 Previous Job: ${citizen.previous_job}</p>
            <p>🎵 Favorite Music: ${citizen.favorite_music}</p>
        </div>
        <div class="popup-footer">
            <button id="accept-citizen">✅ Accept</button>
            <button id="deny-citizen">❌ Deny</button>
        </div>
    `;

    document.body.appendChild(popup);
    currentCitizenPopup = popup;
    socket.emit('citizen_popup_displayed');

    const moveToAccommodationBtn = popup.querySelector('#move-to-accommodation');
    moveToAccommodationBtn.addEventListener('click', () => {
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
    if (!citizen) {
        console.error('Error: Citizen object is undefined or null');
        return;
    }
    if (!lastPlacedCitizen) {
        console.error('Error: No last placed citizen information available');
        return;
    }
    
    const buildingEntry = Object.entries(gameState.grid).find(([coords, building]) => 
        building.accommodations.some(acc => acc.some(c => c.id === citizen.id))
    );

    if (buildingEntry) {
        const [coords, building] = buildingEntry;
        const [x, y] = coords.split(',').map(Number);
        centerMapOnBuilding(x, y);
    } else {
        console.error('Error: Building not found for citizen');
    }
}

function centerMapOnBuilding(x, y) {
    gridOffsetX = canvas.width / 2 - x * gridSize * gridScale;
    gridOffsetY = canvas.height / 2 - y * gridSize * gridScale;
    addDirtyRect(0, 0, canvas.width, canvas.height);
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

function updateUI() {
    updateResourcesDisplay();
    updateTimeDisplay();
    updateTasksNotifications();
    addDirtyRect(0, 0, canvas.width, canvas.height);
}

const throttledUpdateUI = throttle(scheduleUIUpdate, 100);
