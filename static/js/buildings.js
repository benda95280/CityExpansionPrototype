const buildingsData = {
    house: {
        name: "House",
        price: 100,
        max_people: 5,
        upgrade_cost: 50,
        growth_rate: 0.1
    },
    apartment: {
        name: "Apartment",
        price: 500,
        max_people: 20,
        upgrade_cost: 250,
        growth_rate: 0.2
    },
    skyscraper: {
        name: "Skyscraper",
        price: 2000,
        max_people: 100,
        upgrade_cost: 1000,
        growth_rate: 0.5
    }
};

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

function placeRandomBuilding(x, y) {
    const buildingTypes = Object.keys(buildingsData);
    const randomType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    placeBuilding(x, y, randomType);
}
