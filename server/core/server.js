/**
 * 3D AI Game Platform
 * Entry point for the game server
 */

// Import the server module and implementation config
const { gameServer, serverConfig, setActiveImplementation } = require('./index');

// Simple implementation selector
console.log('\n===== 3D AI Game Platform =====');
console.log('Available implementations:');
console.log('1. default' + (serverConfig.activeImplementation === 'default' ? ' (current)' : ''));
console.log('2. numberblocks' + (serverConfig.activeImplementation === 'numberblocks' ? ' (current)' : ''));
console.log('\nCurrent implementation: ' + serverConfig.activeImplementation);

// Set up stdin to capture keypresses
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

let countdown = 10;
let countdownTimer;
let selected = false;

console.log(`\nPress 1 or 2 to select an implementation`);
console.log(`Starting with current implementation in ${countdown} seconds...`);

// Start countdown
countdownTimer = setInterval(() => {
    countdown--;
    
    if (countdown <= 0) {
        clearInterval(countdownTimer);
        if (!selected) {
            console.log(`\nUsing current implementation: ${serverConfig.activeImplementation}`);
            console.log('Server running on http://localhost:3000');
            process.stdin.setRawMode(false);
            process.stdin.pause();
        }
    } else {
        process.stdout.write(`\rStarting with current implementation in ${countdown} seconds...`);
    }
}, 1000);

// Handle key presses
process.stdin.on('data', (key) => {
    // Check for implementation selection keys
    if (key === '1') {
        selected = true;
        clearInterval(countdownTimer);
        if (serverConfig.activeImplementation !== 'default') {
            setActiveImplementation('default');
            console.log('\nImplementation set to: default');
        } else {
            console.log('\nImplementation already set to: default');
        }
        console.log('Server running on http://localhost:3000');
        process.stdin.setRawMode(false);
        process.stdin.pause();
    } else if (key === '2') {
        selected = true;
        clearInterval(countdownTimer);
        if (serverConfig.activeImplementation !== 'numberblocks') {
            setActiveImplementation('numberblocks');
            console.log('\nImplementation set to: numberblocks');
        } else {
            console.log('\nImplementation already set to: numberblocks');
        }
        console.log('Server running on http://localhost:3000');
        process.stdin.setRawMode(false);
        process.stdin.pause();
    } else if (key === '\u0003') { // Ctrl+C
        process.exit();
    }
});
