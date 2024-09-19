const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gridSize = 40;
let gridOffsetX = 0;
let gridOffsetY = 0;
let gridScale = 1;
let isDragging = false;

let lastMouseX, lastMouseY;
let hoveredCell = null;

function drawGrid() {
    console.log('drawGrid function called');
    const startX = Math.floor(-gridOffsetX / (gridSize * gridScale)) - 1;
    const startY = Math.floor(-gridOffsetY / (gridSize * gridScale)) - 1;
    const endX = startX + Math.ceil(canvas.width / (gridSize * gridScale)) + 2;
    const endY = startY + Math.ceil(canvas.height / (gridSize * gridScale)) + 2;

    console.log(`Drawing grid from (${startX}, ${startY}) to (${endX}, ${endY})`);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
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

    console.log('Grid drawing completed');
}

function drawHoveredCell() {
    if (hoveredCell) {
        console.log('Drawing hovered cell:', hoveredCell);
        const { x, y } = hoveredCell;
        const canvasX = x * gridSize * gridScale + gridOffsetX;
        const canvasY = y * gridSize * gridScale + gridOffsetY;
        
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(canvasX, canvasY, gridSize * gridScale, gridSize * gridScale);
    }
}

function handleCanvasMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridX = Math.floor((mouseX - gridOffsetX) / (gridSize * gridScale));
    const gridY = Math.floor((mouseY - gridOffsetY) / (gridSize * gridScale));
    
    hoveredCell = { x: gridX, y: gridY };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
}

// Add event listener for window resize
window.addEventListener('resize', resizeCanvas);

// Initialize canvas size
resizeCanvas();

// Export functions
window.drawGrid = drawGrid;
window.drawHoveredCell = drawHoveredCell;
window.handleCanvasMouseMove = handleCanvasMouseMove;

console.log('grid.js loaded and functions exported');
