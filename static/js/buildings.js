function drawBuildings() {
    buildingsCtx.clearRect(0, 0, buildingsCanvas.width, buildingsCanvas.height);
    for (const [coords, building] of Object.entries(gameState.grid)) {
        if (building) {
            const [x, y] = coords.split(',').map(Number);
            drawBuilding(x, y, building);
        }
    }
    ctx.drawImage(buildingsCanvas, 0, 0);
}

function drawBuilding(x, y, building) {
    const { gridX, gridY } = getCanvasCoordinates(x, y);
    
    buildingsCtx.fillStyle = getBuildingColor(building.type);
    buildingsCtx.fillRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
    
    if (building.construction_progress < 1) {
        buildingsCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const progressHeight = (1 - building.construction_progress) * gridSize * gridScale;
        buildingsCtx.fillRect(gridX, gridY, gridSize * gridScale, progressHeight);
    }
    
    buildingsCtx.fillStyle = 'white';
    buildingsCtx.font = `${16 * gridScale}px Arial`;
    buildingsCtx.textAlign = 'center';
    buildingsCtx.textBaseline = 'middle';
    buildingsCtx.fillText(getBuildingEmoji(building.type), gridX + gridSize * gridScale / 2, gridY + gridSize * gridScale / 2);
    
    buildingsCtx.font = `${10 * gridScale}px Arial`;
    buildingsCtx.fillText(`${building.level}`, gridX + gridSize * gridScale - 10, gridY + gridSize * gridScale - 10);

    if (building.expanded_cells) {
        for (const [expX, expY] of building.expanded_cells) {
            const { gridX: expGridX, gridY: expGridY } = getCanvasCoordinates(expX, expY);
            buildingsCtx.fillStyle = getBuildingColor(building.type, true);
            buildingsCtx.fillRect(expGridX, expGridY, gridSize * gridScale, gridSize * gridScale);
            buildingsCtx.strokeStyle = 'white';
            buildingsCtx.lineWidth = 2 * gridScale;
            buildingsCtx.strokeRect(expGridX, expGridY, gridSize * gridScale, gridSize * gridScale);
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
    if (isValidExpansionCell(newX, newY) && isAdjacentCell(x, y, newX, newY)) {
        socket.emit('expand_building', { x, y, new_x: newX, new_y: newY });
    } else {
        console.log('Invalid expansion: cell is not empty or not adjacent');
    }
}

function isValidExpansionCell(x, y) {
    return !gameState.grid[`${x},${y}`];
}

function isAdjacentCell(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

function initBuildingSocketListeners(socket) {
    socket.on('building_completed', (data) => {
        console.log(`Building completed at (${data.x}, ${data.y})`);
        isDirty = true;
    });

    socket.on('building_expanded', (data) => {
        console.log(`Building expanded from (${data.x}, ${data.y}) to (${data.new_x}, ${data.new_y})`);
        isDirty = true;
    });

    socket.on('expansion_failed', (data) => {
        console.log(`Expansion failed: ${data.message}`);
    });
}
