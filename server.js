// Import required modules
const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const { Room } = require("colyseus");
const { Schema, type } = require("@colyseus/schema");
const path = require('path');

// Define the state schema for Colyseus
class Player extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 1;
        this.z = 0;
        this.value = 1;
        this.rotationY = 0;
        this.pitch = 0;
        this.operator = null;
        this.color = null;
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
        this.players = {};
        this.operators = {};
        this.staticNumberblocks = {};
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
        
        // Listen for messages from clients
        this.onMessage("move", (client, message) => {
            const player = this.state.players[client.sessionId];
            if (player) {
                // Validate movement with speed limit
                const speedLimit = 5.0 * (1/30); // moveSpeed * delta
                const dx = message.x - player.x;
                const dz = message.z - player.z;
                
                // Simple distance check for speed hacking prevention
                if (Math.sqrt(dx * dx + dz * dz) <= speedLimit) {
                    player.x = message.x;
                    player.y = message.y;
                    player.z = message.z;
                    player.rotationY = message.rotationY;
                    player.pitch = message.pitch;
                } else {
                    console.log(`Rejected movement from ${client.sessionId}: too fast`);
                    // Could send a correction message here
                }
            }
        });
        
        this.onMessage("collectOperator", (client, message) => {
            const player = this.state.players[client.sessionId];
            const operator = this.state.operators[message.id];
            
            if (player && operator) {
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
        staticBlock.y = y;
        staticBlock.z = z;
        
        this.state.staticNumberblocks[id] = staticBlock;
        console.log(`Created static numberblock with ID ${id}, value ${value} at (${x}, ${y}, ${z})`);
    }
    
    onJoin(client, options) {
        console.log(`${client.sessionId} joined the game`);
        
        // Create player with initial state
        const player = new Player();
        player.x = 0;
        player.y = 1;
        player.z = 5; // Starting position
        player.value = 1;
        player.color = this.getColorForPlayer(Object.keys(this.state.players).length);
        
        // Add player to room state
        this.state.players[client.sessionId] = player;
    }
    
    onLeave(client, consented) {
        console.log(`${client.sessionId} left the game`);
        
        // Remove player from room state
        delete this.state.players[client.sessionId];
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
