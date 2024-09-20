import { updateResourcesDisplay, updateTickingSpeedDisplay, updateTimeDisplay, showNewCitizenPopup } from './ui.js';

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

// Export the initWebSocket function to make it available in other modules
export { initWebSocket };
