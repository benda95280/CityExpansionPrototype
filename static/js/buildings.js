function drawBuildings() {
    for (const [coords, building] of Object.entries(gameState.grid)) {
        if (building) {
            const [x, y] = coords.split(',').map(Number);
            drawBuilding(x, y, building.type, building.level);
        }
    }
}

function drawBuilding(x, y, type, level) {
    const { gridX, gridY } = getCanvasCoordinates(x, y);
    
    ctx.fillStyle = getBuildingColor(type);
    ctx.fillRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
    
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
