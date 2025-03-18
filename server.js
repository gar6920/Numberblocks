// Import required modules
const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const { Room } = require("colyseus");
const { Schema, MapSchema, type } = require("@colyseus/schema");
const path = require('path');

// Define the InputState schema
class InputState extends Schema {
    constructor() {
        super();
        // Default initialization for input state
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        this.mouseDelta = { x: 0, y: 0 };
        this.viewMode = "third-person"; // Default view mode
    }
}

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
        this.operator = ""; // Changed from null to empty string
        this.color = "#FFFFFF";
        this.name = "";
        this.velocityY = 0; // Add velocity for physics
        this.input = new InputState();  // Initialize with InputState schema
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

// Create a dedicated schema for static numberblocks
class StaticNumberblock extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.value = 1;
        this.color = "#FFFFFF";
    }
}

// Add schemas for other entities
class Tree extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.scale = 1;
    }
}

class Rock extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.scale = 1;
    }
}

class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.operators = new MapSchema();
        this.staticNumberblocks = new MapSchema();
        this.trees = new MapSchema();
        this.rocks = new MapSchema();
    }
}

// Register schema types for InputState
type("boolean")(InputState.prototype, "keys.w");
type("boolean")(InputState.prototype, "keys.a");
type("boolean")(InputState.prototype, "keys.s");
type("boolean")(InputState.prototype, "keys.d");
type("boolean")(InputState.prototype, "keys.space");
type("number")(InputState.prototype, "mouseDelta.x");
type("number")(InputState.prototype, "mouseDelta.y");
type("string")(InputState.prototype, "viewMode");

// Register schema types for Player
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "z");
type("number")(Player.prototype, "value");
type("number")(Player.prototype, "rotationY");
type("number")(Player.prototype, "pitch");
type("string")(Player.prototype, "operator");
type("string")(Player.prototype, "color");
type("string")(Player.prototype, "name");
type("number")(Player.prototype, "velocityY");
type(InputState)(Player.prototype, "input"); // Use InputState type instead of wildcard

// Register schema types for Operator
type("string")(Operator.prototype, "id");
type("string")(Operator.prototype, "type");
type("number")(Operator.prototype, "x");
type("number")(Operator.prototype, "y");
type("number")(Operator.prototype, "z");

// Register schema types for StaticNumberblock
type("number")(StaticNumberblock.prototype, "x");
type("number")(StaticNumberblock.prototype, "y");
type("number")(StaticNumberblock.prototype, "z");
type("number")(StaticNumberblock.prototype, "value");
type("string")(StaticNumberblock.prototype, "color");

// Register schema types for Tree
type("number")(Tree.prototype, "x");
type("number")(Tree.prototype, "y");
type("number")(Tree.prototype, "z");
type("number")(Tree.prototype, "scale");

// Register schema types for Rock
type("number")(Rock.prototype, "x");
type("number")(Rock.prototype, "y");
type("number")(Rock.prototype, "z");
type("number")(Rock.prototype, "scale");

