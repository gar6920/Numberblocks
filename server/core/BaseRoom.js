const { Room } = require("colyseus");
const { GameState } = require("./schemas/GameState");
const { Player, MoveTarget } = require("./schemas/Player");
const { BaseEntity } = require("./schemas/BaseEntity");
const { Structure } = require("./schemas/Structure");

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
        
        // Listen for RTS move commands
        this.onMessage("moveCommand", (client, message) => {
            this.handleMoveCommand(client, message);
        });
        
        // Listen for structure placement
        this.onMessage("placeStructure", (client, message) => {
            this.handlePlaceStructure(client, message);
        });
        
        // Listen for structure demolish
        this.onMessage("demolishStructure", (client, message) => {
            this.handleDemolishStructure(client, message);
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
     * Handle move command from RTS view
     * Sets target destination for player movement
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing x and z coordinates
     */
    handleMoveCommand(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        // Store target destination
        player.moveTarget.x = message.x;
        player.moveTarget.z = message.z;
        
        // Set a flag indicating the player is being controlled by RTS commands
        player.isRTSControlled = true;
        
        console.log(`RTS move command: Player ${client.sessionId} moving to (${message.x}, ${message.z})`);
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
        // Check if player is being controlled via RTS commands
        if (player.isRTSControlled && player.moveTarget) {
            // Calculate direction to target
            const dx = player.moveTarget.x - player.x;
            const dz = player.moveTarget.z - player.z;
            
            // Calculate distance to target
            const distanceSquared = dx * dx + dz * dz;
            
            // If we're close enough to the target, stop moving
            if (distanceSquared < 0.1) {
                player.isRTSControlled = false;
                return;
            }
            
            // Calculate normalized direction vector
            const distance = Math.sqrt(distanceSquared);
            const normalizedDx = dx / distance;
            const normalizedDz = dz / distance;
            
            // Move towards target at a fixed speed
            const speed = 0.2;
            player.x += normalizedDx * speed;
            player.z += normalizedDz * speed;
            
            // Calculate rotation to face movement direction
            player.rotationY = Math.atan2(normalizedDx, normalizedDz);
            
            return;
        }
        
        // Standard input-based movement (from keyboard controls)
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
    
    /**
     * Handle structure placement message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing structure details
     */
    handlePlaceStructure(client, message) {
        console.log(`Handling structure placement from ${client.sessionId}:`, message);
        
        // Validate player
        const player = this.state.players.get(client.sessionId);
        if (!player) { 
            console.log("Player not found for structure placement");
            return; 
        }
        
        // Extract data
        const { structureType, x, y, z, rotation = 0 } = message;
        
        // Validate data
        if (!structureType || typeof x !== 'number' || typeof z !== 'number') {
            console.log("Invalid structure data:", message);
            return;
        }
        
        // Optional: Check if placement is valid
        if (!this.isStructurePlacementValid(structureType, x, y, z, rotation)) {
            console.log("Structure placement invalid - collision detected");
            return;
        }
        
        // Create a new structure entry with unique ID
        const id = "structure_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
        const structure = new Structure();
        structure.id = id;
        structure.structureType = structureType;
        structure.x = x;
        structure.y = y || 0;
        structure.z = z;
        structure.rotationY = rotation;
        structure.ownerId = client.sessionId;
        
        // Set dimensions based on structure type
        this.setStructureDimensions(structure);
        
        // Add to state - this automatically broadcasts to all clients
        this.state.structures.set(id, structure);
        
        console.log(`Structure ${id} placed at (${x}, ${y}, ${z})`);
        
        // Optional: Send confirmation to the client who placed it
        client.send("structurePlaced", { 
            success: true, 
            id: id,
            data: message
        });
    }
    
    /**
     * Handle structure demolition message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing structure id
     */
    handleDemolishStructure(client, message) {
        const { structureId } = message;
        const structure = this.state.structures.get(structureId);
        
        // Only allow owner to demolish their structures
        if (structure && structure.ownerId === client.sessionId) {
            this.state.structures.delete(structureId);
            console.log(`Structure ${structureId} demolished by ${client.sessionId}`);
        }
    }
    
    /**
     * Check if a structure placement is valid
     * @param {string} structureType Type of structure
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} z Z position
     * @param {number} rotation Rotation in radians
     * @returns {boolean} Whether placement is valid
     */
    isStructurePlacementValid(structureType, x, y, z, rotation) {
        // Get dimensions based on type
        let width = 1, depth = 1;
        
        switch (structureType) {
            case "building":
                width = 4;
                depth = 4;
                break;
            case "wall":
                width = 4;
                depth = 0.5;
                // Adjust for rotation
                if (Math.abs(rotation % Math.PI) > 0.1) {
                    [width, depth] = [depth, width];
                }
                break;
        }
        
        // Check for collisions with other structures
        let isValid = true;
        
        // Create bounding box for new structure
        const halfWidth = width / 2;
        const halfDepth = depth / 2;
        const newMin = { x: x - halfWidth, z: z - halfDepth };
        const newMax = { x: x + halfWidth, z: z + halfDepth };
        
        // Check against all other structures
        this.state.structures.forEach((structure) => {
            // Skip if already invalid
            if (!isValid) return;
            
            const otherHalfWidth = structure.width / 2;
            const otherHalfDepth = structure.depth / 2;
            
            const otherMin = {
                x: structure.x - otherHalfWidth,
                z: structure.z - otherHalfDepth
            };
            const otherMax = {
                x: structure.x + otherHalfWidth,
                z: structure.z + otherHalfDepth
            };
            
            // Check if bounding boxes overlap
            if (newMin.x <= otherMax.x && newMax.x >= otherMin.x &&
                newMin.z <= otherMax.z && newMax.z >= otherMin.z) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Set dimensions for a structure
     * @param {Structure} structure The structure to set dimensions for
     */
    setStructureDimensions(structure) {
        switch (structure.structureType) {
            case "building":
                structure.width = 4;
                structure.height = 3;
                structure.depth = 4;
                break;
            case "wall":
                structure.width = 4;
                structure.height = 2;
                structure.depth = 0.5;
                break;
            default:
                structure.width = 1;
                structure.height = 1;
                structure.depth = 1;
        }
    }
}

module.exports = { BaseRoom }; 