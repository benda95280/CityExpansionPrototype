import { initWebSocket } from './websocket.js';
import { startDrag, drag, endDrag, getGridCoordinates, generateNewCells } from './grid.js';
import { showBuildingMenu, updateResourcesDisplay, updateTickingSpeedDisplay, updateTimeDisplay } from './ui.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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
    requestAnimationFrame(drawGame);
}

function handleCanvasClick(event) {
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    const buildingId = gameState.grid[`${x},${y}`];
    const building = gameState.buildings[buildingId];
    showCellPopup(x, y, building);
}

function handleCanvasRightClick(event) {
    event.preventDefault();
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    showBuildingMenu(event.clientX, event.clientY, x, y);
}

function handleCanvasMouseMove(event) {
    const { x, y } = getGridCoordinates(event.clientX, event.clientY);
    hoveredCell = { x, y };
    
    // Check if near edge of current map
    const edgeThreshold = 3;
    if (Math.abs(x) > Math.abs(hoveredCell.x) - edgeThreshold || 
        Math.abs(y) > Math.abs(hoveredCell.y) - edgeThreshold) {
        generateNewCells(x, y);
    }
}

function initGame() {
    initWebSocket();
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    canvas.addEventListener('mousedown', (e) => startDrag(e));
    canvas.addEventListener('mousemove', (e) => drag(e));
    canvas.addEventListener('mouseup', () => endDrag());
    canvas.addEventListener('mouseleave', () => endDrag());
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
    
    drawGame();
}

window.addEventListener('load', initGame);

// Expose gameState to the global scope for other modules to access
window.gameState = gameState;
