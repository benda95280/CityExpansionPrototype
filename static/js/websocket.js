let lastTickCount = 0;
let lastTickTime = Date.now();
let tickingSpeedBuffer = [];

function initWebSocket() {
    window.socket = io();
    
    window.socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    window.socket.on('game_state', (newState) => {
        console.log('Received game state update:', newState);
        Object.assign(window.gameState, newState);
        updateResourcesDisplay();
        updateTickingSpeedDisplay();
        updateTimeDisplay();
    });

    window.socket.on('new_citizen', (citizen) => {
        showNewCitizenPopup(citizen);
    });

    window.socket.on('citizen_placed', (data) => {
        lastPlacedCitizen = data;
        console.log('Citizen placed:', data);
    });

    window.socket.on('building_completed', (data) => {
        console.log(`Building completed at (${data.x}, ${data.y})`);
    });
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

// Export the initWebSocket function to make it available in other modules
export { initWebSocket };
