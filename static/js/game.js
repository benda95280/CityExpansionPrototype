let gameState = {
    grid: {},
    population: 0,
    money: 1000,
    tick: 0
};

let selectedBuilding = null;
let hoveredCell = null;
let initialMapPosition = { x: 0, y: 0 };
let isDirty = true;
let animationFrameId = null;
let dirtyRectangles = [];
let dirtyRectPool = [];
let hoverDirtyRect = null;

let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;
let fpsUpdateInterval = 500;

const buildingsCanvas = document.createElement('canvas');
const buildingsCtx = buildingsCanvas.getContext('2d');

let viewportX = 0;
let viewportY = 0;
let viewportWidth = 0;
let viewportHeight = 0;

let highlightedCells = [];

const PARTITION_SIZE = 10;
let buildingPartitions = {};

let hoverStateChanged = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    buildingsCanvas.width = canvas.width;
    buildingsCanvas.height = canvas.height;
    viewportWidth = canvas.width;
    viewportHeight = canvas.height;
    isDirty = true;
    addDirtyRect(0, 0, canvas.width, canvas.height);
}

function drawGame(timestamp) {
    fpsCounter++;
    if (timestamp - lastFpsUpdate >= fpsUpdateInterval) {
        currentFps = Math.round((fpsCounter / (timestamp - lastFpsUpdate)) * 1000);
        fpsCounter = 0;
        lastFpsUpdate = timestamp;
        document.getElementById('fps-counter').textContent = `FPS: ${currentFps}`;
    }
    
    if (isDirty || dirtyRectangles.length > 0) {
        ctx.save();

        ctx.beginPath();
        dirtyRectangles.forEach(rect => {
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
        });
        if (hoverDirtyRect) {
            ctx.rect(hoverDirtyRect.x, hoverDirtyRect.y, hoverDirtyRect.width, hoverDirtyRect.height);
        }
        ctx.clip();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawGridInViewport();
        drawBuildingsInViewport();
        if (window.isExpansionMode) {
            drawExpansionHighlights();
        }

        ctx.restore();

        isDirty = false;
        recycleDirtyRects();
    }

    drawHoveredCell();

    animationFrameId = requestAnimationFrame(drawGame);
}

