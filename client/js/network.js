// Numberblocks game - Network functionality for Colyseus integration

// Global variables for networking
let room = null;
let client = null;
let players = {}; // Store other player objects by sessionId
let operators = {}; // Store operators by their id
let staticNumberblocks = {}; // Store static numberblocks
let localSessionId = null; // Store our own session ID
let playerUpdateFrequency = 1000 / 10; // Update server 10 times per second
let lastUpdateTime = 0;

// Initialize client and connect to Colyseus server
async function initNetworking() {
    console.log("Initializing networking with Colyseus...");
    
    // Create Colyseus client
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const endpoint = `${protocol}://${window.location.hostname}:${window.location.port}`;
    client = new Colyseus.Client(endpoint);
    
    try {
        // Join or create a room
        room = await client.joinOrCreate("numberblocks");
        console.log("Successfully joined Numberblocks room!");
        
        // Store our session ID
        localSessionId = room.sessionId;
        console.log("My session ID:", localSessionId);
        
        // Set up event listeners for room state changes
        setupRoomHandlers();
        
        return true;
    } catch (error) {
        console.error("Failed to join Numberblocks room:", error);
        return false;
    }
}

// Set up handlers for room state changes
function setupRoomHandlers() {
    // Handle initial state and state changes
    room.onStateChange((state) => {
        // This is called whenever the room state changes
        console.log("Room state updated:", state);
    });
    
    // Handle when a player joins
    room.state.players.onAdd((player, sessionId) => {
        console.log(`Player ${sessionId} joined`);
        
        // Skip if this is ourselves (we'll handle local player differently)
        if (sessionId === localSessionId) {
            return;
        }
        
        // Create a new numberblock for this player
        const numberblock = new Numberblock(player.value, player.color);
        scene.add(numberblock.mesh);
        
        // Store the player object
        players[sessionId] = {
            sessionId: sessionId,
            numberblock: numberblock,
            lastKnownPosition: new THREE.Vector3(player.x, player.y, player.z),
            currentPosition: new THREE.Vector3(player.x, player.y, player.z),
            rotationY: player.rotationY,
            pitch: player.pitch,
        };
        
        // Add player to the player list UI
        updatePlayerListUI();
        
        // Listen for player property changes
        player.onChange(() => {
            // Update player value if needed
            if (players[sessionId].numberblock.value !== player.value) {
                players[sessionId].numberblock.value = player.value;
                players[sessionId].numberblock.createNumberblock(); // Update visual to match new value
            }
            
            // Update position and rotation data
            players[sessionId].lastKnownPosition.copy(players[sessionId].currentPosition);
            players[sessionId].currentPosition.set(player.x, player.y, player.z);
            players[sessionId].rotationY = player.rotationY;
            players[sessionId].pitch = player.pitch;
        });
    });
    
    // Handle when a player leaves
    room.state.players.onRemove((player, sessionId) => {
        console.log(`Player ${sessionId} left`);
        
        // Clean up player object if it exists
        if (players[sessionId]) {
            // Remove mesh from scene
            scene.remove(players[sessionId].numberblock.mesh);
            
            // Remove player from our list
            delete players[sessionId];
            
            // Update UI
            updatePlayerListUI();
        }
    });
    
    // Handle operators being added
    room.state.operators.onAdd((operator, operatorId) => {
        console.log(`Operator ${operatorId} (${operator.type}) added`);
        
        // Create a new operator and add it to the scene
        const newOperator = new Operator(operator.type, scene);
        newOperator.setPosition(operator.x, operator.y, operator.z);
        
        // Store the operator
        operators[operatorId] = {
            id: operatorId,
            operator: newOperator
        };
    });
    
    // Handle operators being removed
    room.state.operators.onRemove((operator, operatorId) => {
        console.log(`Operator ${operatorId} removed`);
        
        // Clean up operator if it exists
        if (operators[operatorId]) {
            operators[operatorId].operator.remove();
            delete operators[operatorId];
        }
    });
    
    // Handle static numberblocks
    room.state.staticNumberblocks.onAdd((staticBlock, blockId) => {
        console.log(`Static numberblock ${blockId} added with value ${staticBlock.value}`);
        
        // Create a new numberblock and add it to the scene
        const numberblock = new Numberblock(staticBlock.value);
        numberblock.mesh.position.set(staticBlock.x, staticBlock.y, staticBlock.z);
        scene.add(numberblock.mesh);
        
        // Store the static numberblock
        staticNumberblocks[blockId] = {
            id: blockId,
            numberblock: numberblock
        };
    });
    
    // Handle static numberblocks being removed
    room.state.staticNumberblocks.onRemove((staticBlock, blockId) => {
        console.log(`Static numberblock ${blockId} removed`);
        
        // Clean up static numberblock if it exists
        if (staticNumberblocks[blockId]) {
            scene.remove(staticNumberblocks[blockId].numberblock.mesh);
            delete staticNumberblocks[blockId];
        }
    });
}

