// Wrap everything safely inside DOMContentLoaded to prevent early execution crashes
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. WATER CLICKER STATE & 20 UPGRADES ---
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

    // Safely generate all 20 upgrade buttons in HTML
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

    // --- 2. DARK MODE TOGGLE ---
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
        });
    }

    // --- 3. TAB NAVIGATION SYSTEM ---
    const tabClickerBtn = document.getElementById('tab-clicker-btn');
    const tabSnakeBtn = document.getElementById('tab-snake-btn');
    const tabTttBtn = document.getElementById('tab-ttt-btn');
    const tabChessBtn = document.getElementById('tab-chess-btn');
    const tabCalcBtn = document.getElementById('tab-calc-btn');

    const clickerSection = document.getElementById('clicker-section');
    const snakeSection = document.getElementById('snake-section');
    const tttSection = document.getElementById('ttt-section');
    const chessSection = document.getElementById('chess-section');
    const calcSection = document.getElementById('calc-section');

    const allTabs = [tabClickerBtn, tabSnakeBtn, tabTttBtn, tabChessBtn, tabCalcBtn];
    const allSections = [clickerSection, snakeSection, tttSection, chessSection, calcSection];

    function switchTab(activeBtn, activeSection) {
        allTabs.forEach(tab => tab?.classList.remove('active'));
        allSections.forEach(sec => sec?.classList.remove('active'));
        activeBtn?.classList.add('active');
        activeSection?.classList.add('active');
    }

    tabClickerBtn?.addEventListener('click', () => switchTab(tabClickerBtn, clickerSection));
    tabSnakeBtn?.addEventListener('click', () => switchTab(tabSnakeBtn, snakeSection));
    tabTttBtn?.addEventListener('click', () => switchTab(tabTttBtn, tttSection));
    tabChessBtn?.addEventListener('click', () => switchTab(tabChessBtn, chessSection));
    tabCalcBtn?.addEventListener('click', () => switchTab(tabCalcBtn, calcSection));

    // --- 4. TIC-TAC-TOE ENGINE ---
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

    // --- 5. CHESS ENGINE ---
    const chessBoardEl = document.getElementById('chess-board');
    let selectedSquare = null;
    let initialChessState = [
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
                sq.addEventListener('click', () => handleChessClick(r, c, sq));
                chessBoardEl.appendChild(sq);
            }
        }
    }

    function handleChessClick(r, c, sqElement) {
        if (!selectedSquare) {
            if (chessState[r][c] !== "") {
                selectedSquare = { r, c };
                sqElement.classList.add('selected');
            }
        } else {
            chessState[r][c] = chessState[selectedSquare.r][selectedSquare.c];
            chessState[selectedSquare.r][selectedSquare.c] = "";
            selectedSquare = null;
            renderChessBoard();
        }
    }

    document.getElementById('reset-chess-btn')?.addEventListener('click', () => {
        chessState = JSON.parse(JSON.stringify(initialChessState));
        selectedSquare = null;
        renderChessBoard();
    });
    renderChessBoard();

    // --- 6. CALCULATOR ENGINE ---
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
