/**
 * 3D AI Game Platform
 * Entry point for the game server
 */

// Import the server module and implementation config
const { gameServer, serverConfig } = require('./index');

// Display server info
console.log('\n===== 3D AI Game Platform =====');
console.log('Server running on http://localhost:3000');
console.log('Implementation: default');

// Handle Ctrl+C to exit
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
    if (key === '\u0003') { // Ctrl+C
        process.exit();
    }
});
