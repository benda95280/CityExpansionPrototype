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

// ... (rest of the file remains unchanged)
