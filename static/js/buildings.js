function drawBuildings() {
    for (const [coords, building] of Object.entries(gameState.grid)) {
        if (building) {
            const [x, y] = coords.split(',').map(Number);
            drawBuilding(x, y, building);
        }
    }
}

function drawBuilding(x, y, building) {
    const { gridX, gridY } = getCanvasCoordinates(x, y);
    
    ctx.fillStyle = getBuildingColor(building.type);
    ctx.fillRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
    
    if (building.construction_progress < 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const progressHeight = (1 - building.construction_progress) * gridSize * gridScale;
        ctx.fillRect(gridX, gridY, gridSize * gridScale, progressHeight);
    }
    
    ctx.fillStyle = 'white';
    ctx.font = `${16 * gridScale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getBuildingEmoji(building.type), gridX + gridSize * gridScale / 2, gridY + gridSize * gridScale / 2);
    
    // Draw level indicator
    ctx.font = `${10 * gridScale}px Arial`;
    ctx.fillText(`${building.level}`, gridX + gridSize * gridScale - 10, gridY + gridSize * gridScale - 10);

    // Draw expanded cells
    if (building.expanded_cells) {
        for (const [expX, expY] of building.expanded_cells) {
            const { gridX: expGridX, gridY: expGridY } = getCanvasCoordinates(expX, expY);
            ctx.fillStyle = getBuildingColor(building.type, true);
            ctx.fillRect(expGridX, expGridY, gridSize * gridScale, gridSize * gridScale);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2 * gridScale;
            ctx.strokeRect(expGridX, expGridY, gridSize * gridScale, gridSize * gridScale);
        }
    }
}

function getBuildingColor(type, isExpanded = false) {
    const alpha = isExpanded ? '0.7' : '1';
    switch (type) {
        case 'house':
            return `rgba(76, 175, 80, ${alpha})`;
        case 'apartment':
            return `rgba(33, 150, 243, ${alpha})`;
        case 'skyscraper':
            return `rgba(156, 39, 176, ${alpha})`;
        default:
            return `rgba(117, 117, 117, ${alpha})`;
    }
}

function getBuildingEmoji(type) {
    switch (type) {
        case 'house':
            return '🏠';
        case 'apartment':
            return '🏢';
        case 'skyscraper':
            return '🏙️';
        default:
            return '🏗️';
    }
}

function placeBuilding(x, y, type) {
    socket.emit('place_building', { x, y, building_type: type });
}

function upgradeBuilding(x, y) {
    socket.emit('upgrade_building', { x, y });
}

function expandBuilding(x, y, newX, newY) {
    socket.emit('expand_building', { x, y, new_x: newX, new_y: newY });
}

function initBuildingSocketListeners(socket) {
    socket.on('building_completed', (data) => {
        console.log(`Building completed at (${data.x}, ${data.y})`);
    });

    socket.on('building_expanded', (data) => {
        console.log(`Building expanded from (${data.x}, ${data.y}) to (${data.new_x}, ${data.new_y})`);
    });

    socket.on('expansion_failed', (data) => {
        console.log(`Expansion failed: ${data.message}`);
    });
}
