// Numberblocks game - Core networking module
// Handles connection to the server and basic network setup

// Network configuration
const endpoint = 'ws://localhost:3000';
let client = null;
let room = null;

// Helper function to generate random colors
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Import CSS2D renderer for player names if not already defined
let CSS2DObject;
let CSS2DRenderer;
try {
    // First check if THREE.CSS2D is available (Three.js r137+)
    if (THREE.CSS2D) {
        console.log("Using THREE.CSS2D namespace");
        CSS2DObject = THREE.CSS2D.CSS2DObject;
        CSS2DRenderer = THREE.CSS2D.CSS2DRenderer;
    } 
    // For older Three.js versions
    else if (THREE.CSS2DObject && THREE.CSS2DRenderer) {
        console.log("Using THREE.CSS2DObject directly");
        CSS2DObject = THREE.CSS2DObject;
        CSS2DRenderer = THREE.CSS2DRenderer;
    } 
    else {
        throw new Error("CSS2D modules not found in THREE");
    }
} catch (error) {
    console.warn("CSS2DObject not available, player name labels will not be shown:", error.message);
    
    // Create dummy versions that do nothing to prevent errors
    CSS2DObject = class DummyCSS2DObject {
        constructor(element) {
            this.element = element;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Euler();
            this.scale = new THREE.Vector3(1, 1, 1);
            this.visible = true;
        }
    };
    
    CSS2DRenderer = class DummyCSS2DRenderer {
        constructor() {
            this.domElement = document.createElement('div');
        }
        setSize() {}
        render() {}
    };
}

// Global tracking of all visuals
const visuals = {
    players: {},
    operators: {},
    staticNumberblocks: {},
    trees: {},
    rocks: {}
};

// Function to get color based on Numberblock value
function getColorForValue(value) {
    // Default colors for Numberblocks 1-10
    const colors = [
        '#FF0000', // 1 - Red
        '#FF7F00', // 2 - Orange
        '#FFFF00', // 3 - Yellow
        '#00FF00', // 4 - Green
        '#0000FF', // 5 - Blue
        '#4B0082', // 6 - Indigo
        '#8B00FF', // 7 - Violet
        '#964B00', // 8 - Brown
        '#808080', // 9 - Gray
        '#800080'  // 10 - Purple
    ];
    
    // Use value as index (adjusted for zero-based array)
    if (value >= 1 && value <= colors.length) {
        return colors[value - 1];
    }
    
    // Fall back to random color for higher values
    return getRandomColor();
}

// Setup automatic reconnection
function setupReconnection(room, client) {
    if (!room) return;
    
    // Handle WebSocket connection error
    room.onError((error) => {
        console.error("Connection error:", error);
        showErrorMessage("Connection error. Trying to reconnect...");
        addReconnectButton();
    });
    
    // Handle WebSocket disconnection
    room.onLeave((code) => {
        console.log(`Client left the room with code: ${code}`);
        showErrorMessage("Connection lost. Trying to reconnect...");
        
        // Attempt to reconnect automatically
        setTimeout(() => {
            console.log("Attempting to reconnect...");
            
            // Call initNetworking again
            initNetworking()
                .then(() => {
                    console.log("Reconnected successfully!");
                    showInfoMessage("Reconnected successfully!");
                    
                    // Remove reconnect button if it exists
                    const reconnectBtn = document.getElementById('reconnect-button');
                    if (reconnectBtn) {
                        reconnectBtn.remove();
                    }
                })
                .catch((e) => {
                    console.error("Failed to reconnect:", e);
                    showErrorMessage("Failed to reconnect. Please try again later.");
                });
        }, 2000);
    });
}

// Show error message
function showErrorMessage(message) {
    // Check if error message container exists
    let errorContainer = document.getElementById('error-message');
    
    // Create error container if it doesn't exist
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-message';
        errorContainer.style.position = 'fixed';
        errorContainer.style.top = '10px';
        errorContainer.style.left = '50%';
        errorContainer.style.transform = 'translateX(-50%)';
        errorContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorContainer.style.color = 'white';
        errorContainer.style.padding = '10px';
        errorContainer.style.borderRadius = '5px';
        errorContainer.style.zIndex = '1000';
        errorContainer.style.transition = 'opacity 0.5s';
        document.body.appendChild(errorContainer);
    }
    
    // Set message
    errorContainer.textContent = message;
    errorContainer.style.opacity = '1';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        errorContainer.style.opacity = '0';
    }, 5000);
}

// Show info message
function showInfoMessage(message) {
    // Check if info message container exists
    let infoContainer = document.getElementById('info-message');
    
    // Create info container if it doesn't exist
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.id = 'info-message';
        infoContainer.style.position = 'fixed';
        infoContainer.style.top = '10px';
        infoContainer.style.left = '50%';
        infoContainer.style.transform = 'translateX(-50%)';
        infoContainer.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
        infoContainer.style.color = 'white';
        infoContainer.style.padding = '10px';
        infoContainer.style.borderRadius = '5px';
        infoContainer.style.zIndex = '1000';
        infoContainer.style.transition = 'opacity 0.5s';
        document.body.appendChild(infoContainer);
    }
    
    // Set message
    infoContainer.textContent = message;
    infoContainer.style.opacity = '1';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        infoContainer.style.opacity = '0';
    }, 3000);
}

