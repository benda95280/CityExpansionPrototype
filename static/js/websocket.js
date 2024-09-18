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
    });

    socket.on('new_citizen', (citizen) => {
        showNewCitizenPopup(citizen);
    });

    socket.on('citizen_placed', (data) => {
        const [x, y] = data.building.split(',').map(Number);
        centerMapOnBuilding(x, y);
    });
}

function updateTickingSpeedDisplay() {
    const tickingSpeed = Math.round(gameState.tick / (Date.now() - gameState.start_time) * 1000);
    document.getElementById('ticking-speed-value').textContent = `${tickingSpeed} ticks/s`;
}
