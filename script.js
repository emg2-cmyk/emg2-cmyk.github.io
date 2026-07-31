// Wait for the browser to load the HTML before running JavaScript
document.addEventListener('DOMContentLoaded', () => {
    
    // Select our button and the header element from the HTML
    const colorBtn = document.getElementById('colorBtn');
    const header = document.querySelector('header');

    // Array of fun background colors for the header
    const colors = ['#4a90e2', '#50e3c2', '#f5a623', '#9013fe', '#e91e63'];

    // Add a 'click' event listener to the button
    colorBtn.addEventListener('click', () => {
        // Pick a random color from our array
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Change the header background color dynamically!
        header.style.backgroundColor = randomColor;
        
        console.log(`Header color changed to: ${randomColor}`);
    });

});
