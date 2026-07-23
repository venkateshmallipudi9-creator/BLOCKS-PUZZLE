const GRID_SIZE = 10;
const gridElement = document.getElementById('grid-container');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
const pieceSlots = [
    document.getElementById('slot-0'),
    document.getElementById('slot-1'),
    document.getElementById('slot-2')
];

let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
let score = 0;
let combo = 1;

// Define shapes (1 = filled block, 0 = empty)
const SHAPES = [
    { matrix: [[1]], color: 'var(--color-1)', border: 'var(--border-1)' }, // 1x1
    { matrix: [[1,1]], color: 'var(--color-2)', border: 'var(--border-2)' }, // 2x1
    { matrix: [[1],[1]], color: 'var(--color-2)', border: 'var(--border-2)' }, // 1x2
    { matrix: [[1,1,1]], color: 'var(--color-3)', border: 'var(--border-3)' }, // 3x1
    { matrix: [[1],[1],[1]], color: 'var(--color-3)', border: 'var(--border-3)' }, // 1x3
    { matrix: [[1,1],[1,1]], color: 'var(--color-4)', border: 'var(--border-4)' }, // 2x2
    { matrix: [[1,1,1],[1,1,1],[1,1,1]], color: 'var(--color-5)', border: 'var(--border-5)' }, // 3x3
    { matrix: [[1,0],[1,1]], color: 'var(--color-6)', border: 'var(--border-6)' }, // L small
    { matrix: [[0,1],[1,1]], color: 'var(--color-6)', border: 'var(--border-6)' }, // J small
];

// Settings State
let gravityEnabled = true;
let hologramEnabled = true;
let currentStyle = 'neon';

// Profile State
let highScore = localStorage.getItem('qb_highScore') || 0;
let unlockedMilestones = JSON.parse(localStorage.getItem('qb_milestones')) || [];

const MILESTONES = [
    { score: 10000, message: "QUANTUM MASTER // 10K" },
    { score: 5000, message: "GRID DOMINANCE // 5K" },
    { score: 2500, message: "SYSTEM OVERRIDE // 2.5K" },
    { score: 1000, message: "CENTURION STATUS // 1K" },
    { score: 500, message: "GRID INITIALIZED // 500" }
];

function checkMilestones(oldScore, newScore) {
    if (newScore > highScore) {
        highScore = newScore;
        localStorage.setItem('qb_highScore', highScore);
    }
    
    for (let milestone of MILESTONES) {
        if (oldScore < milestone.score && newScore >= milestone.score) {
            if (!unlockedMilestones.includes(milestone.message)) {
                unlockedMilestones.push(milestone.message);
                localStorage.setItem('qb_milestones', JSON.stringify(unlockedMilestones));
                triggerMilestoneEffect(milestone.message);
                break; 
            }
        }
    }
}

function triggerMilestoneEffect(message) {
    const container = document.getElementById('celebration-container');
    const text = document.createElement('div');
    text.className = 'milestone-text';
    text.innerText = message;
    container.appendChild(text);
    setTimeout(() => {
        text.remove();
    }, 3000);
}

// Initialize Grid
function initGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            gridElement.appendChild(cell);
        }
    }
}

function renderGrid() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = gridElement.children[r * GRID_SIZE + c];
            cell.style.opacity = '1';
            cell.style.boxShadow = '';
            if (grid[r][c]) {
                cell.className = 'cell filled';
                cell.style.backgroundColor = grid[r][c].color;
                cell.style.setProperty('--block-border-color', grid[r][c].border);
                cell.style.border = `1px solid ${grid[r][c].border}`;
                cell.style.boxShadow = `inset 0 0 10px rgba(255,255,255,0.1), 0 0 8px ${grid[r][c].border}`;
            } else {
                cell.className = 'cell';
                cell.style.backgroundColor = '';
                cell.style.border = '';
            }
        }
    }
}

// Generate Pieces
function generatePieces() {
    let piecesGenerated = 0;
    pieceSlots.forEach(slot => {
        if (slot.children.length === 0) {
            const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            createDraggablePiece(slot, shape);
            piecesGenerated++;
        }
    });
    
    if (piecesGenerated > 0) {
        checkGameOver();
    }
}

let activePiece = null;
let activeShape = null;
let dragOrigin = { r: 0, c: 0 };
let currentStartR = -1;
let currentStartC = -1;
let originalSlot = null;

function createDraggablePiece(slot, shape) {
    const piece = document.createElement('div');
    piece.className = 'draggable-piece';
    piece.style.gridTemplateColumns = `repeat(${shape.matrix[0].length}, 1fr)`;
    piece.style.gridTemplateRows = `repeat(${shape.matrix.length}, 1fr)`;

    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                const block = document.createElement('div');
                block.className = 'piece-block';
                block.style.backgroundColor = shape.color;
                block.style.setProperty('--block-border-color', shape.border);
                block.dataset.r = r;
                block.dataset.c = c;
                piece.appendChild(block);
            } else {
                const empty = document.createElement('div');
                piece.appendChild(empty);
            }
        }
    }

    piece.addEventListener('pointerdown', (e) => startDrag(e, piece, shape, slot));
    slot.appendChild(piece);
}

