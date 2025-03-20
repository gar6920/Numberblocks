const { Room } = require("colyseus");
const { GameState } = require("../schemas/GameState");
const { Player } = require("../schemas/Player");

/**
 * Base room class for all game implementations
 * Provides common functionality for all game rooms
 */
class BaseRoom extends Room {
    /**
     * Called when room is created
     * @param {Object} options Room creation options
     */
    onCreate(options) {
        console.log("BaseRoom created!", options);
        
        // Initialize room state with a new GameState
        this.setState(new GameState());
        
        // Set maximum number of clients
        this.maxClients = 10;
        
        // Set frequency of patches to send
        this.setPatchRate(1000 / 30); // 30 fps
        
        // Set simulation interval for server-side logic
        this.setSimulationInterval(() => this.update());
        
        // Initialize implementation - to be implemented by subclasses
        this.initializeImplementation(options);
        
        // Listen for input updates
        this.onMessage("updateInput", (client, message) => {
            this.handleInputUpdate(client, message);
        });
    }
    
    /**
     * Initialize implementation-specific functionality
     * To be overridden by subclasses
     * @param {Object} options Room creation options
     */
    initializeImplementation(options) {
        // Base implementation does nothing
        console.log("Base implementation initialized");
    }
    
    /**
     * Handle input update message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message sent by the client
     */
    handleInputUpdate(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        // Update the input object with the new input
        player.input.keys = message.keys;
        player.input.mouseDelta = message.mouseDelta || { x: 0, y: 0 };
        player.input.viewMode = message.viewMode || "third-person";
        player.input.thirdPersonCameraAngle = message.thirdPersonCameraAngle || 0;
        
        // Apply direct client rotation if provided (for immediate, responsive feel)
        if (message.clientRotation) {
            player.rotationY = message.clientRotation.rotationY;
            player.pitch = message.clientRotation.pitch;
        }
    }
    
    /**
     * Update game state - called once per simulation interval
     * Base implementation handles player movement and physics
     */
    update() {
        // Calculate delta time (assuming 30fps)
        const deltaTime = 1/30;
        
        // Process player inputs and update positions
        this.state.players.forEach((player, sessionId) => {
            // Skip if no input data
            if (!player.input) return;
            
            // Handle player movement based on input state
            this.updatePlayerFromInput(sessionId, player, player.input, deltaTime);
        });
        
        // Call implementation-specific update
        this.implementationUpdate(deltaTime);
    }
    