// Register schema types for GameState
type({ map: Player })(GameState.prototype, "players");
type({ map: Operator })(GameState.prototype, "operators");
type({ map: StaticNumberblock })(GameState.prototype, "staticNumberblocks"); // Updated to use StaticNumberblock
type({ map: Tree })(GameState.prototype, "trees");
type({ map: Rock })(GameState.prototype, "rocks");

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
        this.createStaticNumberblock("static1", 2, 2, 0, -5);
        this.createStaticNumberblock("static2", 3, 5, 0, -5);
        this.createStaticNumberblock("static3", 4, -5, 0, -5);
        this.createStaticNumberblock("static4", 5, 0, 0, -10);
        this.createStaticNumberblock("static5", 1, 5, 0, -10);
        
        console.log("Room initialized with GameState:", this.state);
        
        // Listen for input messages from clients
        this.onMessage("input", (client, message) => {
            // Check for version 2 (new input-based system)
            if (!message.version || message.version < 2) {
                return; // Ignore old messages
            }
            
            const player = this.state.players.get(client.sessionId);
            if (player && player.input) {
                // Update the InputState schema with the incoming data
                player.input.keys.w = message.keys.w || false;
                player.input.keys.a = message.keys.a || false;
                player.input.keys.s = message.keys.s || false;
                player.input.keys.d = message.keys.d || false;
                player.input.keys.space = message.keys.space || false;
                
                if (message.mouseDelta) {
                    player.input.mouseDelta.x = message.mouseDelta.x || 0;
                    player.input.mouseDelta.y = message.mouseDelta.y || 0;
                }
                
                // Update view mode if provided
                if (message.viewMode) {
                    player.input.viewMode = message.viewMode;
                }
                
                console.log(`Received input from player ${client.sessionId}:`, 
                    player.input.keys.w ? "W" : "", 
                    player.input.keys.a ? "A" : "", 
                    player.input.keys.s ? "S" : "", 
                    player.input.keys.d ? "D" : "");
            }
        });
        
        // Keep the existing move message handler for backward compatibility
        this.onMessage("move", (client, message) => {
            const player = this.state.players.get(client.sessionId);
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
            const player = this.state.players.get(client.sessionId);
            const operator = this.state.operators.get(message.id);
            
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
                this.state.operators.delete(operator.id);
                console.log(`Player ${client.sessionId} collected ${operator.type} operator`);
            }
        });
        
        this.onMessage("numberblockCollision", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            const targetId = message.targetId;
            let target;
            
            // Check if target is another player or a static numberblock
            if (this.state.players.has(targetId)) {
                target = this.state.players.get(targetId);
            } else if (this.state.staticNumberblocks.has(targetId)) {
                target = this.state.staticNumberblocks.get(targetId);
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
        // Calculate delta time (assuming 30fps)
        const deltaTime = 1/30;
        
        // Process player inputs and update positions
        this.state.players.forEach((player, sessionId) => {
            // Skip if no input data
            if (!player.input) return;
            
            // Handle player movement based on input state
            this.updatePlayerFromInput(player, deltaTime);
        });
        
        // Spawn operators periodically
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && Object.keys(this.state.operators).length < this.maxOperators) {
            this.spawnOperator();
            this.spawnTimer = 0;
            this.spawnInterval = this.getRandomSpawnInterval();
        }
    }
    
    // Update player position based on input state
    updatePlayerFromInput(player, deltaTime) {
        // Skip if no input
        if (!player.input || !player.input.keys) return;
        
        const input = player.input;
        const speed = 5.0 * deltaTime;
        
        // Handle rotation from mouse movement
        if (input.mouseDelta) {
            const sensitivity = 0.002;
            player.rotationY += input.mouseDelta.x * sensitivity;
            
            // Only update pitch in first-person mode
            if (input.viewMode === "first-person") {
                player.pitch += input.mouseDelta.y * sensitivity;
                // Clamp pitch to prevent flipping
                player.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.pitch));
            }
        }
        
        // Handle movement
        let dx = 0, dz = 0;
        if (input.keys.w) {
            dx += Math.sin(player.rotationY) * speed;
            dz += Math.cos(player.rotationY) * speed;
        }
        if (input.keys.s) {
            dx -= Math.sin(player.rotationY) * speed;
            dz -= Math.cos(player.rotationY) * speed;
        }
        if (input.keys.a) {
            dx += Math.sin(player.rotationY - Math.PI/2) * speed;
            dz += Math.cos(player.rotationY - Math.PI/2) * speed;
        }
        if (input.keys.d) {
            dx += Math.sin(player.rotationY + Math.PI/2) * speed;
            dz += Math.cos(player.rotationY + Math.PI/2) * speed;
        }
        
        // Apply movement
        player.x += dx;
        player.z += dz;
        
        // Handle Q/E rotation
        if (input.keys.q) {
            player.rotationY += 2.0 * deltaTime; // Turn left
        }
        if (input.keys.e) {
            player.rotationY -= 2.0 * deltaTime; // Turn right
        }
        
        // Handle jumping
        if (input.keys.space && player.y === 1) {
            player.velocityY = 0.2; // Jump velocity
        }
        
        // Apply gravity
        player.velocityY += -0.01; // Simple gravity
        player.y += player.velocityY;
        
        // Floor collision
        if (player.y < 1) {
            player.y = 1;
            player.velocityY = 0;
        }
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
        this.state.operators.set(id, operator); // Using .set() for MapSchema
        console.log(`Spawned ${type} operator at (${operator.x.toFixed(2)}, ${operator.y}, ${operator.z.toFixed(2)})`);
    }
    
    // Create a static numberblock (for players to interact with)
    createStaticNumberblock(id, value, x, y, z) {
        const staticBlock = new StaticNumberblock();
        staticBlock.value = value;
        staticBlock.x = x;
        staticBlock.y = y;
        staticBlock.z = z;
        
        this.state.staticNumberblocks.set(id, staticBlock); // Using .set() for MapSchema
        console.log(`Created static numberblock with ID ${id}, value ${value} at (${x}, ${y}, ${z})`);
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
