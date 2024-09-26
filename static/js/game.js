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

// FPS counter variables
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// Off-screen canvas for buildings
const buildingsCanvas = document.createElement('canvas');
const buildingsCtx = buildingsCanvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    buildingsCanvas.width = canvas.width;
    buildingsCanvas.height = canvas.height;
    isDirty = true;
    dirtyRectangles = [{x: 0, y: 0, width: canvas.width, height: canvas.height}];
}

function drawGame(timestamp) {
    // Update FPS counter
    fpsCounter++;
    if (timestamp - lastFpsUpdate >= 1000) {
        currentFps = fpsCounter;
        fpsCounter = 0;
        lastFpsUpdate = timestamp;
        document.getElementById('fps-counter').textContent = `FPS: ${currentFps}`;
    }

    if (isDirty) {
        for (let rect of dirtyRectangles) {
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
            drawGridInRect(rect);
            drawBuildingsInRect(rect);
            drawHoveredCellInRect(rect);
        }
        isDirty = false;
        dirtyRectangles = [];
    }
    animationFrameId = requestAnimationFrame(drawGame);
}

function drawGridInRect(rect) {
    const startX = Math.floor((rect.x - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((rect.y - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((rect.x + rect.width - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((rect.y + rect.height - gridOffsetY) / (gridSize * gridScale)) + 1;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x++) {
        const canvasX = x * gridSize * gridScale + gridOffsetX;
        if (canvasX >= rect.x && canvasX <= rect.x + rect.width) {
            ctx.beginPath();
            ctx.moveTo(canvasX, rect.y);
            ctx.lineTo(canvasX, rect.y + rect.height);
            ctx.stroke();
        }
    }

    for (let y = startY; y <= endY; y++) {
        const canvasY = y * gridSize * gridScale + gridOffsetY;
        if (canvasY >= rect.y && canvasY <= rect.y + rect.height) {
            ctx.beginPath();
            ctx.moveTo(rect.x, canvasY);
            ctx.lineTo(rect.x + rect.width, canvasY);
            ctx.stroke();
        }
    }
}

function drawBuildingsInRect(rect) {
    for (const [coords, building] of Object.entries(gameState.grid)) {
        const [x, y] = coords.split(',').map(Number);
        const { gridX, gridY } = getCanvasCoordinates(x, y);
        if (rectContainsPoint(rect, gridX, gridY)) {
            drawBuilding(x, y, building);
        }
    }
}

function drawHoveredCellInRect(rect) {
    if (hoveredCell) {
        const { gridX, gridY } = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
        if (rectContainsPoint(rect, gridX, gridY)) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.strokeRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
        }
    }
}

function rectContainsPoint(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function addDirtyRect(x, y, width, height) {
    dirtyRectangles.push({x, y, width, height});
    isDirty = true;
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
    
    // Add FPS counter to the UI
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
    if (hoveredCell && (hoveredCell.x !== x || hoveredCell.y !== y)) {
        const oldCell = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
        addDirtyRect(oldCell.gridX - 2, oldCell.gridY - 2, gridSize * gridScale + 4, gridSize * gridScale + 4);
    }
    hoveredCell = { x, y };
    const newCell = getCanvasCoordinates(x, y);
    addDirtyRect(newCell.gridX - 2, newCell.gridY - 2, gridSize * gridScale + 4, gridSize * gridScale + 4);
    
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

window.addEventListener('load', initGame);

// Clean up function to cancel animation frame when needed
function cleanUp() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}
