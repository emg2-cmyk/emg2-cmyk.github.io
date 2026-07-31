document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. WATER CLICKER STATE & 20 UPGRADES DATA ARRAY ---
    let bottles = 0;
    let clickPower = 1;
    let autoRate = 0;

    // Array containing 20 unique hydration upgrades
    const upgrades = [
        { id: 0, name: "Extra Sips", cost: 15, power: 1, type: "click" },
        { id: 1, name: "Water Dispenser", cost: 50, power: 1, type: "auto" },
        { id: 2, name: "Stronger Grip", cost: 150, power: 5, type: "click" },
        { id: 3, name: "Water Cooler", cost: 300, power: 5, type: "auto" },
        { id: 4, name: "Hydration Pack", cost: 800, power: 15, type: "click" },
        { id: 5, name: "Delivery Truck", cost: 1500, power: 20, type: "auto" },
        { id: 6, name: "Water Tower", cost: 4000, power: 50, type: "auto" },
        { id: 7, name: "Filtration Plant", cost: 9000, power: 100, type: "auto" },
        { id: 8, name: "Bottling Factory", cost: 20000, power: 250, type: "auto" },
        { id: 9, name: "Rain Maker", cost: 50000, power: 500, type: "auto" },
        { id: 10, name: "Hydro Dam", cost: 120000, power: 1000, type: "auto" },
        { id: 11, name: "Glacier Harvester", cost: 300000, power: 2500, type: "auto" },
        { id: 12, name: "Ocean Desalination", cost: 750000, power: 5000, type: "auto" },
        { id: 13, name: "Cloud Seeder", cost: 1800000, power: 10000, type: "auto" },
        { id: 14, name: "Aqua Satellite", cost: 4500000, power: 25000, type: "auto" },
        { id: 15, name: "Comet Water Miner", cost: 10000000, power: 50000, type: "auto" },
        { id: 16, name: "Planetary Aquifer", cost: 25000000, power: 100000, type: "auto" },
        { id: 17, name: "Galactic Hydrator", cost: 60000000, power: 250000, type: "auto" },
        { id: 18, name: "Cosmic Water Portal", cost: 150000000, power: 500000, type: "auto" },
        { id: 19, name: "Universe Hydration Engine", cost: 500000000, power: 1000000, type: "auto" }
    ];

    const bottleCountDisplay = document.getElementById('bottle-count');
    const clickPowerDisplay = document.getElementById('click-power-display');
    const autoRateDisplay = document.getElementById('auto-rate-display');
    const clickBtn = document.getElementById('click-btn');
    const upgradesContainer = document.getElementById('upgrades-container');

    // Build the 20 upgrade buttons dynamically inside the HTML
    function buildUpgradesUI() {
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
        bottleCountDisplay.textContent = Math.floor(bottles);
        clickPowerDisplay.textContent = clickPower;
        autoRateDisplay.textContent = autoRate;

        upgrades.forEach((upg, index) => {
            const btn = document.getElementById(`upg-btn-${index}`);
            const costSpan = document.getElementById(`upg-cost-${index}`);
            if (btn && costSpan) {
                costSpan.textContent = upg.cost;
                btn.disabled = bottles < upg.cost;
            }
        });
    }

    clickBtn.addEventListener('click', () => {
        bottles += clickPower;
        updateDisplay();
    });

    setInterval(() => {
        if (autoRate > 0) {
            bottles += autoRate;
            updateDisplay();
        }
    }, 1000);

    buildUpgradesUI();
    updateDisplay();

    // --- 2. TAB NAVIGATION SYSTEM ---
    const tabs = ['clicker', 'snake', 'ttt', 'chess', 'calc'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}-btn`);
        const section = document.getElementById(`${tab}-section`);
        if (btn && section) {
            btn.addEventListener('click', () => {
                tabs.forEach(t => {
                    document.getElementById(`tab-${t}-btn`)?.classList.remove('active');
                    document.getElementById(`${t}-section`)?.classList.remove('active');
                });
                btn.classList.add('active');
                section.classList.add('active');
            });
        }
    });

    // --- 3. TIC-TAC-TOE ENGINE ---
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
                    tttStatus.textContent = `Player ${currentPlayer} Wins! 🎉`;
                } else if (!tttBoard.includes("")) {
                    tttStatus.textContent = "It's a Draw! 🤝";
                } else {
                    currentPlayer = currentPlayer === "X" ? "O" : "X";
                    tttStatus.textContent = `Player ${currentPlayer}'s Turn`;
                }
            }
        });
    });

    function checkTTTWinner() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return wins.some(w => tttBoard[w[0]] && tttBoard[w[0]] === tttBoard[w[1]] && tttBoard[w[0]] === tttBoard[w[2]]);
    }

    document.getElementById('reset-ttt-btn').addEventListener('click', () => {
        tttBoard = ["", "", "", "", "", "", "", "", ""];
        currentPlayer = "X";
        tttStatus.textContent = "Player X's Turn";
        tttCells.forEach(c => c.textContent = "");
    });

    // --- 4. MINI CHESS ENGINE ---
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

    document.getElementById('reset-chess-btn').addEventListener('click', () => {
        chessState = JSON.parse(JSON.stringify(initialChessState));
        selectedSquare = null;
        renderChessBoard();
    });
    renderChessBoard();
});

// --- 5. TI-84 CALCULATOR LOGIC ---
function calcInput(val) {
    const screen = document.getElementById('calc-display');
    if (screen.value === '0') screen.value = val;
    else screen.value += val;
}

document.getElementById('calc-clear')?.addEventListener('click', () => {
    document.getElementById('calc-display').value = '0';
});

document.getElementById('calc-equals')?.addEventListener('click', () => {
    const screen = document.getElementById('calc-display');
    try {
        screen.value = eval(screen.value);
    } catch {
        screen.value = 'Error';
    }
});
