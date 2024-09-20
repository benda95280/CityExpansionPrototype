let currentCitizenPopup = null;
let debugConsole;
let consoleInput;
let consoleOutput;
let lastPlacedCitizen = null;

let lastTickCount = 0;
let lastTickTime = Date.now();
let tickingSpeedBuffer = [];

function updateResourcesDisplay() {
    const population = Math.floor(gameState.population) || 0;
    const availableAccommodations = (gameState.total_accommodations - gameState.used_accommodations) || 0;
    const totalAccommodations = gameState.total_accommodations || 0;
    
    document.getElementById('population-value').textContent = `${population}`;
    document.getElementById('accommodations-value').textContent = `${availableAccommodations} / ${totalAccommodations}`;
    document.getElementById('money-value').textContent = `$${gameState.money}`;
    
    updateNotificationsAndTasks();
}

function updateNotificationsAndTasks() {
    document.getElementById('notifications-count').textContent = gameState.notifications || 0;
    document.getElementById('tasks-count').textContent = gameState.tasks || 0;
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

function updateTickingSpeedDisplay() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - lastTickTime) / 1000; // Convert to seconds

    if (elapsedTime >= 1) { // Calculate speed every second
        const ticksDelta = window.gameState.tick - lastTickCount;
        const tickingSpeed = ticksDelta / elapsedTime;
        
        // Add the current ticking speed to the buffer
        tickingSpeedBuffer.push(tickingSpeed);
        
        // Keep only the last 5 measurements
        if (tickingSpeedBuffer.length > 5) {
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

export { showBuildingMenu, updateResourcesDisplay, updateTickingSpeedDisplay, updateTimeDisplay };
