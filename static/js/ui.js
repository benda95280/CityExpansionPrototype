let currentCitizenPopup = null;
let debugConsole;
let consoleInput;
let consoleOutput;
let lastPlacedCitizen = null;

function updateResourcesDisplay() {
    const population = Math.floor(gameState.population) || 0;
    const availableAccommodations = gameState.grid ? Object.values(gameState.grid).reduce((sum, building) => {
        return building.is_built ? sum + (building.total_accommodations - building.accommodations.flat().length) : sum;
    }, 0) : 0;
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

    tasksList.innerHTML = '';
    notificationsList.innerHTML = '';

    if (gameState.tasks && gameState.tasks.tasks) {
        gameState.tasks.tasks.forEach(task => {
            if (!task.hidden) {
                const li = document.createElement('li');
                const taskName = document.createElement('span');
                taskName.textContent = task.name;
                
                const progressBar = document.createElement('div');
                progressBar.className = 'task-progress-bar';
                const progressFill = document.createElement('div');
                progressFill.className = 'task-progress-fill';
                progressFill.style.width = `${task.completion_percentage}%`;
                
                const progressText = document.createElement('span');
                progressText.className = 'task-progress-text';
                progressText.textContent = `${task.completion_percentage}%`;
                
                progressBar.appendChild(progressFill);
                progressBar.appendChild(progressText);
                
                li.appendChild(taskName);
                li.appendChild(progressBar);
                tasksList.appendChild(li);
            }
        });
    }

    if (gameState.notifications && gameState.notifications.notifications) {
        gameState.notifications.notifications.forEach((notification, index) => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            
            const messageSpan = document.createElement('span');
            messageSpan.textContent = notification.message;
            li.appendChild(messageSpan);
            
            const dismissButton = document.createElement('button');
            dismissButton.className = 'dismiss-notification';
            dismissButton.innerHTML = '<i class="fas fa-times"></i>';
            dismissButton.onclick = () => dismissNotification(index);
            li.appendChild(dismissButton);
            
            notificationsList.appendChild(li);
        });
    }
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
    console.log('showExpandOptions called for building at', x, y);
    const directions = [
        { dx: 0, dy: -1, name: 'North' },
        { dx: 1, dy: 0, name: 'East' },
        { dx: 0, dy: 1, name: 'South' },
        { dx: -1, dy: 0, name: 'West' }
    ];

    for (const dir of directions) {
        const newX = x + dir.dx;
        const newY = y + dir.dy;
        if (isValidExpansionCell(newX, newY)) {
            console.log('Valid expansion cell found at', newX, newY);
            highlightCell(newX, newY, 'rgba(0, 255, 0, 0.3)');
        }
    }

    canvas.addEventListener('click', handleExpansionClick);

    function handleExpansionClick(e) {
        const { x: clickX, y: clickY } = getGridCoordinates(e.clientX, e.clientY);
        console.log('Expansion click detected at', clickX, clickY);
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            if (clickX === newX && clickY === newY && isValidExpansionCell(newX, newY)) {
                console.log('Valid expansion clicked at', newX, newY);
                expandBuilding(x, y, newX, newY);
                removeExpandOptions();
                return;
            }
        }
        removeExpandOptions();
    }

    function removeExpandOptions() {
        console.log('Removing expand options');
        canvas.removeEventListener('click', handleExpansionClick);
        drawGame();
    }

    function isValidExpansionCell(x, y) {
        return !gameState.grid[`${x},${y}`];
    }

    function highlightCell(x, y, color) {
        const { gridX, gridY } = getCanvasCoordinates(x, y);
        ctx.fillStyle = color;
        ctx.fillRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
    }

    document.addEventListener('click', (e) => {
        if (e.target !== canvas) {
            removeExpandOptions();
        }
    }, { once: true });
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

function updateUI() {
    updateResourcesDisplay();
    updateTimeDisplay();
    updateTasksNotifications();
}