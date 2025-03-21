const { BaseRoom } = require("../../core/BaseRoom");
const { ImplementationPlayer, Operator, StaticValueEntity } = require("./schemas");

/**
 * Numberblocks implementation of the game room
 * Extends BaseRoom with Numberblocks-specific functionality
 */
class NumberblocksRoom extends BaseRoom {
    /**
     * Initialize Numberblocks-specific functionality
     * @param {Object} options Room creation options
     */
    initializeImplementation(options) {
        console.log("Numberblocks implementation initialized");
        
        // Update game config
        this.state.gameConfig.implementation = "numberblocks";
        
        // Setup operator spawning system
        this.spawnEnabled = true;
        this.spawnInterval = this.getRandomSpawnInterval();
        this.maxEntities = 10; // Maximum operators in the world
        
        // Setup static value entities
        this.createStaticValueEntity("static1", 2, 2, 0, -5);
        this.createStaticValueEntity("static2", 3, 5, 0, -5);
        this.createStaticValueEntity("static3", 4, -5, 0, -5);
        this.createStaticValueEntity("static4", 5, 0, 0, -10);
        this.createStaticValueEntity("static5", 1, 5, 0, -10);
        
        // Listen for implementation-specific messages
        this.onMessage("playerCollision", (client, message) => {
            this.handlePlayerCollision(client, message);
        });
    }
    
    /**
     * Override the base entity interaction handler
     */
    onEntityInteraction(player, entity, interactionType) {
        if (interactionType === "collect" && entity.type === "operator") {
            // Set the player's operator
            player.operator = entity.operatorType;
            
            // Remove operator from state
            this.deleteEntity(entity.id);
            console.log(`Player ${player.id} collected ${entity.operatorType} operator`);
        }
    }
    
    /**
     * Handle player collision message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message sent by the client
     */
    handlePlayerCollision(client, message) {
        const player = this.state.players.get(client.sessionId);
        const targetId = message.targetId;
        let target;
        
        // Check if target is another player or a static value entity
        if (this.state.players.has(targetId)) {
            target = this.state.players.get(targetId);
        } else if (this.state.entities.has(targetId) && 
                   this.state.entities.get(targetId).type === "staticValueEntity") {
            target = this.state.entities.get(targetId);
        }
        
        if (player && target) {
            // Handle the collision based on operator
            if (player.operator === "plus") {
                player.value += target.value;
                player.operator = "";
            } else if (player.operator === "minus" && player.value > target.value) {
                player.value -= target.value;
                player.operator = "";
            }
        }
    }
    
    /**
     * Override the base spawn interval method
     * @returns {number} Random spawn interval between 5-10 seconds
     */
    getSpawnInterval() {
        return 5 + Math.random() * 5; // 5-10 seconds
    }
    
    /**
     * Override the base spawn entity method
     * Spawns a new operator entity
     */
    spawnEntity() {
        const id = `op_${Math.floor(Math.random() * 10000)}`;
        const operatorType = Math.random() > 0.5 ? "plus" : "minus";
        
        // Create operator
        const operator = new Operator();
        operator.operatorType = operatorType;
        operator.isSpawned = true;
        
        // Set position slightly above ground
        const position = this.generateRandomPosition(0.6);
        
        // Use base createEntity method
        this.createEntity(id, operator, position);
        
        console.log(`Spawned ${operatorType} operator at (${position.x.toFixed(2)}, ${position.y}, ${position.z.toFixed(2)})`);
    }
    
    /**
     * Create a static value entity
     * @param {string} id Unique identifier
     * @param {number} value Entity value
     * @param {number} x X-coordinate
     * @param {number} y Y-coordinate
     * @param {number} z Z-coordinate
     */
    createStaticValueEntity(id, value, x, y, z) {
        // Create static value entity
        const staticEntity = new StaticValueEntity();
        staticEntity.value = value;
        
        // Create using the base createEntity method
        this.createEntity(id, staticEntity, { x, y, z });
        
        console.log(`Created static value entity ${id} with value ${value} at (${x}, ${y}, ${z})`);
    }
    
    /**
     * Setup player for implementation
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     * @returns {ImplementationPlayer} The implementation player
     */
    setupPlayer(player, client, options) {
        // Create an implementation player
        const implementationPlayer = new ImplementationPlayer();
        
        // Copy base player properties to the implementation player
        implementationPlayer.id = player.id;
        implementationPlayer.x = player.x;
        implementationPlayer.y = player.y;
        implementationPlayer.z = player.z;
        implementationPlayer.rotationY = player.rotationY || 0;
        
        // Set name and color
        implementationPlayer.name = options.name || client.sessionId;
        implementationPlayer.color = this.getColorForNumber(1);
        
        // Set initial value
        implementationPlayer.value = 1;
        
        console.log(`Created player ${implementationPlayer.name} with value ${implementationPlayer.value}`);
        
        return implementationPlayer;
    }
    
    /**
     * Get color for a value
     * @param {number} number The number to get color for
     * @returns {string} Color in hex format
     */
    getColorForNumber(number) {
        const colors = [
            "#FFFFFF", // White (placeholder, not used)
            "#FF0000", // 1: Red
            "#FFA500", // 2: Orange
            "#FFFF00", // 3: Yellow
            "#00FF00", // 4: Green
            "#0000FF", // 5: Blue
            "#800080", // 6: Purple
            "#FFC0CB", // 7: Pink
            "#A52A2A", // 8: Brown
            "#00FFFF", // 9: Cyan
            "#FF00FF"  // 10: Magenta
        ];
        
        // Use modulo for numbers greater than our color array
        return colors[number % colors.length] || "#FFFFFF";
    }
}

module.exports = { NumberblocksRoom }; 