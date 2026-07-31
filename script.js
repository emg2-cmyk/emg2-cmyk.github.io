document.addEventListener('DOMContentLoaded', () => {
    
    // --- GAME STATE VARIABLES ---
    let bottles = 0;
    let clickPower = 1;
    let autoRate = 0;

    // Costs for all 5 upgrades
    let clickUpgradeCost = 15;
    let dispenserCost = 50;
    let megaClickCost = 200;
    let truckCost = 500;
    let factoryCost = 2000;

    // Achievements unlocked flags
    let unlockedHero = false;
    let unlockedLegend = false;

    // --- DOM ELEMENT SELECTION ---
    const bottleCountDisplay = document.getElementById('bottle-count');
    const clickPowerDisplay = document.getElementById('click-power-display');
    const autoRateDisplay = document.getElementById('auto-rate-display');
    const badgeDisplay = document.getElementById('achievement-badge');
    const clickBtn = document.getElementById('click-btn');

    // Upgrade Buttons & Cost Displays
    const buyClickBtn = document.getElementById('buy-click-upgrade');
    const clickCostDisplay = document.getElementById('click-upgrade-cost');
    const buyDispenserBtn = document.getElementById('buy-dispenser');
    const dispenserCostDisplay = document.getElementById('dispenser-cost');
    const buyMegaBtn = document.getElementById('buy-mega-click');
    const megaCostDisplay = document.getElementById('mega-click-cost');
    const buyTruckBtn = document.getElementById('buy-truck');
    const truckCostDisplay = document.getElementById('truck-cost');
    const buyFactoryBtn = document.getElementById('buy-factory');
    const factoryCostDisplay = document.getElementById('factory-cost');

    // Theme & Navigation Elements
    const themeBtn = document.getElementById('theme-btn');
    const tabClickerBtn = document.getElementById('tab-clicker-btn');
    const tabSnakeBtn = document.getElementById('tab-snake-btn');
    const clickerSection = document.getElementById('clicker-section');
    const snakeSection = document.getElementById('snake-section');

    // --- AUDIO SYNTHESIZER (Pure JS Water Splash Sound Effect) ---
    function playSplashSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Creates a quick frequency pop to simulate a water droplet/splash
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }

    // --- DISPLAY UPDATE FUNCTION ---
    function updateDisplay() {
        bottleCountDisplay.textContent = Math.floor(bottles);
        clickPowerDisplay.textContent = clickPower;
        autoRateDisplay.textContent = autoRate;

        clickCostDisplay.textContent = clickUpgradeCost;
        dispenserCostDisplay.textContent = dispenserCost;
        megaCostDisplay.textContent = megaClickCost;
        truckCostDisplay.textContent = truckCost;
        factoryCostDisplay.textContent = factoryCost;

        // Enable/Disable buttons based on affordability
        buyClickBtn.disabled = bottles < clickUpgradeCost;
        buyDispenserBtn.disabled = bottles < dispenserCost;
        buyMegaBtn.disabled = bottles < megaClickCost;
        buyTruckBtn.disabled = bottles < truckCost;
        buyFactoryBtn.disabled = bottles < factoryCost;

        // Check for Milestones / Achievements
        checkAchievements();
    }

    // --- ACHIEVEMENTS SYSTEM ---
    function checkAchievements() {
        if (bottles >= 100 && !unlockedHero) {
            unlockedHero = true;
            badgeDisplay.textContent = "Title: Hydration Hero 🥈";
            alert("🏆 Achievement Unlocked: 'Hydration Hero'! You passed 100 water bottles!");
        }
        if (bottles >= 1000 && !unlockedLegend) {
            unlockedLegend = true;
            badgeDisplay.textContent = "Title: Ocean Master 🥇";
            alert("🏆 Achievement Unlocked: 'Ocean Master'! You reached 1,000 bottles!");
        }
    }

    // --- CLICK EVENT LISTENERS FOR UPGRADES ---
    clickBtn.addEventListener('click', () => {
        bottles += clickPower;
        playSplashSound();
        updateDisplay();
    });

    buyClickBtn.addEventListener('click', () => {
        if (bottles >= clickUpgradeCost) {
            bottles -= clickUpgradeCost;
            clickPower += 1;
            clickUpgradeCost = Math.floor(clickUpgradeCost * 1.5);
            updateDisplay();
        }
    });

    buyDispenserBtn.addEventListener('click', () => {
        if (bottles >= dispenserCost) {
            bottles -= dispenserCost;
            autoRate += 1;
            dispenserCost = Math.floor(dispenserCost * 1.5);
            updateDisplay();
        }
    });

    buyMegaBtn.addEventListener('click', () => {
        if (bottles >= megaClickCost) {
            bottles -= megaClickCost;
            clickPower += 5;
            megaCostDisplay = Math.floor(megaClickCost * 1.6);
            updateDisplay();
        }
    });

    buyTruckBtn.addEventListener('click', () => {
        if (bottles >= truckCost) {
            bottles -= truckCost;
            autoRate += 10;
            truckCost = Math.floor(truckCost * 1.5);
            updateDisplay();
        }
    });

    buyFactoryBtn.addEventListener('click', () => {
        if (bottles >= factoryCost) {
            bottles -= factoryCost;
            autoRate += 50;
            factoryCost = Math.floor(factoryCost * 1.5);
            updateDisplay();
        }
    });

    // --- GAME LOOP FOR AUTO-CLICKERS ---
    setInterval(() => {
        if (autoRate > 0) {
            bottles += autoRate;
            updateDisplay();
        }
    }, 1000);

    // --- DARK MODE TOGGLE ---
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            themeBtn.textContent = '☀️ Light Mode';
        } else {
            themeBtn.textContent = '🌙 Dark Mode';
        }
    });

    // --- TAB SWITCHING LOGIC ---
    tabClickerBtn.addEventListener('click', () => {
        tabClickerBtn.classList.add('active');
        tabSnakeBtn.classList.remove('active');
        clickerSection.classList.add('active');
        snakeSection.classList.remove('active');
    });

    tabSnakeBtn.addEventListener('click', () => {
        tabSnakeBtn.classList.add('active');
        tabClickerBtn.classList.remove('active');
        snakeSection.classList.add('active');
        clickerSection.classList.remove('active');
    });

    // ==========================================
    // --- SNAKE GAME ENGINE (HTML5 CANVAS) ---
    // ==========================================
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const snakeScoreDisplay = document.getElementById('snake-score');
    const startSnakeBtn = document.getElementById('start-snake-btn');

    const gridSize = 15;
    const tileCount = canvas.width / gridSize;
    let snake = [{x: 10, y: 10}];
    let food = {x: 5, y: 5};
    let dx = 0;
    let dy = 0;
    let snakeScore = 0;
    let gameInterval = null;

    function drawSnakeGame() {
        // Move Snake
        const head = {x: snake[0].x + dx, y: snake[0].y + dy};

        // Wall collisions
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            return gameOver();
        }

        // Self collisions
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y && (dx !== 0 || dy !== 0)) {
                return gameOver();
            }
        }

        snake.unshift(head);

        // Check if snake ate food
        if (head.x === food.x && head.y === food.y) {
            snakeScore += 10;
            bottles += 25; // Bonus reward: Playing Snake awards clicker bottles!
            snakeScoreDisplay.textContent = snakeScore;
            placeFood();
            updateDisplay();
        } else if (dx !== 0 || dy !== 0) {
            snake.pop();
        }

        // Clear Canvas
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

    function gameOver() {
        clearInterval(gameInterval);
        alert(`Game Over! Final Snake Score: ${snakeScore}`);
        dx = 0;
        dy = 0;
    }

    function resetSnakeGame() {
        snake = [{x: 10, y: 10}];
        dx = 1;
        dy = 0;
        snakeScore = 0;
        snakeScoreDisplay.textContent = snakeScore;
        placeFood();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(drawSnakeGame, 100);
    }

    startSnakeBtn.addEventListener('click', resetSnakeGame);

    // Keyboard Controls for Snake
    window.addEventListener('keydown', e => {
        if (['ArrowUp', 'KeyW'].includes(e.code) && dy === 0) { dx = 0; dy = -1; }
        if (['ArrowDown', 'KeyS'].includes(e.code) && dy === 0) { dx = 0; dy = 1; }
        if (['ArrowLeft', 'KeyA'].includes(e.code) && dx === 0) { dx = -1; dy = 0; }
        if (['ArrowRight', 'KeyD'].includes(e.code) && dx === 0) { dx = 1; dy = 0; }
    });

    // Initialize display
    updateDisplay();
});
