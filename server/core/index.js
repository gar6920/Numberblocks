/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');

// Import implementations
const DefaultImpl = require('../implementations/default');
const MathBlocksImpl = require('../implementations/numberblocks');

// Available implementations
const implementations = {
    "default": DefaultImpl,
    "numberblocks": MathBlocksImpl
};

// Server-side configuration
const serverConfig = {
    // Read implementation from command line args or environment variable, default to "default"
    activeImplementation: process.env.GAME_IMPLEMENTATION || process.argv[2] || "default",
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
        
        // Register rooms for each implementation
        this.registerRooms();
    }
    
    /**
     * Configure Express app
     */
    configureApp() {
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
                availableImplementations: Object.keys(implementations)
            });
        });
    }
    
    /**
     * Register room handlers for all implementations
     */
    registerRooms() {
        // Register each implementation's room
        for (const [implName, impl] of Object.entries(implementations)) {
            // Register implementation without logging each one
            const roomType = impl.implementation.roomType;
            const RoomClass = this.getRoomClass(impl);
            
            if (RoomClass) {
                this.gameServer.define(roomType, RoomClass);
            } else {
                console.warn(`No room class found for implementation: ${implName}`);
            }
        }
        
        // Set the active implementation as the default room
        if (implementations[serverConfig.activeImplementation]) {
            const activeImpl = implementations[serverConfig.activeImplementation];
            // Get the appropriate room from the implementation
            const RoomClass = this.getRoomClass(activeImpl);
            
            if (RoomClass) {
                this.gameServer.define('active', RoomClass);
            } else {
                console.warn(`No room class found for active implementation: ${serverConfig.activeImplementation}`);
                // Fallback to default if no room class found
                if (implementations.default && this.getRoomClass(implementations.default)) {
                    this.gameServer.define('active', this.getRoomClass(implementations.default));
                }
            }
        } else {
            // Fallback to default if specified implementation doesn't exist
            console.warn(`Specified implementation "${serverConfig.activeImplementation}" not found. Using "default" instead.`);
            const defaultRoomClass = this.getRoomClass(implementations.default);
            if (defaultRoomClass) {
                this.gameServer.define('active', defaultRoomClass);
            }
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
        } else if (implementation.NumberblocksRoom) {
            return implementation.NumberblocksRoom;
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
            console.log(`Available implementations: ${Object.keys(implementations).join(', ')}`);
            console.log(`Active implementation: ${serverConfig.activeImplementation}`);
        });
    }
    
    /**
     * Change the active implementation
     * @param {string} implementationName Name of the implementation to use
     */
    setActiveImplementation(implementationName) {
        if (implementations[implementationName]) {
            serverConfig.activeImplementation = implementationName;
            console.log(`Active implementation changed to: ${implementationName}`);
            
            // Re-register rooms to update active room
            this.registerRooms();
            
            return true;
        } else {
            console.warn(`Implementation "${implementationName}" not found. Active implementation remains unchanged.`);
            return false;
        }
    }
}

// Create and start server
const gameServer = new GameServer();
gameServer.start(serverConfig.port);

// Export server instance and configuration for external access and control
module.exports = { 
    gameServer,
    serverConfig,
    setActiveImplementation: (implName) => gameServer.setActiveImplementation(implName)
}; 