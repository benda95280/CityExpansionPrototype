let socket;
let lastTickCount = 0;
let lastTickTime = Date.now();

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
}

function updateTickingSpeedDisplay() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - lastTickTime) / 1000; // Convert to seconds

    if (elapsedTime >= 5) { // Calculate speed every 5 seconds
        const ticksDelta = gameState.tick - lastTickCount;
        const tickingSpeed = Math.round(ticksDelta / elapsedTime);
        
        document.getElementById('ticking-speed-value').textContent = `${tickingSpeed} ticks/s`;
        
        lastTickCount = gameState.tick;
        lastTickTime = currentTime;
    }
}
