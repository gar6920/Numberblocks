// Import required modules
const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const { Room } = require("colyseus");
const { Schema, MapSchema, type } = require("@colyseus/schema");
const path = require('path');

// Define the state schema for Colyseus
class Player extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 1;
        this.z = 5;
        this.value = 1;
        this.rotationY = 0;
        this.pitch = 0;
        this.operator = null;
        this.color = "#FFFFFF";
        this.name = "";
    }
}

class Operator extends Schema {
    constructor() {
        super();
        this.id = "";
        this.type = ""; // 'plus' or 'minus'
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}

class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.operators = new MapSchema();
        this.staticNumberblocks = new MapSchema();
    }
}

// Register schema types
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "z");
type("number")(Player.prototype, "value");
type("number")(Player.prototype, "rotationY");
type("number")(Player.prototype, "pitch");
type("string")(Player.prototype, "operator");
type("string")(Player.prototype, "color");
type("string")(Player.prototype, "name");

type("string")(Operator.prototype, "id");
type("string")(Operator.prototype, "type");
type("number")(Operator.prototype, "x");
type("number")(Operator.prototype, "y");
type("number")(Operator.prototype, "z");

type({ map: Player })(GameState.prototype, "players");
type({ map: Operator })(GameState.prototype, "operators");
type({ map: Player })(GameState.prototype, "staticNumberblocks");

// Define the game room
class NumberblocksRoom extends Room {
    onCreate(options) {
        console.log("NumberblocksRoom created!", options);
        
        // Initialize room state
        this.setState(new GameState());
        
        // Set maximum number of clients
        this.maxClients = 4;
        
        // Set frequency of patches to send
        this.setPatchRate(1000 / 30); // 30 fps
        
        // Set simulation interval for server-side logic
        this.setSimulationInterval(() => this.update());
        
        // Setup operator spawning system
        this.spawnTimer = 0;
        this.spawnInterval = this.getRandomSpawnInterval();
        this.maxOperators = 10;
        
        // Setup static numberblocks
        this.createStaticNumberblock("static1", 2, 0, 0, -5);
        this.createStaticNumberblock("static2", 3, 5, 0, -5);
        this.createStaticNumberblock("static3", 4, -5, 0, -5);
        this.createStaticNumberblock("static4", 5, 0, 0, -10);
        this.createStaticNumberblock("static5", 1, 5, 0, -10);
        
        console.log("Room initialized with GameState:", this.state);
        
        // Listen for messages from clients
        this.onMessage("move", (client, message) => {
            const player = this.state.players[client.sessionId];
            if (player) {
                // Validate movement with speed limit
                const speedLimit = 5.0 * (1/30); // moveSpeed * delta
                const dx = message.x - player.x;
                const dz = message.z - player.z;
                
                // Simple distance check for speed hacking prevention
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance <= speedLimit * 2) { // Allow some flexibility with speed
                    player.x = message.x;
                    player.y = message.y;
                    player.z = message.z;
                    player.rotationY = message.rotationY;
                    player.pitch = message.pitch;
                    
                    // Debug log occasional position updates (every 5 seconds)
                    if (Math.random() < 0.01) {
                        console.log(`Player ${client.sessionId} at position: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)})`);
                    }
                } else {
                    console.log(`Rejected movement from ${client.sessionId}: too fast (${distance.toFixed(2)} > ${speedLimit.toFixed(2)})`);
                    // Send correction message
                    client.send("correction", {
                        x: player.x,
                        y: player.y,
                        z: player.z
                    });
                }
            }
        });
        
        this.onMessage("collectOperator", (client, message) => {
            const player = this.state.players[client.sessionId];
            const operator = this.state.operators[message.id];
            
            if (player && operator) {
                // Set the player's operator explicitly
                player.operator = operator.type;
                
                // Apply operator effect
                if (operator.type === "plus") {
                    player.value++;
                } else if (operator.type === "minus" && player.value > 1) {
                    player.value--;
                }
                
                // Remove operator from state
                delete this.state.operators[operator.id];
                console.log(`Player ${client.sessionId} collected ${operator.type} operator`);
            }
        });
        
