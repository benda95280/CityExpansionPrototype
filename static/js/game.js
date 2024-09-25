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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawBuildings();
        drawHoveredCell();
        isDirty = false;
    }
    animationFrameId = requestAnimationFrame(drawGame);
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
    hoveredCell = { x, y };
    
    const edgeThreshold = 3;
    if (Math.abs(x) > Math.abs(hoveredCell.x) - edgeThreshold || 
        Math.abs(y) > Math.abs(hoveredCell.y) - edgeThreshold) {
        generateNewCells(x, y);
    }
    isDirty = true;
}

function drawHoveredCell() {
    if (hoveredCell) {
        const { gridX, gridY } = getCanvasCoordinates(hoveredCell.x, hoveredCell.y);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, gridSize * gridScale, gridSize * gridScale);
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
    isDirty = true;
}

function handleKeyDown(event) {
    const moveStep = 10;
    switch (event.key) {
        case 'ArrowUp':
            gridOffsetY += moveStep;
            break;
        case 'ArrowDown':
            gridOffsetY -= moveStep;
            break;
        case 'ArrowLeft':
            gridOffsetX += moveStep;
            break;
        case 'ArrowRight':
            gridOffsetX -= moveStep;
            break;
    }
    isDirty = true;
}

window.addEventListener('load', initGame);

// Clean up function to cancel animation frame when needed
function cleanUp() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}
