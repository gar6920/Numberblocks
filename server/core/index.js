/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');

// Import default implementation
const DefaultImpl = require('../implementations/default');

// Server-side configuration
const serverConfig = {
    activeImplementation: "default",
    port: process.env.PORT || 3000
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
        
        // Create Colyseus server with correct configuration
        this.gameServer = new Server({
            server: this.server
        });
        
        // Register rooms
        this.registerRooms();
    }
    
    /**
     * Configure Express app
     */
    configureApp() {
        // Set up CORS headers for all requests
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
        
        // Set up static file serving
        this.app.use(express.static(path.join(__dirname, '../..', 'client')));
        
        // Serve the main index.html
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../..', 'client', 'index.html'));
        });
        
        // API endpoint to get current active implementation
        this.app.get('/api/config', (req, res) => {
            res.json({ 
                activeImplementation: serverConfig.activeImplementation,
                availableImplementations: ["default"]
            });
        });
    }
    
    /**
     * Register room handlers
     */
    registerRooms() {
        // Get the room from default implementation
        const roomType = DefaultImpl.implementation.roomType;
        const RoomClass = this.getRoomClass(DefaultImpl);
        
        if (RoomClass) {
            this.gameServer.define(roomType, RoomClass);
            this.gameServer.define('active', RoomClass);
        } else {
            console.warn('No room class found for default implementation');
        }
    }
    
    /**
     * Helper method to get the room class from an implementation
     * @param {Object} implementation The implementation object
     * @returns {Class} The room class, or null if not found
     */
    getRoomClass(implementation) {
        if (implementation.DefaultRoom) {
            return implementation.DefaultRoom;
        } else if (implementation.ImplementationRoom) {
            return implementation.ImplementationRoom;
        }
        
        // Log what's available in the implementation for debugging
        console.log(`Available properties in implementation: ${Object.keys(implementation).join(', ')}`);
        return null;
    }
    
    /**
     * Start the server
     * @param {number} port Port to listen on
     */
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`3D Game Platform server running on http://localhost:${port}`);
            console.log(`Active implementation: ${serverConfig.activeImplementation}`);
        });
    }
}

// Create and start server
const gameServer = new GameServer();
gameServer.start(serverConfig.port);

// Export server instance and configuration for external access
module.exports = { 
    gameServer,
    serverConfig
}; 