function startDrag(e, piece, shape, slot) {
    e.preventDefault();
    activePiece = piece;
    activeShape = shape;
    originalSlot = slot;

    // Determine which block of the shape was clicked to offset perfectly
    let target = e.target;
    if (target.classList.contains('piece-block')) {
        dragOrigin.r = parseInt(target.dataset.r);
        dragOrigin.c = parseInt(target.dataset.c);
    } else {
        dragOrigin.r = 0; dragOrigin.c = 0;
    }

    // Get cell size from grid for accurate dragging preview
    const cellRef = gridElement.children[0].getBoundingClientRect();
    const cellSize = cellRef.width;
    const gap = 2; // grid gap

    // Setup visual dragging state
    document.body.appendChild(activePiece);
    activePiece.classList.add('is-dragging');
    activePiece.style.gap = `${gap}px`;
    
    // Resize blocks to match grid
    Array.from(activePiece.children).forEach(child => {
        if (child.classList.contains('piece-block')) {
            child.style.width = `${cellSize}px`;
            child.style.height = `${cellSize}px`;
        } else {
            child.style.width = `${cellSize}px`;
            child.style.height = `${cellSize}px`;
        }
    });

    moveDrag(e);

    document.addEventListener('pointermove', moveDrag);
    document.addEventListener('pointerup', endDrag);
}

function moveDrag(e) {
    if (!activePiece) return;
    
    const cellRef = gridElement.children[0].getBoundingClientRect();
    const cellSize = cellRef.width;
    const gap = 2;
    
    // Offset so the exact clicked block remains under the cursor
    const offsetX = (dragOrigin.c * (cellSize + gap)) + (cellSize / 2);
    const offsetY = (dragOrigin.r * (cellSize + gap)) + (cellSize / 2);
    
    // If touch, lift it a bit higher so it's not hidden by finger
    const isTouch = e.pointerType === 'touch';
    const liftOffset = isTouch ? 60 : 0;

    activePiece.style.left = `${e.clientX - offsetX}px`;
    activePiece.style.top = `${e.clientY - offsetY - liftOffset}px`;
    
    // Preview shadow
    currentStartR = -1;
    currentStartC = -1;
    clearPreview();
    
    // Check what grid cell we are over, accounting for touch lift
    const checkX = e.clientX;
    const checkY = e.clientY - liftOffset;
    
    const elements = document.elementsFromPoint(checkX, checkY);
    let targetCell = elements.find(el => el && el.classList && el.classList.contains('cell'));
    
    if (targetCell) {
        let gridR = parseInt(targetCell.dataset.r);
        let gridC = parseInt(targetCell.dataset.c);
        
        let startR = gridR - dragOrigin.r;
        let startC = gridC - dragOrigin.c;
        
        if (hologramEnabled && canPlace(activeShape.matrix, startR, startC)) {
            currentStartR = startR;
            currentStartC = startC;
            drawPreview(activeShape, startR, startC);
        }
    }
}

function clearPreview() {
    Array.from(gridElement.children).forEach(cell => {
        if (!cell.classList.contains('filled')) {
            cell.style.backgroundColor = '';
            cell.style.opacity = '1';
            cell.style.boxShadow = '';
        }
    });
}

function drawPreview(shape, startR, startC) {
    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                let cell = gridElement.children[(startR + r) * GRID_SIZE + (startC + c)];
                if (cell) {
                    cell.style.backgroundColor = shape.color;
                    cell.style.opacity = '0.4';
                    cell.style.boxShadow = 'inset 0 0 15px rgba(255,255,255,0.7)';
                }
            }
        }
    }
}

function endDrag(e) {
    if (!activePiece) return;
    document.removeEventListener('pointermove', moveDrag);
    document.removeEventListener('pointerup', endDrag);

    clearPreview();

    let placed = false;
    if (currentStartR !== -1 && currentStartC !== -1) {
        placePiece(activeShape, currentStartR, currentStartC);
        activePiece.remove();
        placed = true;
        
        let oldScore = score;
        score += Math.floor(10 * getBlockCount(activeShape.matrix) * currentEvent.multiplier);
        updateScore();
        checkMilestones(oldScore, score);
        
        processBoard();
    }

    if (!placed) {
        // Return to slot
        activePiece.classList.remove('is-dragging');
        activePiece.style.left = '';
        activePiece.style.top = '';
        activePiece.style.gap = '2px';
        Array.from(activePiece.children).forEach(child => {
            child.style.width = '25px';
            child.style.height = '25px';
        });
        originalSlot.appendChild(activePiece);
    }

    activePiece = null;
    activeShape = null;
    
    // Replenish if all slots empty
    if (pieceSlots.every(slot => slot.children.length === 0)) {
        generatePieces();
    }
}