// Add reconnect button
function addReconnectButton() {
    // Check if reconnect button already exists
    if (document.getElementById('reconnect-button')) {
        return;
    }
    
    // Create button
    const reconnectBtn = document.createElement('button');
    reconnectBtn.id = 'reconnect-button';
    reconnectBtn.textContent = 'Reconnect to Server';
    reconnectBtn.style.position = 'fixed';
    reconnectBtn.style.top = '50%';
    reconnectBtn.style.left = '50%';
    reconnectBtn.style.transform = 'translate(-50%, -50%)';
    reconnectBtn.style.padding = '10px 20px';
    reconnectBtn.style.backgroundColor = '#4CAF50';
    reconnectBtn.style.color = 'white';
    reconnectBtn.style.border = 'none';
    reconnectBtn.style.borderRadius = '5px';
    reconnectBtn.style.cursor = 'pointer';
    reconnectBtn.style.zIndex = '1000';
    reconnectBtn.style.fontSize = '16px';
    
    // Add hover effect
    reconnectBtn.onmouseover = function() {
        this.style.backgroundColor = '#45a049';
    };
    
    reconnectBtn.onmouseout = function() {
        this.style.backgroundColor = '#4CAF50';
    };
    
    // Add click handler
    reconnectBtn.onclick = function() {
        console.log("Reconnect button clicked");
        this.textContent = 'Connecting...';
        this.disabled = true;
        
        // Try to reconnect
        initNetworking()
            .then(() => {
                console.log("Reconnected successfully!");
                this.remove();
            })
            .catch((e) => {
                console.error("Failed to reconnect:", e);
                this.textContent = 'Reconnect to Server';
                this.disabled = false;
                showErrorMessage("Failed to reconnect. Please try again.");
            });
    };
    
    // Add to body
    document.body.appendChild(reconnectBtn);
}

// Function to initialize networking for multiplayer
async function initNetworking() {
    const endpoint = "ws://localhost:3000";
    console.log("Initializing networking system...");
    
    try {
        console.log(`Connecting to Colyseus server at: ${endpoint}`);
        
        // Create client if needed
        if (!client) {
            try {
                client = new Colyseus.Client(endpoint);
                console.log("Colyseus client created");
            } catch (clientError) {
                console.error("Failed to create Colyseus client:", clientError);
                throw new Error(`Failed to create client: ${clientError.message}`);
            }
        }
        
        // Try to join the room
        try {
            console.log("Attempting to join room...");
            room = await client.joinOrCreate("numberblocks", {
                name: `Player_${Math.floor(Math.random() * 1000)}`,
                color: getRandomColor()
            });
            console.log("Joined room successfully:", room.name);
            
            // Store room in global scope
            window.room = room;
            
            // Initialize object collections
            window.otherPlayers = {};
            window.operators = {};
            window.staticNumberblocks = {};
            window.trees = {};
            window.rocks = {};
            
            // Setup message handlers
            setupMessageHandlers();
            
            // Setup automatic reconnection
            setupReconnection(room, client);
            
            // Wait for the initial state before setting up listeners
            room.onStateChange.once((state) => {
                setupRoomListeners(room);
                setupRoomPlayerListeners(room);
                
                // Explicitly create local player object
                window.myPlayer = new Player({ 
                    id: window.room.sessionId, 
                    isLocalPlayer: true,
                    value: 1, 
                    color: "#FFFF00"
                });
                console.log("Local player created and linked to existing Numberblock mesh:", window.myPlayer);
                
                animate();
                window.dispatchEvent(new CustomEvent('avatarReady'));
            });
            
            
            
            return room;
        } catch (roomError) {
            console.error("Error joining room:", roomError);
            throw roomError;
        }
    } catch (error) {
        console.error("Error connecting to server:", error);
        throw error;
    }
}

// Setup message handlers
function setupMessageHandlers() {
    if (!room) return;
    
    // Listen for custom messages from the server
    room.onMessage("numberblock-collision", (message) => {
        console.log("Collision message received:", message);
        
        // Update player value if needed
        if (window.player && window.player.value !== undefined && message.newValue) {
            window.player.value = message.newValue;
            
            // Update HUD
            if (window.updateHUD) {
                window.updateHUD();
            }
        }
    });
    
    room.onMessage("server-event", (message) => {
        console.log("Server event received:", message);
        // Process server events if needed
    });
}

// Send player position updates to the server
// Send player position updates to the server correctly


// Send numberblock collision message
function sendNumberblockCollision(targetId) {
    if (!room) return;
    
    room.send("numberblock-collision", { targetId: targetId });
}

