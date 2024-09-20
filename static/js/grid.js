const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gridSize = 40;
let gridOffsetX = 0;
let gridOffsetY = 0;
let gridScale = 1;
let isDragging = false;

let lastMouseX, lastMouseY;

function drawGrid() {
    const startX = Math.floor(-gridOffsetX / (gridSize * gridScale)) - 1;
    const startY = Math.floor(-gridOffsetY / (gridSize * gridScale)) - 1;
    const endX = startX + Math.ceil(canvas.width / (gridSize * gridScale)) + 2;
    const endY = startY + Math.ceil(canvas.height / (gridSize * gridScale)) + 2;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    for (let x = startX; x < endX; x++) {
        const canvasX = x * gridSize * gridScale + gridOffsetX;
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < endY; y++) {
        const canvasY = y * gridSize * gridScale + gridOffsetY;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvas.width, canvasY);
        ctx.stroke();
    }
}

function generateNewCells(x, y) {
    const key = `${x},${y}`;
    if (!gameState.grid[key]) {
        gameState.grid[key] = null; // Empty cell
    }
}

function getGridCoordinates(canvasX, canvasY) {
    const x = Math.floor((canvasX - gridOffsetX) / (gridSize * gridScale));
    const y = Math.floor((canvasY - gridOffsetY) / (gridSize * gridScale));
    return { x, y };
}

function getCanvasCoordinates(gridX, gridY) {
    const x = gridX * gridSize * gridScale + gridOffsetX;
    const y = gridY * gridSize * gridScale + gridOffsetY;
    return { gridX: x, gridY: y };
}

function updateGridScale(delta) {
    const oldScale = gridScale;
    gridScale = Math.max(0.5, Math.min(2, gridScale - delta * 0.1));
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    gridOffsetX += (centerX - gridOffsetX) * (1 - gridScale / oldScale);
    gridOffsetY += (centerY - gridOffsetY) * (1 - gridScale / oldScale);
}

function startDrag(e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function drag(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    
    gridOffsetX += dx;
    gridOffsetY += dy;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function endDrag() {
    isDragging = false;
}

export { startDrag, drag, endDrag, getGridCoordinates, generateNewCells, updateGridScale, drawGrid };