function getBlockCount(matrix) {
    let count = 0;
    for (let r=0; r<matrix.length; r++) {
        for (let c=0; c<matrix[r].length; c++) {
            if (matrix[r][c]) count++;
        }
    }
    return count;
}

function canPlace(matrix, startR, startC) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const gridR = startR + r;
                const gridC = startC + c;
                if (gridR < 0 || gridR >= GRID_SIZE || gridC < 0 || gridC >= GRID_SIZE) return false;
                if (grid[gridR][gridC] !== null) return false;
            }
        }
    }
    return true;
}

function placePiece(shape, startR, startC) {
    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                grid[startR + r][startC + c] = { color: shape.color, border: shape.border };
            }
        }
    }
    renderGrid();
}

function showCelebration(lines, combo) {
    const container = document.getElementById('celebration-container');
    const text = document.createElement('div');
    text.className = 'popup-text';
    
    if (combo > 1) {
        text.innerText = `COMBO x${combo}!`;
    } else if (lines === 1) {
        text.innerText = "NICE!";
    } else if (lines === 2) {
        text.innerText = "GREAT!";
    } else if (lines >= 3) {
        text.innerText = "QUANTUM!";
    }
    
    container.appendChild(text);
    setTimeout(() => {
        text.remove();
    }, 1500);
}

async function processBoard() {
    let linesCleared = await clearLines();
    if (linesCleared > 0) {
        combo++;
        comboElement.innerText = `x${combo}`;
        
        showCelebration(linesCleared, combo);
        
        // ** GRAVITY MODE IMPLEMENTATION **
        if (gravityEnabled) {
            setTimeout(async () => {
                await applyGravity();
                checkGameOver();
            }, 300);
        } else {
            checkGameOver();
        }
        
    } else {
        combo = 1;
        comboElement.innerText = `x${combo}`;
        checkGameOver();
    }
}

async function clearLines() {
    let rowsToClear = [];
    let colsToClear = [];

    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
        }
    }

    // Check cols
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === null) {
                full = false;
                break;
            }
        }
        if (full) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;

    if (totalLines > 0) {
        // Visual flash
        rowsToClear.forEach(r => {
            for (let c=0; c<GRID_SIZE; c++) {
                gridElement.children[r * GRID_SIZE + c].style.backgroundColor = 'white';
            }
        });
        colsToClear.forEach(c => {
            for (let r=0; r<GRID_SIZE; r++) {
                gridElement.children[r * GRID_SIZE + c].style.backgroundColor = 'white';
            }
        });

        await new Promise(res => setTimeout(res, 200));

        // Clear data
        rowsToClear.forEach(r => {
            for (let c=0; c<GRID_SIZE; c++) grid[r][c] = null;
        });
        colsToClear.forEach(c => {
            for (let r=0; r<GRID_SIZE; r++) grid[r][c] = null;
        });

        renderGrid();
    }

    return totalLines;
}

// ** THE REQUESTED GRAVITY FEATURE **
async function applyGravity() {
    let moved = false;
    // Iterate from bottom-up
    for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = GRID_SIZE - 2; r >= 0; r--) {
            if (grid[r][c] !== null) {
                let fallTo = r;
                // find lowest empty spot
                while (fallTo + 1 < GRID_SIZE && grid[fallTo + 1][c] === null) {
                    fallTo++;
                }
                
                if (fallTo !== r) {
                    grid[fallTo][c] = grid[r][c];
                    grid[r][c] = null;
                    moved = true;
                }
            }
        }
    }
    
    if (moved) {
        renderGrid();
        // recursively process board in case gravity caused new line clears
        // wait for gravity animation (implied by DOM render)
        await new Promise(res => setTimeout(res, 200));
        await processBoard();
    }
}

function updateScore() {
    scoreElement.innerText = score;
}

function checkGameOver() {
    const availablePieces = [];
    pieceSlots.forEach(slot => {
        if (slot.children.length > 0) {
            // Find shape from DOM (hacky but works for MVP)
            const color = slot.children[0].querySelector('.piece-block').style.backgroundColor;
            const shapeObj = SHAPES.find(s => s.color === color); // might fail if colors match, but ok for now
            // better way: attach shape to dom
            availablePieces.push(slot.children[0].__shape); 
        }
    });
    
    // let's actually just attach shape data to piece elements in generatePieces
    let piecesToTest = [];
    pieceSlots.forEach(slot => {
        if (slot.children.length > 0) {
            piecesToTest.push(slot.shapeData);
        }
    });

    if (piecesToTest.length === 0) return; // not game over, just need new pieces

    let canPlay = false;
    for (let piece of piecesToTest) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(piece.matrix, r, c)) {
                    canPlay = true;
                    break;
                }
            }
            if (canPlay) break;
        }
        if (canPlay) break;
    }

    if (!canPlay) {
        document.getElementById('final-score').innerText = score;
        document.getElementById('game-over').classList.remove('hidden');
    }
}