function drawGridInViewport() {
    const startX = Math.floor((viewportX - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((viewportY - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((viewportX + viewportWidth - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((viewportY + viewportHeight - gridOffsetY) / (gridSize * gridScale)) + 1;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x++) {
        const canvasX = x * gridSize * gridScale + gridOffsetX - viewportX;
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
    }

    for (let y = startY; y <= endY; y++) {
        const canvasY = y * gridSize * gridScale + gridOffsetY - viewportY;
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvas.width, canvasY);
    }

    ctx.stroke();
}

function drawBuildingsInViewport() {
    buildingsCtx.clearRect(0, 0, buildingsCanvas.width, buildingsCanvas.height);
    const startX = Math.floor((viewportX - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((viewportY - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((viewportX + viewportWidth - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((viewportY + viewportHeight - gridOffsetY) / (gridSize * gridScale)) + 1;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            const building = gameState.grid[`${x},${y}`];
            if (building) {
                drawBuilding(x, y, building);
            }
        }
    }

    ctx.drawImage(buildingsCanvas, 0, 0);
}

function drawBuilding(x, y, building) {
    const { gridX, gridY } = getCanvasCoordinates(x, y);
    const buildingData = gameState.buildings_data[building.type];
    
    buildingsCtx.fillStyle = `rgb(${buildingData.color})`;
    buildingsCtx.fillRect(
        gridX - viewportX,
        gridY - viewportY,
        gridSize * gridScale,
        gridSize * gridScale
    );
    
    if (building.construction_progress < 1) {
        buildingsCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const progressHeight = (1 - building.construction_progress) * gridSize * gridScale;
        buildingsCtx.fillRect(
            gridX - viewportX,
            gridY - viewportY,
            gridSize * gridScale,
            progressHeight
        );
    }
    
    buildingsCtx.fillStyle = 'white';
    buildingsCtx.font = `${16 * gridScale}px Arial`;
    buildingsCtx.textAlign = 'center';
    buildingsCtx.textBaseline = 'middle';
    buildingsCtx.fillText(
        buildingData.emoji,
        gridX - viewportX + gridSize * gridScale / 2,
        gridY - viewportY + gridSize * gridScale / 2
    );
}

function drawHoveredCell() {
    if (hoveredCell) {
        const { gridX, gridY } = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            gridX - viewportX,
            gridY - viewportY,
            gridSize * gridScale,
            gridSize * gridScale
        );
    }
}

function drawExpansionHighlights() {
    ctx.save();
    ctx.globalAlpha = 0.5;

    const startX = Math.max(Math.floor((viewportX - gridOffsetX) / (gridSize * gridScale)) - 1, 0);
    const startY = Math.max(Math.floor((viewportY - gridOffsetY) / (gridSize * gridScale)) - 1, 0);
    const endX = Math.min(Math.ceil((viewportX + viewportWidth - gridOffsetX) / (gridSize * gridScale)) + 1, Math.ceil(canvas.width / (gridSize * gridScale)));
    const endY = Math.min(Math.ceil((viewportY + viewportHeight - gridOffsetY) / (gridSize * gridScale)) + 1, Math.ceil(canvas.height / (gridSize * gridScale)));

    highlightedCells.forEach(cell => {
        if (cell.x >= startX && cell.x <= endX && cell.y >= startY && cell.y <= endY) {
            const { gridX, gridY } = getCanvasCoordinates(cell.x, cell.y);
            ctx.fillStyle = cell.expandable ? 'rgba(0, 255, 0, 0.5)' : 'rgba(100, 100, 100, 0.5)';
            ctx.fillRect(gridX - viewportX, gridY - viewportY, gridSize * gridScale, gridSize * gridScale);

            if (cell.expandable) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2 * gridScale;
                ctx.strokeRect(gridX - viewportX, gridY - viewportY, gridSize * gridScale, gridSize * gridScale);
            }
        }
    });
    ctx.restore();
}

function addDirtyRect(x, y, width, height) {
    let rect = dirtyRectPool.pop() || {};
    rect.x = x;
    rect.y = y;
    rect.width = width;
    rect.height = height;
    dirtyRectangles.push(rect);
    isDirty = true;
}

function recycleDirtyRects() {
    dirtyRectPool.push(...dirtyRectangles);
    dirtyRectangles.length = 0;
}

function initGame() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('wheel', handleCanvasWheel);
    
    document.addEventListener('keydown', handleKeyDown);
    
    document.getElementById('zoom-in').addEventListener('click', () => updateGridScale(-1));
    document.getElementById('zoom-out').addEventListener('click', () => updateGridScale(1));
    document.getElementById('center-map').addEventListener('click', centerMap);
    
    initialMapPosition = { x: canvas.width / 2, y: canvas.height / 2 };
    gridOffsetX = initialMapPosition.x;
    gridOffsetY = initialMapPosition.y;
    
    initWebSocket();
    
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.style.position = 'fixed';
    fpsCounter.style.top = '10px';
    fpsCounter.style.left = '10px';
    fpsCounter.style.color = 'white';
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fpsCounter.style.padding = '5px';
    fpsCounter.style.borderRadius = '5px';
    document.body.appendChild(fpsCounter);

    buildingsCanvas.width = canvas.width;
    buildingsCanvas.height = canvas.height;

    drawGame();
}

function handleCanvasClick(event) {
    event.preventDefault();
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    const building = gameState.grid[`${x},${y}`];
    console.log(`Left-click on cell (${x}, ${y}), building: ${building ? building.type : 'empty'}`);
}

function handleCanvasRightClick(event) {
    event.preventDefault();
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    showBuildingMenu(event.clientX, event.clientY, x, y);
}

function handleCanvasMouseMove(event) {
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    const newHoveredCell = { x, y };

    if (!hoveredCell || hoveredCell.x !== newHoveredCell.x || hoveredCell.y !== newHoveredCell.y) {
        if (hoveredCell) {
            const { gridX: oldGridX, gridY: oldGridY } = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
            addDirtyRect(
                oldGridX - viewportX,
                oldGridY - viewportY,
                gridSize * gridScale,
                gridSize * gridScale
            );
        }
        
        hoveredCell = newHoveredCell;
        const { gridX, gridY } = getCanvasCoordinates(x, y);
        addDirtyRect(
            gridX - viewportX,
            gridY - viewportY,
            gridSize * gridScale,
            gridSize * gridScale
        );
    }
    
    const edgeThreshold = 3;
    if (Math.abs(x) > Math.abs(hoveredCell.x) - edgeThreshold || 
        Math.abs(y) > Math.abs(hoveredCell.y) - edgeThreshold) {
        generateNewCells(x, y);
    }
}

function handleCanvasWheel(event) {
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    updateGridScale(delta);
}

function centerMap() {
    gridOffsetX = initialMapPosition.x;
    gridOffsetY = initialMapPosition.y;
    addDirtyRect(0, 0, canvas.width, canvas.height);
}

function handleKeyDown(event) {
    const moveStep = 10;
    let moved = false;
    switch (event.key) {
        case 'ArrowUp':
            gridOffsetY += moveStep;
            moved = true;
            break;
        case 'ArrowDown':
            gridOffsetY -= moveStep;
            moved = true;
            break;
        case 'ArrowLeft':
            gridOffsetX += moveStep;
            moved = true;
            break;
        case 'ArrowRight':
            gridOffsetX -= moveStep;
            moved = true;
            break;
    }
    if (moved) {
        addDirtyRect(0, 0, canvas.width, canvas.height);
    }
}

function updateGridScale(delta) {
    const oldScale = gridScale;
    gridScale = Math.max(0.5, Math.min(2, gridScale - delta * 0.1));
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    gridOffsetX += (centerX - gridOffsetX) * (1 - gridScale / oldScale);
    gridOffsetY += (centerY - gridOffsetY) * (1 - gridScale / oldScale);
    
    addDirtyRect(0, 0, canvas.width, canvas.height);
}

function updateBuildingPartitions() {
    buildingPartitions = {};
    for (const [coords, building] of Object.entries(gameState.grid)) {
        const [x, y] = coords.split(',').map(Number);
        const px = Math.floor(x / PARTITION_SIZE);
        const py = Math.floor(y / PARTITION_SIZE);
        const partitionKey = `${px},${py}`;
        if (!buildingPartitions[partitionKey]) {
            buildingPartitions[partitionKey] = [];
        }
        buildingPartitions[partitionKey].push([x, y, building]);
    }
}

function showBuildingMenu(x, y, gridX, gridY) {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }

    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const existingBuilding = gameState.grid[`${gridX},${gridY}`];

    if (window.isExpansionMode) {
        if (isValidExpansionCell(gridX, gridY)) {
            const expandOption = document.createElement('div');
            expandOption.textContent = '🔄 Expand to this cell';
            expandOption.addEventListener('click', () => {
                expandBuilding(gridX, gridY);
                document.body.removeChild(menu);
            });
            menu.appendChild(expandOption);
        } else {
            const cancelOption = document.createElement('div');
            cancelOption.textContent = '❌ Cancel expansion';
            cancelOption.addEventListener('click', () => {
                removeExpansionOptions();
                document.body.removeChild(menu);
            });
            menu.appendChild(cancelOption);
        }
    } else if (existingBuilding) {
        const buildingData = existingBuilding && gameState.buildings_data[existingBuilding.type];
        if (!buildingData) {
            console.error('Building data not found for type:', existingBuilding.type);
            return;
        }
        
        const upgradeOption = document.createElement('div');
        upgradeOption.textContent = `🔧 Upgrade ${buildingData.name} ($${buildingData.upgrade_cost * existingBuilding.level})`;
        upgradeOption.addEventListener('click', () => {
            upgradeBuilding(gridX, gridY);
            document.body.removeChild(menu);
        });
        menu.appendChild(upgradeOption);

        if (existingBuilding.is_built && buildingData.expandable) {
            const currentExpansions = existingBuilding.expanded_cells ? existingBuilding.expanded_cells.length : 0;
            if (currentExpansions < buildingData.expansion_limit) {
                const expandOption = document.createElement('div');
                expandOption.textContent = `🔄 Expand (${currentExpansions}/${buildingData.expansion_limit})`;
                expandOption.addEventListener('click', () => {
                    console.log('Expand option clicked for building at', gridX, gridY);
                    showExpandOptions(gridX, gridY, existingBuilding);
                    document.body.removeChild(menu);
                });
                menu.appendChild(expandOption);
            }
        }

        const infoOption = document.createElement('div');
        infoOption.textContent = '📊 Show Info';
        infoOption.addEventListener('click', () => {
            showCellPopup(gridX, gridY, existingBuilding);
            document.body.removeChild(menu);
        });
        menu.appendChild(infoOption);
    } else {
        for (const [type, data] of Object.entries(gameState.buildings_data)) {
            const option = document.createElement('div');
            option.textContent = `${getBuildingEmoji(type)} ${data.name} ($${data.price})`;
            option.addEventListener('click', () => {
                placeBuilding(gridX, gridY, type);
                document.body.removeChild(menu);
            });
            menu.appendChild(option);
        }
    }

    document.body.appendChild(menu);

    document.addEventListener('click', removeMenu);
}

window.addEventListener('load', initGame);

function cleanUp() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

function initWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('game_state', (newState) => {
        gameState = newState;
        updateBuildingPartitions();
        throttledUpdateUI();
    });
}