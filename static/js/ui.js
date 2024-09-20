let lastTickCount = 0;
let lastTickTime = Date.now();
let tickingSpeedBuffer = [];
const BUFFER_SIZE = 10;
const UPDATE_INTERVAL = 500; // Update every 500ms
import { getCanvasCoordinates, gridSize } from './grid.js';
import { placeBuilding, upgradeBuilding } from './buildings.js';

function updateResourcesDisplay() {
    const population = Math.floor(window.gameState.population) || 0;
    const availableAccommodations = (window.gameState.total_accommodations - window.gameState.used_accommodations) || 0;
    const totalAccommodations = window.gameState.total_accommodations || 0;
    
    document.getElementById('population-value').textContent = `${population}`;
    document.getElementById('accommodations-value').textContent = `${availableAccommodations} / ${totalAccommodations}`;
    document.getElementById('money-value').textContent = `$${window.gameState.money}`;
    
    updateNotificationsAndTasks();
}

function updateNotificationsAndTasks() {
    document.getElementById('notifications-count').textContent = window.gameState.notifications || 0;
    document.getElementById('tasks-count').textContent = window.gameState.tasks || 0;
}

function updateTimeDisplay() {
    const gameDate = new Date(window.gameState.current_date);
    const dateString = gameDate.toDateString();
    
    const totalMinutes = Math.floor(window.gameState.tick / 4);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    document.getElementById('date-value').textContent = dateString;
    document.getElementById('time-value').textContent = timeString;
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

    for (const [type, data] of Object.entries(window.gameState.buildings_data)) {
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

function updateTickingSpeedDisplay() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - lastTickTime) / 1000; // Convert to seconds

    if (elapsedTime >= UPDATE_INTERVAL / 1000) {
        const ticksDelta = window.gameState.tick - lastTickCount;
        const tickingSpeed = ticksDelta / elapsedTime;
        
        // Add the current ticking speed to the buffer
        tickingSpeedBuffer.push(tickingSpeed);
        
        // Keep only the last BUFFER_SIZE measurements
        if (tickingSpeedBuffer.length > BUFFER_SIZE) {
            tickingSpeedBuffer.shift();
        }
        
        // Calculate the average ticking speed
        const averageTickingSpeed = tickingSpeedBuffer.reduce((a, b) => a + b, 0) / tickingSpeedBuffer.length;
        
        // Update the display with a more precise representation
        const displaySpeed = averageTickingSpeed.toFixed(2);
        document.getElementById('ticking-speed-value').textContent = `${displaySpeed} ticks/s`;
        
        lastTickCount = window.gameState.tick;
        lastTickTime = currentTime;
    }
}

function showCellPopup(x, y, building) {
    const popup = document.createElement('div');
    popup.classList.add('cell-popup');

    if (building) {
        const buildingData = window.gameState.buildings_data[building.type];
        popup.innerHTML = `
            <h3>${buildingData.name}</h3>
            <p>Level: ${building.level}</p>
            <p>Construction Progress: ${(building.construction_progress * 100).toFixed(2)}%</p>
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

    document.addEventListener('click', removePopup);

    function removePopup(e) {
        if (!popup.contains(e.target)) {
            document.body.removeChild(popup);
            document.removeEventListener('click', removePopup);
        }
    }
}

// Set up an interval to update the ticking speed display
setInterval(updateTickingSpeedDisplay, UPDATE_INTERVAL);

export { showBuildingMenu, updateResourcesDisplay, updateTickingSpeedDisplay, updateTimeDisplay, showCellPopup };
