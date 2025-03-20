/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');

// Import implementations
const DefaultImpl = require('./implementations/default');
const NumberblocksImpl = require('./implementations/numberblocks');

// Available implementations
const implementations = {
    "default": DefaultImpl,
    "numberblocks": NumberblocksImpl
};

/**
 * Main server class
 */
class GameServer {
    constructor() {
        // Create Express app and HTTP server
        this.app = express();
        this.server = http.createServer(this.app);
        
        // Configure app
        this.configureApp();
        
        // Create Colyseus server
        this.gameServer = new Server({
            server: this.server,
            express: this.app
        });
        
        // Register rooms for each implementation
        this.registerRooms();
    }
    
    /**
     * Configure Express app
     */
    configureApp() {
        // Set up static file serving
        this.app.use(express.static(path.join(__dirname, '..', 'client')));
        
        // Serve the main index.html
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
        });
    }
    
    /**
     * Register room handlers for all implementations
     */
    registerRooms() {
        // Register each implementation's room
        for (const [implName, impl] of Object.entries(implementations)) {
            console.log(`Registering implementation: ${implName}`);
            this.gameServer.define(impl.implementation.roomType, impl.DefaultRoom || impl.NumberblocksRoom);
        }
        
        // Set default room as the fallback
        if (implementations.default) {
            this.gameServer.define('default', implementations.default.DefaultRoom);
        }
    }
    
    /**
     * Start the server
     * @param {number} port Port to listen on
     */
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`3D Game Platform server running on http://localhost:${port}`);
            console.log(`Available implementations: ${Object.keys(implementations).join(', ')}`);
        });
    }
}

// Create and start server
const gameServer = new GameServer();
gameServer.start(process.env.PORT || 3000);

module.exports = { gameServer }; 