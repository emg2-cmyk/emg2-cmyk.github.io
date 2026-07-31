document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // --- 1. WATER CLICKER GAME & 20 UPGRADES ---
    // ==========================================
    let bottles = 0;
    let clickPower = 1;
    let autoRate = 0;

    const upgrades = [
        { name: "Extra Sips", cost: 15, power: 1, type: "click" },
        { name: "Water Dispenser", cost: 50, power: 1, type: "auto" },
        { name: "Stronger Grip", cost: 150, power: 5, type: "click" },
        { name: "Water Cooler", cost: 300, power: 5, type: "auto" },
        { name: "Hydration Pack", cost: 800, power: 15, type: "click" },
        { name: "Delivery Truck", cost: 1500, power: 20, type: "auto" },
        { name: "Water Tower", cost: 4000, power: 50, type: "auto" },
        { name: "Filtration Plant", cost: 9000, power: 100, type: "auto" },
        { name: "Bottling Factory", cost: 20000, power: 250, type: "auto" },
        { name: "Rain Maker", cost: 50000, power: 500, type: "auto" },
        { name: "Hydro Dam", cost: 120000, power: 1000, type: "auto" },
        { name: "Glacier Harvester", cost: 300000, power: 2500, type: "auto" },
        { name: "Ocean Desalination", cost: 750000, power: 5000, type: "auto" },
        { name: "Cloud Seeder", cost: 1800000, power: 10000, type: "auto" },
        { name: "Aqua Satellite", cost: 4500000, power: 25000, type: "auto" },
        { name: "Comet Water Miner", cost: 10000000, power: 50000, type: "auto" },
        { name: "Planetary Aquifer", cost: 25000000, power: 100000, type: "auto" },
        { name: "Galactic Hydrator", cost: 60000000, power: 250000, type: "auto" },
        { name: "Cosmic Water Portal", cost: 150000000, power: 500000, type: "auto" },
        { name: "Universe Engine", cost: 500000000, power: 1000000, type: "auto" }
    ];

    const bottleCountDisplay = document.getElementById('bottle-count');
    const clickPowerDisplay = document.getElementById('click-power-display');
    const autoRateDisplay = document.getElementById('auto-rate-display');
    const clickBtn = document.getElementById('click-btn');
    const upgradesContainer = document.getElementById('upgrades-container');

    function buildUpgradesUI() {
        if (!upgradesContainer) return;
        upgradesContainer.innerHTML = '';
        upgrades.forEach((upg, index) => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.id = `upg-btn-${index}`;
            btn.innerHTML = `<strong>${upg.name}</strong> (+${upg.power} ${upg.type})<br>Cost: <span id="upg-cost-${index}">${upg.cost}</span>`;
            btn.addEventListener('click', () => buyUpgrade(index));
            upgradesContainer.appendChild(btn);
        });
    }

    function buyUpgrade(index) {
        const upg = upgrades[index];
        if (bottles >= upg.cost) {
            bottles -= upg.cost;
            if (upg.type === 'click') clickPower += upg.power;
            if (upg.type === 'auto') autoRate += upg.power;
            upg.cost = Math.floor(upg.cost * 1.4);
            updateDisplay();
        }
    }

    function updateDisplay() {
        if (bottleCountDisplay) bottleCountDisplay.textContent = Math.floor(bottles);
        if (clickPowerDisplay) clickPowerDisplay.textContent = clickPower;
        if (autoRateDisplay) autoRateDisplay.textContent = autoRate;

        upgrades.forEach((upg, index) => {
            const btn = document.getElementById(`upg-btn-${index}`);
            const costSpan = document.getElementById(`upg-cost-${index}`);
            if (btn && costSpan) {
                costSpan.textContent = upg.cost;
                btn.disabled = bottles < upg.cost;
            }
        });
    }

    if (clickBtn) {
        clickBtn.addEventListener('click', () => {
            bottles += clickPower;
            updateDisplay();
        });
    }

    setInterval(() => {
        if (autoRate > 0) {
            bottles += autoRate;
            updateDisplay();
        }
    }, 1000);

    buildUpgradesUI();
    updateDisplay();

    // ==========================================
    // --- 2. TAB SWITCHING SYSTEM ---
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.id.replace('tab-', '').replace('-btn', '') + '-section';
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        });
    });

    // ==========================================
    // --- 3. WORKING SNAKE GAME ---
    // ==========================================
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const snakeScoreDisplay = document.getElementById('snake-score');
    const startSnakeBtn = document.getElementById('start-snake-btn');

    const gridSize = 15;
    const tileCount = 20; // 300 / 15 = 20
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };
    let dx = 1;
    let dy = 0;
    let snakeScore = 0;
    let snakeGameInterval = null;

    function gameLoop() {
        if (!ctx) return;

        // Calculate new head position
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Wall collisions
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            alert(`Snake Game Over! Final Score: ${snakeScore}`);
            clearInterval(snakeGameInterval);
            return;
        }

        // Self collision
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                alert(`Snake Game Over! Final Score: ${snakeScore}`);
                clearInterval(snakeGameInterval);
                return;
            }
        }

        snake.unshift(head);

        // Food collision
        if (head.x === food.x && head.y === food.y) {
            snakeScore += 10;
            bottles += 50; // Bonus reward!
            if (snakeScoreDisplay) snakeScoreDisplay.textContent = snakeScore;
            updateDisplay();
            placeFood();
        } else {
            snake.pop();
        }

        // Draw Canvas Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Food
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

        // Draw Snake
        ctx.fillStyle = '#38bdf8';
        snake.forEach(part => {
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
        });
    }

    function placeFood() {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
    }

    function resetSnake() {
        snake = [{ x: 10, y: 10 }];
        dx = 1;
        dy = 0;
        snakeScore = 0;
        if (snakeScoreDisplay) snakeScoreDisplay.textContent = snakeScore;
        placeFood();
        if (snakeGameInterval) clearInterval(snakeGameInterval);
        snakeGameInterval = setInterval(gameLoop, 120);
    }

    startSnakeBtn?.addEventListener('click', resetSnake);

    window.addEventListener('keydown', e => {
        if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) { dx = 0; dy = -1; }
        if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) { dx = 0; dy = 1; }
        if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) { dx = -1; dy = 0; }
        if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) { dx = 1; dy = 0; }
    });

    // ==========================================
    // --- 4. WORKING INTERACTIVE CHESS GAME ---
    // ==========================================
    const chessBoardEl = document.getElementById('chess-board');
    const chessStatus = document.getElementById('chess-status');
    let selectedSquare = null;
    let turn = 'White';

    const initialChessState = [
        ["♜","♞","♝","♛","♚","♝","♞","♜"],
        ["♟","♟","♟","♟","♟","♟","♟","♟"],
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["♙","♙","♙","♙","♙","♙","♙","♙"],
        ["♖","♘","♗","♕","♔","♗","♘","♖"]
    ];

    let chessState = JSON.parse(JSON.stringify(initialChessState));

    function renderChessBoard() {
        if (!chessBoardEl) return;
        chessBoardEl.innerHTML = '';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = document.createElement('div');
                sq.className = `chess-square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                sq.textContent = chessState[r][c];

                if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
                    sq.classList.add('selected');
                }

                sq.addEventListener('click', () => handleChessClick(r, c));
                chessBoardEl.appendChild(sq);
            }
        }
    }

    function handleChessClick(r, c) {
        const piece = chessState[r][c];

        // Step 1: Selecting a piece
        if (!selectedSquare) {
            if (piece !== "") {
                selectedSquare = { r, c };
                renderChessBoard();
            }
        } else {
            // Step 2: Moving the selected piece to destination
            chessState[r][c] = chessState[selectedSquare.r][selectedSquare.c];
            chessState[selectedSquare.r][selectedSquare.c] = "";
            selectedSquare = null;
            
            // Toggle turn
            turn = turn === 'White' ? 'Black' : 'White';
            if (chessStatus) chessStatus.textContent = `${turn}'s Turn — Select a piece to move!`;

            renderChessBoard();
        }
    }

    document.getElementById('reset-chess-btn')?.addEventListener('click', () => {
        chessState = JSON.parse(JSON.stringify(initialChessState));
        selectedSquare = null;
        turn = 'White';
        if (chessStatus) chessStatus.textContent = "White's Turn — Select a piece to move!";
        renderChessBoard();
    });

    renderChessBoard();

    // ==========================================
    // --- 5. TIC-TAC-TOE ENGINE ---
    // ==========================================
    let tttBoard = ["", "", "", "", "", "", "", "", ""];
    let currentPlayer = "X";
    const tttStatus = document.getElementById('ttt-status');
    const tttCells = document.querySelectorAll('.ttt-cell');

    tttCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            if (tttBoard[idx] === "" && !checkTTTWinner()) {
                tttBoard[idx] = currentPlayer;
                e.target.textContent = currentPlayer;
                if (checkTTTWinner()) {
                    if (tttStatus) tttStatus.textContent = `Player ${currentPlayer} Wins! 🎉`;
                } else if (!tttBoard.includes("")) {
                    if (tttStatus) tttStatus.textContent = "It's a Draw! 🤝";
                } else {
                    currentPlayer = currentPlayer === "X" ? "O" : "X";
                    if (tttStatus) tttStatus.textContent = `Player ${currentPlayer}'s Turn`;
                }
            }
        });
    });

    function checkTTTWinner() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return wins.some(w => tttBoard[w[0]] && tttBoard[w[0]] === tttBoard[w[1]] && tttBoard[w[0]] === tttBoard[w[2]]);
    }

    document.getElementById('reset-ttt-btn')?.addEventListener('click', () => {
        tttBoard = ["", "", "", "", "", "", "", "", ""];
        currentPlayer = "X";
        if (tttStatus) tttStatus.textContent = "Player X's Turn";
        tttCells.forEach(c => c.textContent = "");
    });

    // ==========================================
    // --- 6. TI-84 CALCULATOR ENGINE ---
    // ==========================================
    const calcScreen = document.getElementById('calc-display');
    const numBtns = document.querySelectorAll('.num-btn');
    const clearBtn = document.getElementById('calc-clear');
    const equalsBtn = document.getElementById('calc-equals');

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (calcScreen) {
                if (calcScreen.value === '0') calcScreen.value = val;
                else calcScreen.value += val;
            }
        });
    });

    clearBtn?.addEventListener('click', () => {
        if (calcScreen) calcScreen.value = '0';
    });

    equalsBtn?.addEventListener('click', () => {
        if (calcScreen) {
            try {
                calcScreen.value = eval(calcScreen.value);
            } catch {
                calcScreen.value = 'Error';
            }
        }
    });
});