        this.onMessage("numberblockCollision", (client, message) => {
            const player = this.state.players[client.sessionId];
            const targetId = message.targetId;
            let target;
            
            // Check if target is another player or a static numberblock
            if (this.state.players[targetId]) {
                target = this.state.players[targetId];
            } else if (this.state.staticNumberblocks[targetId]) {
                target = this.state.staticNumberblocks[targetId];
            }
            
            if (player && target) {
                // Handle the collision based on operator
                if (player.operator === "plus") {
                    player.value += target.value;
                    player.operator = null;
                } else if (player.operator === "minus" && player.value > target.value) {
                    player.value -= target.value;
                    player.operator = null;
                }
                
                // If target was a static numberblock, we don't change it
                // If target was another player, we'd need additional logic here
            }
        });
    }
    
    update() {
        // Spawn operators periodically
        this.spawnTimer += 1/30; // Assuming 30 fps
        if (this.spawnTimer >= this.spawnInterval && Object.keys(this.state.operators).length < this.maxOperators) {
            this.spawnOperator();
            this.spawnTimer = 0;
            this.spawnInterval = this.getRandomSpawnInterval();
        }
        
        // Check for collisions between players (could be added here)
    }
    
    // Get a random spawn interval between 5-10 seconds
    getRandomSpawnInterval() {
        return 5 + Math.random() * 5; // 5-10 seconds
    }
    
    // Spawn a new operator
    spawnOperator() {
        const id = `op_${Math.floor(Math.random() * 10000)}`;
        const type = Math.random() > 0.5 ? "plus" : "minus";
        
        // Create operator with random position
        const operator = new Operator();
        operator.id = id;
        operator.type = type;
        
        // Set random position (40x40 map)
        const mapSize = 40;
        operator.x = (Math.random() * mapSize) - (mapSize / 2);
        operator.y = 0.6; // Slightly above ground
        operator.z = (Math.random() * mapSize) - (mapSize / 2);
        
        // Add to state
        this.state.operators[id] = operator;
        console.log(`Spawned ${type} operator at (${operator.x.toFixed(2)}, ${operator.y}, ${operator.z.toFixed(2)})`);
    }
    
    // Create a static numberblock (for players to interact with)
    createStaticNumberblock(id, value, x, y, z) {
        const staticBlock = new Player();
        staticBlock.value = value;
        staticBlock.x = x;
        // Set Y position to 0 (ground level)
        staticBlock.y = 0;
        staticBlock.z = z;
        
        this.state.staticNumberblocks[id] = staticBlock;
        console.log(`Created static numberblock with ID ${id}, value ${value} at (${x}, ${staticBlock.y}, ${z})`);
    }
    
    onJoin(client, options) {
        console.log(`Client joined: ${client.sessionId}`);
        
        // Create a new player instance
        const player = new Player();
        
        // Set initial player position
        player.x = 0;
        player.y = 1;
        player.z = 5; // Start slightly behind origin
        
        // Set player value and other properties
        player.value = 1;
        // Use client ID as the player name for now
        player.name = client.sessionId;
        player.color = this.getColorForPlayer(Object.keys(this.state.players).length);
        
        // Add player to game state - using .set() method for MapSchema
        this.state.players.set(client.sessionId, player);
        
        console.log(`Player ${player.name} (${client.sessionId}) joined with color ${player.color}`);
        console.log(`Current players in room:`, JSON.stringify(this.state.players));
        console.log(`Total players:`, this.state.players.size);
    }
    
    onLeave(client, consented) {
        console.log(`${client.sessionId} left the game`);
        
        // Remove player from room state - use delete() method for MapSchema
        this.state.players.delete(client.sessionId);
        
        console.log(`Player ${client.sessionId} removed. Remaining players: ${this.state.players.size}`);
    }
    
    // Get a distinct color for each player
    getColorForPlayer(index) {
        const colors = [
            "#FF0000", // Red
            "#00FF00", // Green
            "#0000FF", // Blue
            "#FFFF00"  // Yellow
        ];
        return colors[index % colors.length];
    }
}

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up static file serving
app.use(express.static(path.join(__dirname, 'client')));

// Serve the main index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Create and attach Colyseus server
const gameServer = new Server({
    server,
    express: app
});

// Define room handlers
gameServer.define("numberblocks", NumberblocksRoom);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Numberblocks game server is running on http://localhost:${port}`);
});
