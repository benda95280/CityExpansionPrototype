let gameState = {
    grid: {},
    population: 0,
    money: 1000,
    tick: 0
};

let selectedBuilding = null;
let hoveredCell = null;
let initialMapPosition = { x: 0, y: 0 };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawBuildings();
    drawHoveredCell();
}

function drawHighlights() {
    // This function is implied by the modified code but not defined
    // It should be implemented to draw any highlights on the canvas
}

function updateCanvas() {
    drawGame();
    drawHighlights();
    requestAnimationFrame(updateCanvas);
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
    
    optimizeCanvasRendering();
    updateCanvas();
    
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
    console.log("Right-click event triggered");
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    console.log(`Grid coordinates: (${x}, ${y})`);
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
}

function optimizeCanvasRendering() {
    // This function is implied by the modified code but not defined
    // It should be implemented to optimize the canvas rendering process
}

window.addEventListener('load', initGame);