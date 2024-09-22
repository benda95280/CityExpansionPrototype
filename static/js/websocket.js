let socket;

function initWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('game_state', (newState) => {
        console.log('Received game state update:', newState);
        gameState = newState;
        updateUI();
    });

    socket.on('new_citizen', (citizen) => {
        showNewCitizenPopup(citizen);
    });

    socket.on('citizen_placed', (data) => {
        lastPlacedCitizen = data;
        console.log('Citizen placed:', data);
    });

    // Initialize building socket listeners
    initBuildingSocketListeners(socket);
}

function updateTickingSpeedDisplay() {
    const tickingSpeedElement = document.getElementById('ticking-speed-value');
    if (tickingSpeedElement && gameState.ticking_speed !== undefined) {
        tickingSpeedElement.textContent = `${gameState.ticking_speed} ticks/s`;
    } else {
        console.error('Error updating ticking speed display:', gameState.ticking_speed);
    }
}
