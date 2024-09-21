function drawBuildings() {
    for (const [coords, building] of Object.entries(gameState.grid)) {
        if (building) {
            const [x, y] = coords.split(',').map(Number);
            drawBuilding(x, y, building.type, building.level, building.construction_progress);
        }
    }
}

function drawBuilding(x, y, type, level, constructionProgress) {
    const { gridX, gridY } = getCanvasCoordinates(x, y);
    
    ctx.fillStyle = getBuildingColor(type);
    ctx.fillRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
    
    if (constructionProgress < 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const progressHeight = (1 - constructionProgress) * gridSize * gridScale;
        ctx.fillRect(gridX, gridY, gridSize * gridScale, progressHeight);
    }
    
    ctx.fillStyle = 'white';
    ctx.font = `${12 * gridScale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${type} (${level})`, gridX + gridSize * gridScale / 2, gridY + gridSize * gridScale / 2);
}

function getBuildingColor(type) {
    switch (type) {
        case 'house':
            return '#4CAF50';
        case 'apartment':
            return '#2196F3';
        case 'skyscraper':
            return '#9C27B0';
        default:
            return '#757575';
    }
}

function placeBuilding(x, y, type) {
    socket.emit('place_building', { x, y, building_type: type });
}

function upgradeBuilding(x, y) {
    socket.emit('upgrade_building', { x, y });
}

function initBuildingSocketListeners(socket) {
    socket.on('building_completed', (data) => {
        console.log(`Building completed at (${data.x}, ${data.y})`);
        // You can add additional logic here, such as updating UI elements or playing a sound
    });
}
