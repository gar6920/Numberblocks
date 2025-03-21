/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');
const fs = require('fs');

// Import implementations
const DefaultImpl = require('./implementations/default');
const MathBlocksImpl = require('./implementations/numberblocks');

// Available implementations
const implementations = {
    "default": DefaultImpl,
    "numberblocks": MathBlocksImpl
};

// Server-side configuration
const serverConfig = {
    // Set the active implementation here - change this value to switch implementations
    activeImplementation: "default", // Options: "default", "numberblocks"
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
        this.app.use(express.static(path.join(__dirname, '..', 'client')));
        
        // Serve the main index.html
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
        });
        
        // API endpoint to get current active implementation
        this.app.get('/api/config', (req, res) => {
            res.json({ 
                activeImplementation: serverConfig.activeImplementation,
                availableImplementations: Object.keys(implementations)
            });
        });
        
        // Serve the four player setup page
        this.app.get('/4player', (req, res) => {
            const fourPlayerHtmlPath = path.join(__dirname, '..', 'four_player_setup.html');
            
            // Check if the file exists
            if (fs.existsSync(fourPlayerHtmlPath)) {
                res.sendFile(fourPlayerHtmlPath);
            } else {
                // Generate the file if it doesn't exist
                this.generateFourPlayerSetup();
                res.sendFile(fourPlayerHtmlPath);
            }
        });
    }
    
    /**
     * Generate the four player setup HTML file if it doesn't exist
     */
    generateFourPlayerSetup() {
        const fourPlayerHtmlPath = path.join(__dirname, '..', 'four_player_setup.html');
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D AI Game - 4 Player Setup</title>
  <style>
    body, html { 
      margin: 0; 
      padding: 0; 
      height: 100%; 
      overflow: hidden; 
      background-color: #000;
    }
    .container { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      grid-template-rows: 1fr 1fr; 
      height: 100vh; 
      gap: 4px;
    }
    iframe { 
      width: 100%; 
      height: 100%; 
      border: none; 
      background-color: #111;
    }
    .player-container {
      position: relative;
      border: 2px solid;
    }
    .player-container:nth-child(1) {
      border-color: #FF0000;
    }
    .player-container:nth-child(2) {
      border-color: #00FF00;
    }
    .player-container:nth-child(3) {
      border-color: #0000FF;
    }
    .player-container:nth-child(4) {
      border-color: #FFFF00;
    }
    .player-label {
      position: absolute;
      padding: 4px 8px;
      background-color: rgba(0,0,0,0.7);
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      border-radius: 4px;
      z-index: 10;
    }
    .fullscreen-btn {
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 8px 15px;
      background-color: rgba(0,0,0,0.7);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      z-index: 100;
    }
    .controls {
      position: fixed;
      bottom: 10px;
      left: 10px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 12px;
      background-color: rgba(0,0,0,0.7);
      padding: 8px;
      border-radius: 4px;
      z-index: 100;
    }
    .iframe-blocker {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.7);
      color: white;
      justify-content: center;
      align-items: center;
      z-index: 50;
      font-family: Arial, sans-serif;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="player-container" style="border-color: #FF0000;">
      <span class="player-label" style="top: 5px; left: 5px; color: #FF0000;">Player 1 (Red)</span>
      <iframe id="player1" src="http://localhost:${serverConfig.port}/?playerName=Player1&playerColor=ff0000"></iframe>
      <div class="iframe-blocker" id="blocker1">Click to activate<br>Player 1</div>
    </div>
    <div class="player-container" style="border-color: #00FF00;">
      <span class="player-label" style="top: 5px; left: 5px; color: #00FF00;">Player 2 (Green)</span>
      <iframe id="player2" src="http://localhost:${serverConfig.port}/?playerName=Player2&playerColor=00ff00"></iframe>
      <div class="iframe-blocker" id="blocker2">Click to activate<br>Player 2</div>
    </div>
    <div class="player-container" style="border-color: #0000FF;">
      <span class="player-label" style="top: 5px; left: 5px; color: #0000FF;">Player 3 (Blue)</span>
      <iframe id="player3" src="http://localhost:${serverConfig.port}/?playerName=Player3&playerColor=0000ff"></iframe>
      <div class="iframe-blocker" id="blocker3">Click to activate<br>Player 3</div>
    </div>
    <div class="player-container" style="border-color: #FFFF00;">
      <span class="player-label" style="top: 5px; left: 5px; color: #FFFF00;">Player 4 (Yellow)</span>
      <iframe id="player4" src="http://localhost:${serverConfig.port}/?playerName=Player4&playerColor=ffff00"></iframe>
      <div class="iframe-blocker" id="blocker4">Click to activate<br>Player 4</div>
    </div>
  </div>
  
  <button class="fullscreen-btn" onclick="toggleFullScreen()">Go Fullscreen (F11)</button>
  
  <div class="controls">
    F11: Toggle fullscreen | WASD: Move player | Mouse: Look around | V: Toggle camera view
  </div>

  <script>
    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          alert("Error attempting to enable fullscreen: " + err.message);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // Also toggle fullscreen with F11 key
    document.addEventListener("keydown", function(e) {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullScreen();
      }
    });

    // Set up iframe blockers - these help manage focus between iframes
    for (let i = 1; i <= 4; i++) {
      const blocker = document.getElementById("blocker" + i);
      const iframe = document.getElementById("player" + i);
      
      blocker.addEventListener("click", function() {
        // Hide all blockers
        for (let j = 1; j <= 4; j++) {
          document.getElementById("blocker" + j).style.display = "none";
        }
        
        // Focus the clicked iframe
        iframe.focus();
      });
    }

    // When an iframe loses focus, show its blocker
    window.addEventListener("blur", function() {
      // This event doesn't tell us which iframe is active, so we have to use a timeout
      setTimeout(function() {
        const activeElement = document.activeElement;
        for (let i = 1; i <= 4; i++) {
          const iframe = document.getElementById("player" + i);
          const blocker = document.getElementById("blocker" + i);
          
          if (activeElement !== iframe) {
            blocker.style.display = "flex";
          }
        }
      }, 100);
    }, true);
  </script>
</body>
</html>`;
        
        fs.writeFileSync(fourPlayerHtmlPath, htmlContent);
    }
    
    /**
     * Register room handlers for all implementations
     */
    registerRooms() {
        // Register each implementation's room
        for (const [implName, impl] of Object.entries(implementations)) {
            // Register implementation without logging each one
            this.gameServer.define(impl.implementation.roomType, impl.DefaultRoom || impl.ImplementationRoom);
        }
        
        // Set the active implementation as the default room
        if (implementations[serverConfig.activeImplementation]) {
            const activeImpl = implementations[serverConfig.activeImplementation];
            // Get the appropriate room from the implementation
            const ImplementationRoom = activeImpl.DefaultRoom || activeImpl.ImplementationRoom;
            this.gameServer.define('active', ImplementationRoom);
            // Don't log active implementation here, will log at server start
        } else {
            // Fallback to default if specified implementation doesn't exist
            console.warn(`Specified implementation "${serverConfig.activeImplementation}" not found. Using "default" instead.`);
            this.gameServer.define('active', implementations.default.DefaultRoom);
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
            console.log(`Active implementation: ${serverConfig.activeImplementation}`);
            console.log(`Four Player Mode available at: http://localhost:${port}/4player`);
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