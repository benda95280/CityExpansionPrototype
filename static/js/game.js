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

    if (isDirty || hoverStateChanged) {
        ctx.save();
        ctx.beginPath();
        dirtyRectangles.forEach(rect => {
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
        });
        ctx.clip();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGridInViewport();
        drawBuildingsInViewport();
        drawHoveredCell();
        if (window.isExpansionMode) {
            drawExpansionHighlights();
        }

        ctx.restore();

        isDirty = false;
        hoverStateChanged = false;
        recycleDirtyRects();
    } else {
        drawHoveredCell();
    }
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
    if (buildingsCanvas.width === 0 || buildingsCanvas.height === 0) {
        console.error('Buildings canvas has zero width or height');
        return;
    }

    buildingsCtx.clearRect(0, 0, buildingsCanvas.width, buildingsCanvas.height);
    const startX = Math.floor((viewportX - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((viewportY - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((viewportX + viewportWidth - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((viewportY + viewportHeight - gridOffsetY) / (gridSize * gridScale)) + 1;

    const partitionStartX = Math.floor(startX / PARTITION_SIZE);
    const partitionStartY = Math.floor(startY / PARTITION_SIZE);
    const partitionEndX = Math.ceil(endX / PARTITION_SIZE);
    const partitionEndY = Math.ceil(endY / PARTITION_SIZE);

    for (let px = partitionStartX; px <= partitionEndX; px++) {
        for (let py = partitionStartY; py <= partitionEndY; py++) {
            const partition = buildingPartitions[`${px},${py}`];
            if (partition) {
                for (const [x, y, building] of partition) {
                    if (x >= startX && x <= endX && y >= startY && y <= endY) {
                        drawBuilding(x, y, building);
                    }
                }
            }
        }
    }
    ctx.drawImage(buildingsCanvas, 0, 0);
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

    drawGame();
    
    initDebugConsole();
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
        hoveredCell = newHoveredCell;
        hoverStateChanged = true;
        isDirty = true;
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