// Send player position and rotation to the server
function sendPlayerUpdate(position, rotationY, pitch, value) {
    if (!room) return;
    
    const now = performance.now();
    if (now - lastUpdateTime >= playerUpdateFrequency) {
        lastUpdateTime = now;
        
        room.send("move", {
            x: position.x,
            y: position.y,
            z: position.z,
            rotationY: rotationY,
            pitch: pitch
        });
    }
}

// Send operator collection to the server
function sendOperatorCollection(operatorId) {
    if (!room) return;
    
    room.send("collectOperator", {
        id: operatorId
    });
}

// Send numberblock collision to the server
function sendNumberblockCollision(targetId) {
    if (!room) return;
    
    room.send("numberblockCollision", {
        targetId: targetId
    });
}

// Interpolate other players' positions
function interpolatePlayerPositions(deltaTime) {
    const lerpFactor = 0.2; // Adjust for smoother/faster movement
    
    Object.values(players).forEach(player => {
        // Skip interpolation if positions are the same
        if (player.lastKnownPosition.equals(player.currentPosition)) return;
        
        // Interpolate position
        player.numberblock.mesh.position.lerpVectors(
            player.lastKnownPosition,
            player.currentPosition,
            lerpFactor
        );
        
        // Adjust numberblock rotation
        // This is a simplistic approach; could be improved with quaternion interpolation
        player.numberblock.mesh.rotation.y = player.rotationY;
    });
}

// Update player list in UI
function updatePlayerListUI() {
    const playerListElement = document.getElementById('player-list');
    if (!playerListElement) return;
    
    // Clear current list
    playerListElement.innerHTML = '';
    
    // Add all players including local player
    const allPlayers = { ...players };
    if (room) {
        // Only add local player to list if we have room connection
        const myPlayer = room.state.players[localSessionId];
        if (myPlayer) {
            const colorDiv = document.createElement('div');
            colorDiv.style.cssText = `
                display: inline-block;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background-color: ${myPlayer.color || '#FF0000'};
                margin-right: 5px;
                vertical-align: middle;
            `;
            
            const playerEntry = document.createElement('div');
            playerEntry.innerHTML = `${colorDiv.outerHTML} You (${myPlayer.value})`;
            playerEntry.style.marginBottom = '5px';
            playerEntry.style.color = 'white';
            playerListElement.appendChild(playerEntry);
        }
    }
    
    // Add other players
    Object.entries(allPlayers).forEach(([sessionId, player]) => {
        const remotePlayer = room.state.players[sessionId];
        if (!remotePlayer) return;
        
        const colorDiv = document.createElement('div');
        colorDiv.style.cssText = `
            display: inline-block;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background-color: ${remotePlayer.color || '#FFFFFF'};
            margin-right: 5px;
            vertical-align: middle;
        `;
        
        const playerEntry = document.createElement('div');
        playerEntry.innerHTML = `${colorDiv.outerHTML} Player (${remotePlayer.value})`;
        playerEntry.style.marginBottom = '5px';
        playerEntry.style.color = 'white';
        playerListElement.appendChild(playerEntry);
    });
}

// Check for operator collision with player
function checkOperatorCollisions(playerPosition, playerRadius) {
    if (!room) return null;
    
    for (const [operatorId, operatorData] of Object.entries(operators)) {
        const operatorMesh = operatorData.operator.mesh;
        const operatorPos = operatorMesh.position;
        
        // Simple distance check
        const dx = playerPosition.x - operatorPos.x;
        const dy = playerPosition.y - operatorPos.y;
        const dz = playerPosition.z - operatorPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < (playerRadius + operatorData.operator.collisionRadius)) {
            // Collision detected
            return operatorId;
        }
    }
    
    return null;
}

// Check for numberblock collision with player
function checkNumberblockCollisions(playerPosition, playerRadius) {
    if (!room) return null;
    
    // Check collision with static numberblocks
    for (const [blockId, blockData] of Object.entries(staticNumberblocks)) {
        const blockMesh = blockData.numberblock.mesh;
        const blockPos = blockMesh.position;
        
        // Simple distance check (could be improved with bounding box)
        const dx = playerPosition.x - blockPos.x;
        const dy = playerPosition.y - blockPos.y;
        const dz = playerPosition.z - blockPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < (playerRadius + 1.0)) { // Using 1.0 as a default block radius
            // Collision detected
            return blockId;
        }
    }
    
    // Check collision with other players (except self)
    for (const [sessionId, playerData] of Object.entries(players)) {
        // Skip ourselves
        if (sessionId === localSessionId) continue;
        
        const otherPlayerPos = playerData.numberblock.mesh.position;
        
        // Simple distance check
        const dx = playerPosition.x - otherPlayerPos.x;
        const dy = playerPosition.y - otherPlayerPos.y;
        const dz = playerPosition.z - otherPlayerPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < (playerRadius + 1.0)) { // Using 1.0 as a default player radius
            // Collision detected
            return sessionId;
        }
    }
    
    return null;
}

// Clean up networking resources when leaving or closing the page
window.addEventListener('beforeunload', () => {
    if (room) {
        room.leave();
    }
});
