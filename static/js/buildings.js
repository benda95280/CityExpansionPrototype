function drawBuildings() {
    // This function is no longer needed as we're drawing buildings in the viewport
    // The functionahiglity has been moved to drawBuildingsInViewport() in game.js
}

function drawBuilding(x, y, building) {
    if (!building) {
        console.error(`Attempted to draw null building at (${x}, ${y})`);
        return;
    }

    const { gridX, gridY } = getCanvasCoordinates(x, y);
    const buildingData = gameState.buildings_data[building.type];
    
    if (!buildingData) {
        console.error(`Building data not found for type: ${building.type} at (${x}, ${y})`);
        return;
    }
    
    const canvasX = gridX - viewportX;
    const canvasY = gridY - viewportY;
    
    buildingsCtx.fillStyle = `rgba(${buildingData.color},${building.isExpanded ? '0.7' : '1'})`;
    buildingsCtx.fillRect(canvasX, canvasY, gridSize * gridScale, gridSize * gridScale);
    
    if (building.construction_progress < 1) {
        buildingsCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const progressHeight = (1 - building.construction_progress) * gridSize * gridScale;
        buildingsCtx.fillRect(canvasX, canvasY, gridSize * gridScale, progressHeight);
    }
    
    buildingsCtx.fillStyle = 'white';
    buildingsCtx.font = `${16 * gridScale}px Arial`;
    buildingsCtx.textAlign = 'center';
    buildingsCtx.textBaseline = 'middle';
    buildingsCtx.fillText(buildingData.emoji, canvasX + gridSize * gridScale / 2, canvasY + gridSize * gridScale / 2);
    
    buildingsCtx.font = `${10 * gridScale}px Arial`;
    buildingsCtx.fillText(`${building.level}`, canvasX + gridSize * gridScale - 10, canvasY + gridSize * gridScale - 10);

    if (building.expanded_cells) {
        for (const [expX, expY] of building.expanded_cells) {
            const { gridX: expGridX, gridY: expGridY } = getCanvasCoordinates(expX, expY);
            const expCanvasX = expGridX - viewportX;
            const expCanvasY = expGridY - viewportY;
            buildingsCtx.fillStyle = `rgba(${buildingData.color},0.7)`;
            buildingsCtx.fillRect(expCanvasX, expCanvasY, gridSize * gridScale, gridSize * gridScale);
            buildingsCtx.strokeStyle = 'white';
            buildingsCtx.lineWidth = 2 * gridScale;
            buildingsCtx.strokeRect(expCanvasX, expCanvasY, gridSize * gridScale, gridSize * gridScale);
        }
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
        addDirtyRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('building_expanded', (data) => {
        console.log(`Building expanded from (${data.x}, ${data.y}) to (${data.new_x}, ${data.new_y})`);
        addDirtyRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('expansion_failed', (data) => {
        console.log(`Expansion failed: ${data.message}`);
    });
}