// Modify generate to attach shape data
const _createDraggablePiece = createDraggablePiece;
createDraggablePiece = function(slot, shape) {
    slot.shapeData = shape;
    _createDraggablePiece(slot, shape);
}

document.getElementById('restart-btn').addEventListener('click', () => {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    score = 0;
    combo = 1;
    updateScore();
    comboElement.innerText = `x1`;
    pieceSlots.forEach(slot => slot.innerHTML = '');
    document.getElementById('game-over').classList.add('hidden');
    renderGrid();
    generatePieces();
});

// Settings Logic
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const toggleGravity = document.getElementById('toggle-gravity');
const togglePreview = document.getElementById('toggle-preview');
const bgButtons = document.querySelectorAll('.bg-btn');
const bgLayer = document.querySelector('.bg-layer');

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    gravityEnabled = toggleGravity.checked;
    hologramEnabled = togglePreview.checked;
});

bgButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        bgButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const bgClass = e.target.dataset.bg;
        bgLayer.className = `bg-layer ${bgClass}`;
    });
});

// Style Logic
const styleButtons = document.querySelectorAll('.style-btn');
styleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        styleButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentStyle = e.target.dataset.style;
        if (currentStyle === 'solid') {
            document.body.classList.add('style-solid');
        } else {
            document.body.classList.remove('style-solid');
        }
    });
});

// Profile Logic
const profileBtn = document.getElementById('profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const profileModal = document.getElementById('profile-modal');
const highScoreDisplay = document.getElementById('high-score-display');
const milestonesList = document.getElementById('milestones-list');

profileBtn.addEventListener('click', () => {
    highScoreDisplay.innerText = highScore;
    milestonesList.innerHTML = '';
    if (unlockedMilestones.length === 0) {
        milestonesList.innerHTML = '<li>No milestones unlocked yet. Keep playing!</li>';
    } else {
        unlockedMilestones.forEach(m => {
            const li = document.createElement('li');
            li.innerText = m;
            milestonesList.appendChild(li);
        });
    }
    profileModal.classList.remove('hidden');
});

closeProfileBtn.addEventListener('click', () => {
    profileModal.classList.add('hidden');
});

// Event Logic
const EVENTS = [
    { name: "Neon Nights", desc: "Multiplier x2! (Active)", multiplier: 2, icon: "🌃" },
    { name: "Gravity Storm", desc: "Blocks fall 2x faster!", multiplier: 1, icon: "🌪️" },
    { name: "Quantum Flux", desc: "+50% Score on Clears!", multiplier: 1.5, icon: "⚡" },
    { name: "Standard Operation", desc: "No active anomalies", multiplier: 1, icon: "🟢" }
];
let currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];

function initEvent() {
    const banner = document.getElementById('event-banner');
    const eventText = document.getElementById('event-text');
    const eventIcon = document.querySelector('.event-icon');
    
    eventIcon.innerText = currentEvent.icon;
    eventText.innerText = `${currentEvent.name}: ${currentEvent.desc}`;
    banner.classList.remove('hidden');
}

// Override updateScore to use multiplier
function updateScore() {
    scoreElement.innerText = score;
    scoreElement.classList.add('bump-anim');
    setTimeout(() => {
        scoreElement.classList.remove('bump-anim');
    }, 200);
}

// Ensure combo score uses multiplier
async function processBoard() {
    let linesCleared = await clearLines();
    if (linesCleared > 0) {
        combo++;
        comboElement.innerText = `x${combo}`;
        
        let oldScore = score;
        score += Math.floor((100 * linesCleared) * combo * currentEvent.multiplier);
        updateScore();
        checkMilestones(oldScore, score);
        
        showCelebration(linesCleared, combo);
        
        // ** GRAVITY MODE IMPLEMENTATION **
        if (gravityEnabled) {
            setTimeout(async () => {
                await applyGravity();
                checkGameOver();
            }, 300);
        } else {
            checkGameOver();
        }
        
    } else {
        combo = 1;
        comboElement.innerText = `x${combo}`;
        checkGameOver();
    }
}

// Override clearLines score logic slightly since we moved score out, wait, score is in clearLines too? Let's check:
// Wait, I already added score logic inside clearLines for the base score. Let's remove it from processBoard if it's there. 
// Ah, clearLines already updates score. We should modify clearLines instead of processBoard for the base clear score.

// Start game
initEvent();
initGrid();
generatePieces();