// Player joined callback
function onPlayerJoin(player) {
    console.log(`Player joined! ID: ${player.sessionId}`);
    
    // If it's our own join, update the interface
    if (player.sessionId === room.sessionId) {
        console.log("This is us joining!");
        
        // Set initial player values on the server
        player.name = window.playerName || "Player";
        player.color = window.playerColor || "#3366cc";
        
        // Show multiplayer notification
        showInfoMessage("Connected to multiplayer server!");
    } else {
        console.log(`Other player joined: ${player.name || "Unnamed player"}`);
        
        // Create a new numberblock for this player
        createRemotePlayerObject(player);
    }
    
    // Update the player list in the UI
    updatePlayerListUI();
}

// Create 3D object for remote player
function createRemotePlayerObject(player) {
    if (!window.scene) {
        console.error("Scene not available to create remote player object");
        return;
    }
    
    // Create a numberblock mesh for the remote player
    const remotePlayerObject = new Numberblock(player.value || 1);
    remotePlayerObject.id = player.sessionId;
    remotePlayerObject.mesh.position.set(player.x || 0, player.y || 1, player.z || 0);
    
    // Add to scene
    window.scene.add(remotePlayerObject.mesh);
    
    // Store in global collection
    window.remotePlayers = window.remotePlayers || {};
    window.remotePlayers[player.sessionId] = remotePlayerObject;
    
    console.log(`Created remote player object for ${player.sessionId}`);
}

// Player left callback
function onPlayerLeave(player) {
    console.log(`Player left: ${player.sessionId}`);
    
    // Remove player from the scene
    if (window.remotePlayers && window.remotePlayers[player.sessionId]) {
        console.log(`Removing remote player object for ${player.sessionId}`);
        
        // Remove mesh from scene
        if (window.scene && window.remotePlayers[player.sessionId].mesh) {
            window.scene.remove(window.remotePlayers[player.sessionId].mesh);
        }
        
        // Delete player object
        delete window.remotePlayers[player.sessionId];
    }
    
    // Update the player list in the UI
    updatePlayerListUI();
}

// Update player list UI
window.updatePlayerListUI = function() {
    const playerListElement = document.getElementById('player-list');
    if (!playerListElement) return;
    
    // Clear current list
    playerListElement.innerHTML = '';
    
    // Ensure room and state are available
    if (!window.room || !window.room.state) {
        playerListElement.innerHTML = '<li>Not connected to server</li>';
        return;
    }
    
    // Add each player to the list
    window.room.state.players.forEach((player, key) => {
        const playerElement = document.createElement('li');
        
        // Highlight current player
        if (key === window.room.sessionId) {
            playerElement.classList.add('current-player');
        }
        
        // Show player info
        playerElement.innerHTML = `
            <span class="player-name">${player.name || 'Unnamed'}</span>
            <span class="player-value">${player.value || 1}</span>
        `;
        
        // Add to list
        playerListElement.appendChild(playerElement);
    });
};

// Update remote players in the scene
window.updateRemotePlayers = function() {
    if (!window.room || !window.room.state || !window.scene) return;
    
    // Get list of all players from server
    window.room.state.players.forEach((player, sessionId) => {
        // Skip local player
        if (sessionId === window.room.sessionId) return;
        
        // Create remote player object if it doesn't exist
        if (!window.remotePlayers || !window.remotePlayers[sessionId]) {
            createRemotePlayerObject(player);
        }
        
        // Update remote player position and rotation
        const remotePlayer = window.remotePlayers[sessionId];
        if (remotePlayer && remotePlayer.mesh) {
            // Update position with smooth lerping
            const lerpFactor = 0.3; // Smoothing factor for remote player movement
            
            remotePlayer.mesh.position.x = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.x, 
                player.x, 
                lerpFactor
            );
            
            remotePlayer.mesh.position.y = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.y, 
                player.y, 
                lerpFactor
            );
            
            remotePlayer.mesh.position.z = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.z, 
                player.z, 
                lerpFactor
            );
            
            // Update rotation
            remotePlayer.mesh.rotation.y = player.rotationY;
            
            // Update numberblock value if changed
            if (remotePlayer.value !== player.value) {
                // Remove old mesh
                if (remotePlayer.mesh.parent) {
                    remotePlayer.mesh.parent.remove(remotePlayer.mesh);
                }
                
                // Create new numberblock with updated value
                const newNumberblock = new Numberblock(player.value);
                newNumberblock.id = sessionId;
                newNumberblock.mesh.position.copy(remotePlayer.mesh.position);
                newNumberblock.mesh.rotation.y = remotePlayer.mesh.rotation.y;
                
                // Add to scene
                window.scene.add(newNumberblock.mesh);
                
                // Update reference
                window.remotePlayers[sessionId] = newNumberblock;
            }
        }
    });
};

// Make functions available globally
window.initNetworking = initNetworking;
window.setupMessageHandlers = setupMessageHandlers;
window.sendNumberblockCollision = sendNumberblockCollision;
window.getRandomColor = getRandomColor;
window.getColorForValue = getColorForValue;
window.CSS2DObject = CSS2DObject;
window.CSS2DRenderer = CSS2DRenderer;
window.onPlayerJoin = onPlayerJoin;
window.onPlayerLeave = onPlayerLeave;
