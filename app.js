// app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. USER LOGIN LOGIC ---
    const loginBtn = document.getElementById('loginBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');

    // Check if the user already saved their name previously
    let currentUser = localStorage.getItem('squadName');
    if (currentUser) {
        userNameDisplay.textContent = currentUser;
        loginBtn.textContent = "Change Name";
    }

    // Set Name button logic
    loginBtn.addEventListener('click', () => {
        const name = prompt("What's your name?");
        if (name && name.trim() !== "") {
            currentUser = name.trim();
            localStorage.setItem('squadName', currentUser); // Save to browser
            userNameDisplay.textContent = currentUser;
            loginBtn.textContent = "Change Name";
        }
    });

    // --- 2. INTERACTIVE MAP LOGIC ---
    // Create the map and set a default view (Centered roughly on the US)
    const map = L.map('map').setView([39.8283, -98.5795], 4); 

    // Load the visual map tiles from OpenStreetMap (Free alternative to Google Maps)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Ask browser for user's location and zoom in if they allow it
    map.locate({setView: true, maxZoom: 12});

    // Let users click the map to drop a pickup pin
    map.on('click', function(e) {
        if(!currentUser) {
            alert("Please click 'Set Name' at the top right before dropping a pin!");
            return;
        }
        
        // Add a marker where they clicked
        L.marker(e.latlng).addTo(map)
            .bindPopup(`<b>${currentUser}'s</b> Pickup Location`).openPopup();
    });

    // --- 3. BUTTON PLACEHOLDERS ---
    // These will connect to Firebase later!
    document.getElementById('addAvailabilityBtn').addEventListener('click', () => {
        alert("Later, this will open a calendar connected to our live database!");
    });

    document.getElementById('offerRideBtn').addEventListener('click', () => {
        alert("Later, this will let you input how many seats you have.");
    });

    document.getElementById('needRideBtn').addEventListener('click', () => {
        alert("Later, this will add you to the 'Needs Ride' list.");
    });
});
