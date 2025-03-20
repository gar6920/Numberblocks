const { BaseRoom } = require("../../core/BaseRoom");
const { NumberblockPlayer, Operator, StaticNumberblock } = require("./schemas");

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
        this.spawnTimer = 0;
        this.spawnInterval = this.getRandomSpawnInterval();
        this.maxOperators = 10;
        
        // Setup static numberblocks
        this.createStaticNumberblock("static1", 2, 2, 0, -5);
        this.createStaticNumberblock("static2", 3, 5, 0, -5);
        this.createStaticNumberblock("static3", 4, -5, 0, -5);
        this.createStaticNumberblock("static4", 5, 0, 0, -10);
        this.createStaticNumberblock("static5", 1, 5, 0, -10);
        
        // Listen for Numberblocks-specific messages
        this.onMessage("collectOperator", (client, message) => {
            this.handleCollectOperator(client, message);
        });
        
        this.onMessage("numberblockCollision", (client, message) => {
            this.handleNumberblockCollision(client, message);
        });
    }
    
    /**
     * Handle collect operator message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message sent by the client
     */
    handleCollectOperator(client, message) {
        const player = this.state.players.get(client.sessionId);
        const operator = this.state.entities.get(message.id);
        
        if (player && operator && operator.type === "operator") {
            // Set the player's operator
            player.operator = operator.operatorType;
            
            // Remove operator from state
            this.state.entities.delete(operator.id);
            console.log(`Player ${client.sessionId} collected ${operator.operatorType} operator`);
        }
    }
    
    /**
     * Handle numberblock collision message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message sent by the client
     */
    handleNumberblockCollision(client, message) {
        const player = this.state.players.get(client.sessionId);
        const targetId = message.targetId;
        let target;
        
        // Check if target is another player or a static numberblock
        if (this.state.players.has(targetId)) {
            target = this.state.players.get(targetId);
        } else if (this.state.entities.has(targetId) && 
                   this.state.entities.get(targetId).type === "staticNumberblock") {
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
     * Numberblocks-specific update logic
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Spawn operators periodically
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            // Count current operators
            let operatorCount = 0;
            this.state.entities.forEach(entity => {
                if (entity.type === "operator") {
                    operatorCount++;
                }
            });
            
            // Spawn operator if below maximum
            if (operatorCount < this.maxOperators) {
                this.spawnOperator();
            }
            
            this.spawnTimer = 0;
            this.spawnInterval = this.getRandomSpawnInterval();
        }
    }
    
    /**
     * Get a random spawn interval between 5-10 seconds
     * @returns {number} Spawn interval in seconds
     */
    getRandomSpawnInterval() {
        return 5 + Math.random() * 5; // 5-10 seconds
    }
    
    /**
     * Spawn a new operator
     */
    spawnOperator() {
        const id = `op_${Math.floor(Math.random() * 10000)}`;
        const operatorType = Math.random() > 0.5 ? "plus" : "minus";
        
        // Create operator with random position
        const operator = new Operator();
        operator.id = id;
        operator.operatorType = operatorType;
        
        // Set random position
        const mapSize = this.state.gameConfig.mapSize;
        operator.x = (Math.random() * mapSize) - (mapSize / 2);
        operator.y = 0.6; // Slightly above ground
        operator.z = (Math.random() * mapSize) - (mapSize / 2);
        
        // Add to state
        this.state.entities.set(id, operator);
        console.log(`Spawned ${operatorType} operator at (${operator.x.toFixed(2)}, ${operator.y}, ${operator.z.toFixed(2)})`);
    }
    
    /**
     * Create a static numberblock
     * @param {string} id Unique identifier
     * @param {number} value Numberblock value
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} z Z position
     */
    createStaticNumberblock(id, value, x, y, z) {
        const staticBlock = new StaticNumberblock();
        staticBlock.id = id;
        staticBlock.value = value;
        staticBlock.x = x;
        staticBlock.y = y || 0; // Default to ground level
        staticBlock.z = z;
        
        // Get a color based on the value
        staticBlock.color = this.getColorForNumber(value);
        
        // Add to state
        this.state.entities.set(id, staticBlock);
        console.log(`Created static numberblock with ID ${id}, value ${value} at (${x}, ${staticBlock.y}, ${z})`);
    }
    
    /**
     * Setup player with Numberblocks-specific properties
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     */
    setupPlayer(player, client, options) {
        // For Numberblocks implementation, set value to 1 and operator to empty
        player.value = 1;
        player.operator = "";
        
        // Convert to NumberblockPlayer if not already
        if (player.implementationType !== "numberblocks") {
            const nbPlayer = new NumberblockPlayer();
            
            // Copy properties
            nbPlayer.id = player.id;
            nbPlayer.name = player.name;
            nbPlayer.x = player.x;
            nbPlayer.y = player.y;
            nbPlayer.z = player.z;
            nbPlayer.rotationY = player.rotationY;
            nbPlayer.pitch = player.pitch;
            nbPlayer.velocityY = player.velocityY;
            nbPlayer.color = player.color;
            nbPlayer.input = player.input;
            
            // Return the new player
            return nbPlayer;
        }
        
        return player;
    }
    
    /**
     * Get color for a number value (Numberblocks specific)
     * @param {number} number The number value
     * @returns {string} Color in hex format
     */
    getColorForNumber(number) {
        const colors = {
            1: "#FF0000", // Red (One)
            2: "#FFA500", // Orange (Two)
            3: "#FFFF00", // Yellow (Three)
            4: "#00FF00", // Green (Four)
            5: "#0000FF", // Blue (Five)
            6: "#800080", // Purple (Six)
            7: "#FFC0CB", // Pink (Seven)
            8: "#A52A2A", // Brown (Eight)
            9: "#808080"  // Grey (Nine)
        };
        
        // For numbers greater than 9, cycle through the colors or use white
        return colors[number % 9] || "#FFFFFF";
    }
}

module.exports = { NumberblocksRoom }; 