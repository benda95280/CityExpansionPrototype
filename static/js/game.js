let gameState = {
    grid: {},
    population: 0,
    money: 1000,
    tick: 0
};

let selectedBuilding = null;
let initialMapPosition = { x: 0, y: 0 };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
}

function drawGame() {
    console.log('drawGame function called');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
        drawGrid();
        console.log('drawGrid called successfully from drawGame');
    } catch (error) {
        console.error('Error in drawGrid:', error);
    }
    try {
        drawBuildings();
        console.log('drawBuildings called successfully from drawGame');
    } catch (error) {
        console.error('Error in drawBuildings:', error);
    }
    try {
        drawHoveredCell();
        console.log('drawHoveredCell called successfully from drawGame');
    } catch (error) {
        console.error('Error in drawHoveredCell:', error);
    }
    requestAnimationFrame(drawGame);
}

function initGame() {
    console.log('initGame function called');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', (event) => {
        drag(event);
        handleCanvasMouseMove(event);
    });
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick);
    canvas.addEventListener('wheel', handleCanvasWheel);
    
    document.addEventListener('keydown', handleKeyDown);
    
    document.getElementById('zoom-in').addEventListener('click', () => updateGridScale(-1));
    document.getElementById('zoom-out').addEventListener('click', () => updateGridScale(1));
    document.getElementById('center-map').addEventListener('click', centerMap);
    
    initialMapPosition = { x: canvas.width / 2, y: canvas.height / 2 };
    gridOffsetX = initialMapPosition.x;
    gridOffsetY = initialMapPosition.y;
    
    initWebSocket();
    
    console.log('Starting drawGame');
    drawGame();
    
    initDebugConsole();
}

window.addEventListener('load', initGame);

// Ensure all necessary functions are defined
if (typeof drawGrid === 'undefined') {
    console.error('drawGrid function is not defined');
}
if (typeof drawBuildings === 'undefined') {
    console.error('drawBuildings function is not defined');
}
if (typeof drawHoveredCell === 'undefined') {
    console.error('drawHoveredCell function is not defined');
}
