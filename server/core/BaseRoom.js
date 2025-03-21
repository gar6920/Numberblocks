const { Room } = require("colyseus");
const { GameState } = require("./schemas/GameState");
const { Player } = require("./schemas/Player");
const { BaseEntity } = require("./schemas/BaseEntity");

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
        
        // Initialize spawn system
        this.initializeSpawnSystem();
        
        // Initialize implementation - to be implemented by subclasses
        this.initializeImplementation(options);
        
        // Listen for input updates
        this.onMessage("updateInput", (client, message) => {
            this.handleInputUpdate(client, message);
        });
        
        // Listen for entity interaction messages
        this.onMessage("entityInteraction", (client, message) => {
            this.handleEntityInteraction(client, message);
        });
    }
    
    /**
     * Initialize entity spawn system
     * Provides base functionality for spawning entities periodically
     */
    initializeSpawnSystem() {
        // Base spawn system properties
        this.spawnTimer = 0;
        this.spawnInterval = 10; // Default 10 seconds
        this.maxEntities = 20;   // Default maximum entities
        this.spawnEnabled = false; // Disabled by default
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
        
        // Update individual keys instead of replacing the entire keys object
        if (message.keys) {
            player.input.keys.w = !!message.keys.w;
            player.input.keys.a = !!message.keys.a;
            player.input.keys.s = !!message.keys.s;
            player.input.keys.d = !!message.keys.d;
            player.input.keys.space = !!message.keys.space;
            player.input.keys.q = !!message.keys.q;
            player.input.keys.e = !!message.keys.e;
            player.input.keys.shift = !!message.keys.shift;
        }
        
        // Fix mouseDelta assignment - update properties instead of replacing the object
        if (message.mouseDelta) {
            player.input.mouseDelta.x = message.mouseDelta.x || 0;
            player.input.mouseDelta.y = message.mouseDelta.y || 0;
        } else {
            player.input.mouseDelta.x = 0;
            player.input.mouseDelta.y = 0;
        }
        
        player.input.viewMode = message.viewMode || "third-person";
        player.input.thirdPersonCameraAngle = message.thirdPersonCameraAngle || 0;
        
        // Apply direct client rotation if provided (for immediate, responsive feel)
        if (message.clientRotation) {
            player.rotationY = message.clientRotation.rotationY;
            player.pitch = message.clientRotation.pitch;
        }
    }
    
    /**
     * Handle entity interaction message from client
     * Base implementation for entity interactions like collecting or triggering entities
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing entityId and interaction type
     */
    handleEntityInteraction(client, message) {
        const player = this.state.players.get(client.sessionId);
        const entity = this.state.entities.get(message.entityId);
        
        if (!player || !entity) return;
        
        // Call implementation-specific entity interaction handler
        this.onEntityInteraction(player, entity, message.interactionType);
    }
    
    /**
     * Implementation-specific entity interaction handler
     * To be overridden by subclasses
     * @param {Player} player The player that interacted
     * @param {BaseEntity} entity The entity that was interacted with
     * @param {string} interactionType The type of interaction
     */
    onEntityInteraction(player, entity, interactionType) {
        // Base implementation does nothing
        console.log(`Player ${player.id} interacted with entity ${entity.id} (${interactionType})`);
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
        
        // Handle entity spawning if enabled
        if (this.spawnEnabled) {
            this.updateEntitySpawning(deltaTime);
        }
        
        // Call implementation-specific update
        this.implementationUpdate(deltaTime);
    }
    
    /**
     * Update entity spawning system
     * @param {number} deltaTime Time since last update
     */
    updateEntitySpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            // Count current spawned entities
            let entityCount = 0;
            this.state.entities.forEach(entity => {
                if (entity.isSpawned) {
                    entityCount++;
                }
            });
            
            // Spawn entity if below maximum
            if (entityCount < this.maxEntities) {
                this.spawnEntity();
            }
            
            this.spawnTimer = 0;
            this.spawnInterval = this.getSpawnInterval();
        }
    }
    
    /**
     * Get spawn interval - can be overridden for random intervals
     * @returns {number} Spawn interval in seconds
     */
    getSpawnInterval() {
        return this.spawnInterval; // Default implementation returns fixed interval
    }
    
    /**
     * Spawn a new entity - to be implemented by subclasses
     */
    spawnEntity() {
        // Base implementation does nothing - to be overridden
        console.log("spawnEntity called but not implemented");
    }
    
    /**
     * Create and add entity to the game state
     * @param {string} id Entity ID
     * @param {BaseEntity} entity Entity instance
     * @param {Object} position Position {x, y, z}
     * @param {Object} rotation Rotation {x, y, z}
     * @returns {BaseEntity} The created entity
     */
    createEntity(id, entity, position, rotation) {
        // Set entity properties
        entity.id = id;
        
        // Set position
        if (position) {
            entity.x = position.x || 0;
            entity.y = position.y || 0;
            entity.z = position.z || 0;
        }
        
        // Set rotation if provided
        if (rotation) {
            entity.rotationX = rotation.x || 0;
            entity.rotationY = rotation.y || 0; 
            entity.rotationZ = rotation.z || 0;
        }
        
        // Add to state
        this.state.entities.set(id, entity);
        console.log(`Created entity ${id} at (${entity.x}, ${entity.y}, ${entity.z})`);
        
        return entity;
    }
    
    /**
     * Delete an entity from the game state
     * @param {string} id Entity ID
     * @returns {boolean} Whether entity was found and deleted
     */
    deleteEntity(id) {
        if (this.state.entities.has(id)) {
            this.state.entities.delete(id);
            console.log(`Deleted entity ${id}`);
            return true;
        }
        return false;
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
        // Increase speed to make movement more noticeable
        const speed = 0.2;
        
        // Calculate movement based on the current player rotation or camera angle
        let dx = 0, dz = 0;
        
        // Determine which angle to use based on view mode
        const moveAngle = input.viewMode === "third-person" 
            ? input.thirdPersonCameraAngle // For third-person, move relative to camera angle
            : player.rotationY;            // For first-person, move relative to player facing
        
        // Check each movement key and apply appropriate movement
        if (input.keys && typeof input.keys === 'object') {
            // Remove verbose key logging
            
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
                dx -= Math.sin(moveAngle + Math.PI/2) * speed;
                dz -= Math.cos(moveAngle + Math.PI/2) * speed;
            }
            
            if (input.keys.d) {
                // Strafe right: Move perpendicular to the facing direction
                dx += Math.sin(moveAngle + Math.PI/2) * speed;
                dz += Math.cos(moveAngle + Math.PI/2) * speed;
            }
            
            // Handle Q and E for rotating the player in third-person mode
            const rotationSpeed = 0.1;  // Increased rotation speed
            
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
        
        // Handle jumps
        if (input.keys && input.keys.space && player.y <= 1) {
            player.velocityY = 0.2; // Jump velocity
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
        player.z = 0;
        
        // Set session ID as player ID
        player.id = client.sessionId;
        
        // Allow subclasses to modify player setup
        this.setupPlayer(player, client, options);
        
        // Add player to the game state
        this.state.players.set(client.sessionId, player);
    }
    
    /**
     * Player setup - to be implemented by subclasses
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     * @returns {Player} The modified player object
     */
    setupPlayer(player, client, options) {
        // Base implementation just returns the player
        return player;
    }
    
    /**
     * Called when a client leaves the room
     * @param {Client} client The client that left
     * @param {boolean} consented Whether the client consented to leaving
     */
    onLeave(client, consented) {
        console.log(`Client left: ${client.sessionId}`);
        
        // Remove player from the game state
        this.state.players.delete(client.sessionId);
    }
    
    /**
     * Generate a random position within the map
     * @param {number} minHeight Minimum height (y-coordinate)
     * @returns {Object} Position object {x, y, z}
     */
    generateRandomPosition(minHeight = 0) {
        const mapSize = this.state.gameConfig.mapSize;
        return {
            x: (Math.random() * mapSize) - (mapSize / 2),
            y: minHeight,
            z: (Math.random() * mapSize) - (mapSize / 2)
        };
    }
}

module.exports = { BaseRoom }; 