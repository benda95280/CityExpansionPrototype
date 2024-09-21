let socket;

function initWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('game_state', (newState) => {
        console.log('Received game state update:', newState);
        gameState = newState;
        updateResourcesDisplay();
        updateTickingSpeedDisplay();
        updateTimeDisplay();
    });

    socket.on('new_citizen', (citizen) => {
        showNewCitizenPopup(citizen);
    });

    socket.on('citizen_placed', (data) => {
        lastPlacedCitizen = data;
        console.log('Citizen placed:', data);
    });

    // Add this line to initialize building socket listeners
    initBuildingSocketListeners(socket);
}

function updateTickingSpeedDisplay() {
    document.getElementById('ticking-speed-value').textContent = `${gameState.ticking_speed} ticks/s`;
}
