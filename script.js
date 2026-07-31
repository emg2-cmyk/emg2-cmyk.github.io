// Initialize game variables
let waterCount = 0;
let clickPower = 1;
let upgradeCost = 15;

// Grab elements from our HTML document
const scoreDisplay = document.getElementById("score");
const clickTarget = document.getElementById("click-target");
const upgradeBtn = document.getElementById("upgrade-btn");
const upgradeCostDisplay = document.getElementById("upgrade-cost");

// Listen for clicks on the water bottle
clickTarget.addEventListener("click", function() {
    // Increase water count by current click power
    waterCount += clickPower;
    
    // Update the visual score on the screen
    scoreDisplay.textContent = waterCount;
});

// Listen for clicks on the upgrade button
upgradeBtn.addEventListener("click", function() {
    // Check if the user has enough water bottles to buy the upgrade
    if (waterCount >= upgradeCost) {
        waterCount -= upgradeCost; // Subtract the cost from score
        clickPower += 1;          // Increase power per click
        
        // Increase the upgrade cost exponentially for next time
        upgradeCost = Math.round(upgradeCost * 1.5);
        
        // Refresh the text displayed on the screen
        scoreDisplay.textContent = waterCount;
        upgradeCostDisplay.textContent = upgradeCost;
        
        // Update button text to show new stats
        upgradeBtn.textContent = `Buy Water Filter (Cost: ${upgradeCost}) - +${clickPower} Per Click`;
    } else {
        alert("Not enough water bottles saved up yet! Keep clicking!");
    }
});