    /**
     * Implementation-specific update logic
     * To be overridden by subclasses
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Base implementation does nothing
    }
    
    /**
     * Update player position based on input state
     * @param {string} playerSessionId Player session ID
     * @param {Player} player Player object
     * @param {InputState} input Input state
     * @param {number} delta Time since last update
     */
    updatePlayerFromInput(playerSessionId, player, input, delta) {
        const speed = 0.05;
        
        // Calculate movement based on the current player rotation or camera angle
        let dx = 0, dz = 0;
        
        // Determine which angle to use based on view mode
        const moveAngle = input.viewMode === "third-person" 
            ? input.thirdPersonCameraAngle // For third-person, move relative to camera angle
            : player.rotationY;            // For first-person, move relative to player facing
        
        if (input.keys.w) {
            // Forward movement: Move in the direction the player/camera is facing
            dx -= Math.sin(moveAngle) * speed;
            dz -= Math.cos(moveAngle) * speed;
        }
        
        if (input.keys.s) {
            // Backward movement: Move in the opposite direction
            dx += Math.sin(moveAngle) * speed;
            dz += Math.cos(moveAngle) * speed;
        }
        
        if (input.keys.a) {
            // Strafe left: Move perpendicular to the facing direction
            dx += Math.sin(moveAngle + Math.PI/2) * speed;
            dz += Math.cos(moveAngle + Math.PI/2) * speed;
        }
        
        if (input.keys.d) {
            // Strafe right: Move perpendicular to the facing direction
            dx -= Math.sin(moveAngle + Math.PI/2) * speed;
            dz -= Math.cos(moveAngle + Math.PI/2) * speed;
        }
        
        // Handle Q and E for rotating the player in third-person mode
        const rotationSpeed = 0.08;  // Rotation speed
        
        if (input.keys.q) {
            // Rotate player left (counter-clockwise)
            player.rotationY += rotationSpeed;
            // Normalize rotation
            player.rotationY = player.rotationY % (Math.PI * 2);
            if (player.rotationY < 0) player.rotationY += Math.PI * 2;
        }
        
        if (input.keys.e) {
            // Rotate player right (clockwise)
            player.rotationY -= rotationSpeed;
            // Normalize rotation
            player.rotationY = player.rotationY % (Math.PI * 2);
            if (player.rotationY < 0) player.rotationY += Math.PI * 2;
        }
        
        // Apply diagonal movement speed correction for all movement
        if ((input.keys.w || input.keys.s) && 
            (input.keys.a || input.keys.d)) {
            // Normalize diagonal movement speed
            const magnitude = Math.sqrt(dx * dx + dz * dz);
            if (magnitude > 0) {
                dx = (dx / magnitude) * speed;
                dz = (dz / magnitude) * speed;
            }
        }
        
        // Update player position
        player.x += dx;
        player.z += dz;
        
        // Handle physics - gravity
        player.velocityY -= 0.01; // gravity
        player.y += player.velocityY;
        if (player.y < 1) {
            player.y = 1;
            player.velocityY = 0;
        }
        
        // Handle mouse movement (rotation) for players not sending direct rotation
        if (input.mouseDelta && input.mouseDelta.x !== 0 && input.mouseDelta.y !== 0) {
            // Apply mouse X movement to player rotation (horizontal looking)
            player.rotationY += input.mouseDelta.x * 0.002;
            
            // Normalize rotation to keep it within 0 to 2π range
            player.rotationY = player.rotationY % (Math.PI * 2);
            if (player.rotationY < 0) player.rotationY += Math.PI * 2;
            
            // Apply mouse Y movement to pitch (vertical looking, with limits)
            player.pitch += input.mouseDelta.y * 0.002;
            
            // Clamp pitch to prevent over-rotation
            player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));
            
            // Reset mouseDelta after applying
            input.mouseDelta.x = 0;
            input.mouseDelta.y = 0;
        }
    }
    
    /**
     * Called when a client joins the room
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     */
    onJoin(client, options) {
        console.log(`Client joined: ${client.sessionId}`);
        
        // Create a new player instance
        const player = new Player();
        
        // Set initial player position
        player.x = 0;
        player.y = 1;
        player.z = 5;
        
        // Set player name and color
        player.name = options.name || client.sessionId;
        player.color = this.getColorForPlayer(Object.keys(this.state.players).length);
        
        // Call implementation-specific player setup
        this.setupPlayer(player, client, options);
        
        // Add player to game state
        this.state.players.set(client.sessionId, player);
        
        console.log(`Player ${player.name} (${client.sessionId}) joined with color ${player.color}`);
    }
    
    /**
     * Implementation-specific player setup
     * To be overridden by subclasses
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     */
    setupPlayer(player, client, options) {
        // Base implementation does nothing
    }
    
    /**
     * Called when a client leaves the room
     * @param {Client} client The client that left
     * @param {boolean} consented Whether the client consented to leaving
     */
    onLeave(client, consented) {
        console.log(`${client.sessionId} left the game`);
        
        // Remove player from room state
        this.state.players.delete(client.sessionId);
        
        console.log(`Player ${client.sessionId} removed. Remaining players: ${this.state.players.size}`);
    }
    
    /**
     * Get a distinct color for each player
     * @param {number} index Player index
     * @returns {string} Color in hex format
     */
    getColorForPlayer(index) {
        const colors = [
            "#FF0000", // Red
            "#00FF00", // Green
            "#0000FF", // Blue
            "#FFFF00", // Yellow
            "#FF00FF", // Magenta
            "#00FFFF", // Cyan
            "#FFA500", // Orange
            "#800080"  // Purple
        ];
        return colors[index % colors.length];
    }
}

module.exports = { BaseRoom }; 