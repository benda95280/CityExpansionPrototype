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
let fpsUpdateInterval = 500; // Update FPS every 500ms instead of every frame

// Off-screen canvas for buildings
const buildingsCanvas = document.createElement('canvas');
const buildingsCtx = buildingsCanvas.getContext('2d');

// Viewport variables
let viewportX = 0;
let viewportY = 0;
let viewportWidth = 0;
let viewportHeight = 0;

// Variables for expansion mode
let highlightedCells = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    buildingsCanvas.width = canvas.width;
    buildingsCanvas.height = canvas.height;
    viewportWidth = canvas.width;
    viewportHeight = canvas.height;
    isDirty = true;
    dirtyRectangles = [{x: 0, y: 0, width: canvas.width, height: canvas.height}];
}

function drawGame(timestamp) {
    // Update FPS counter
    fpsCounter++;
    if (timestamp - lastFpsUpdate >= fpsUpdateInterval) {
        currentFps = Math.round((fpsCounter / (timestamp - lastFpsUpdate)) * 1000);
        fpsCounter = 0;
        lastFpsUpdate = timestamp;
        document.getElementById('fps-counter').textContent = `FPS: ${currentFps}`;
    }

    if (isDirty) {
        ctx.save();
        dirtyRectangles.forEach(rect => {
            ctx.beginPath();
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
            ctx.clip();

            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
            drawGridInViewport(rect);
            drawBuildingsInViewport(rect);
            drawHoveredCell(rect);
            if (window.isExpansionMode) {
                drawExpansionHighlights(rect);
            }
        });
        ctx.restore();

        isDirty = false;
        dirtyRectangles = [];
    }
    animationFrameId = requestAnimationFrame(drawGame);
}

function drawGridInViewport(rect) {
    const startX = Math.floor((Math.max(viewportX, rect.x) - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((Math.max(viewportY, rect.y) - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((Math.min(viewportX + viewportWidth, rect.x + rect.width) - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((Math.min(viewportY + viewportHeight, rect.y + rect.height) - gridOffsetY) / (gridSize * gridScale)) + 1;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x++) {
        const canvasX = x * gridSize * gridScale + gridOffsetX - viewportX;
        ctx.beginPath();
        ctx.moveTo(canvasX, rect.y);
        ctx.lineTo(canvasX, rect.y + rect.height);
        ctx.stroke();
    }

    for (let y = startY; y <= endY; y++) {
        const canvasY = y * gridSize * gridScale + gridOffsetY - viewportY;
        ctx.beginPath();
        ctx.moveTo(rect.x, canvasY);
        ctx.lineTo(rect.x + rect.width, canvasY);
        ctx.stroke();
    }
}

function drawBuildingsInViewport(rect) {
    buildingsCtx.clearRect(rect.x, rect.y, rect.width, rect.height);
    const startX = Math.floor((Math.max(viewportX, rect.x) - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((Math.max(viewportY, rect.y) - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((Math.min(viewportX + viewportWidth, rect.x + rect.width) - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((Math.min(viewportY + viewportHeight, rect.y + rect.height) - gridOffsetY) / (gridSize * gridScale)) + 1;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            const building = gameState.grid[`${x},${y}`];
            if (building) {
                drawBuilding(x, y, building);
            }
        }
    }
    ctx.drawImage(buildingsCanvas, rect.x, rect.y, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height);
}

function drawHoveredCell(rect) {
    if (hoveredCell) {
        const { gridX, gridY } = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
        if (gridX >= rect.x && gridX < rect.x + rect.width && gridY >= rect.y && gridY < rect.y + rect.height) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.strokeRect(gridX - viewportX, gridY - viewportY, gridSize * gridScale, gridSize * gridScale);
        }
    }
}

function drawExpansionHighlights(rect) {
    ctx.save();
    ctx.globalAlpha = 0.5;

    const startX = Math.floor((Math.max(viewportX, rect.x) - gridOffsetX) / (gridSize * gridScale)) - 1;
    const startY = Math.floor((Math.max(viewportY, rect.y) - gridOffsetY) / (gridSize * gridScale)) - 1;
    const endX = Math.ceil((Math.min(viewportX + viewportWidth, rect.x + rect.width) - gridOffsetX) / (gridSize * gridScale)) + 1;
    const endY = Math.ceil((Math.min(viewportY + viewportHeight, rect.y + rect.height) - gridOffsetY) / (gridSize * gridScale)) + 1;

    highlightedCells.forEach(cell => {
        if (cell.x >= startX && cell.x <= endX && cell.y >= startY && cell.y <= endY) {
            const { gridX, gridY } = getCanvasCoordinates(cell.x, cell.y);
            if (gridX >= rect.x && gridX < rect.x + rect.width && gridY >= rect.y && gridY < rect.y + rect.height) {
                ctx.fillStyle = cell.expandable ? 'rgba(0, 255, 0, 0.5)' : 'rgba(100, 100, 100, 0.5)';
                ctx.fillRect(gridX - viewportX, gridY - viewportY, gridSize * gridScale, gridSize * gridScale);

                if (cell.expandable) {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2 * gridScale;
                    ctx.strokeRect(gridX - viewportX, gridY - viewportY, gridSize * gridScale, gridSize * gridScale);
                }
            }
        }
    });
    ctx.restore();
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
        addDirtyRect(hoveredCell.x * gridSize * gridScale + gridOffsetX - viewportX,
                     hoveredCell.y * gridSize * gridScale + gridOffsetY - viewportY,
                     gridSize * gridScale,
                     gridSize * gridScale);
    }
    hoveredCell = { x, y };
    addDirtyRect(x * gridSize * gridScale + gridOffsetX - viewportX,
                 y * gridSize * gridScale + gridOffsetY - viewportY,
                 gridSize * gridScale,
                 gridSize * gridScale);
    
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

function cleanUp() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}
