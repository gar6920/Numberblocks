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
    // Get endpoint from gameConfig if available, or use default
    const endpoint = window.gameConfig?.networkSettings?.serverUrl || "ws://localhost:3000";
    // Get room name from gameConfig if available, or use default
    const roomName = window.gameConfig?.networkSettings?.roomName || "default";
    
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
            console.log(`Attempting to join room: ${roomName}`);
            room = await client.joinOrCreate(roomName, {
                name: `Player_${Math.floor(Math.random() * 1000)}`,
                color: getRandomColor()
            });
            console.log(`Joined room successfully: ${room.name}`);
            
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
                
                // Set up fallback polling for players without onChange
                if (typeof window.setupPlayerPolling === 'function') {
                    window.setupPlayerPolling();
                }
                
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
    
    console.log("Creating remote player:", player);
    
    try {
        // Create a player object for the remote player
        // Use DefaultPlayer if available, otherwise fallback to base Player
        const PlayerClass = window.DefaultPlayer || window.Player;
        const remotePlayer = new PlayerClass({
            id: player.sessionId,
            isLocalPlayer: false,
            color: player.color || 0x3366CC,
            value: player.value || 1
        });
        
        // Set position and rotation
        remotePlayer.mesh.position.set(player.x || 0, player.y || 0, player.z || 0);
        remotePlayer.mesh.rotation.y = player.rotationY || 0;
        
        // Add to scene
        window.scene.add(remotePlayer.mesh);
        
        // Store in global collections
        window.otherPlayers = window.otherPlayers || {};
        window.otherPlayers[player.sessionId] = remotePlayer;
        
        // Also store in visuals collection
        window.visuals = window.visuals || {};
        window.visuals.players = window.visuals.players || {};
        window.visuals.players[player.sessionId] = remotePlayer;
        
        console.log(`Created remote player object for ${player.sessionId}`);
        return remotePlayer;
    } catch (error) {
        console.error("Failed to create remote player:", error);
    }
}

// Player left callback
function onPlayerLeave(player) {
    console.log(`Player left: ${player.sessionId}`);
    
    try {
        // Remove player from the scene - check multiple collections
        // Check otherPlayers collection
        if (window.otherPlayers && window.otherPlayers[player.sessionId]) {
            console.log(`Removing player from otherPlayers: ${player.sessionId}`);
            
            // Remove mesh from scene
            if (window.scene && window.otherPlayers[player.sessionId].mesh) {
                window.scene.remove(window.otherPlayers[player.sessionId].mesh);
            }
            
            // Delete player object
            delete window.otherPlayers[player.sessionId];
        }
        
        // Also check visuals.players collection
        if (window.visuals && window.visuals.players && window.visuals.players[player.sessionId]) {
            console.log(`Removing player from visuals: ${player.sessionId}`);
            
            // Remove mesh from scene if not already removed
            if (window.scene && window.visuals.players[player.sessionId].mesh) {
                window.scene.remove(window.visuals.players[player.sessionId].mesh);
            }
            
            // Delete from visuals
            delete window.visuals.players[player.sessionId];
        }
        
        // Update the player list in the UI
        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
            window.playerUI.updatePlayerListUI();
        } else {
            updatePlayerListUI();
        }
    } catch (error) {
        console.error("Error removing player:", error);
    }
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

// Setup room-level listeners specifically for Players
function setupRoomPlayerListeners(room) {
    if (!room || !room.state) {
        console.warn('[setupRoomPlayerListeners] Room or state not available yet.');
        return;
    }

    console.log('[setupRoomPlayerListeners] Setting up player listeners...');
    console.log('[setupRoomPlayerListeners] Current state structure:', Object.keys(room.state));
    console.log('[setupRoomPlayerListeners] Players collection exists:', !!room.state.players);
    
    if (room.state.players) {
        console.log('[setupRoomPlayerListeners] Current player count:', room.state.players.size);
        
        // Process existing players
        console.log('[setupRoomPlayerListeners] Processing existing players');
        room.state.players.forEach((player, sessionId) => {
            console.log(`Setting up existing player: ${sessionId}`, player);
            
            // Create remote player for other players
            if (sessionId !== room.sessionId) {
                createRemotePlayerObject(player);
            }
        });
        
        // Update UI immediately to show all players
        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
            window.playerUI.updatePlayerListUI();
        }
        
        // Listen for player added events
        room.state.players.onAdd = (player, sessionId) => {
            console.log(`Player added: ${sessionId}`, player);
            
            // Skip local player
            if (sessionId === room.sessionId) return;
            
            // Create remote player object
            createRemotePlayerObject(player);
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            }
        };
        
        // Listen for player removed events
        room.state.players.onRemove = (player, sessionId) => {
            console.log(`Player removed: ${sessionId}`);
            
            // Remove player
            onPlayerLeave({ sessionId });
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            }
        };
        
        // Listen for player changes
        room.state.players.onChange = (player, sessionId) => {
            // Skip local player
            if (sessionId === room.sessionId) return;
            
            // Update remote player
            if (window.otherPlayers && window.otherPlayers[sessionId]) {
                // Update position with lerping for smooth movement
                const remotePlayer = window.otherPlayers[sessionId];
                const lerpFactor = 0.3; // Adjust for smoother/faster movement
                
                if (remotePlayer && remotePlayer.mesh) {
                    // Update position with lerping
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
                    
                    // Update rotation (no lerping for simplicity)
                    remotePlayer.mesh.rotation.y = player.rotationY;
                    
                    // Update player info in UI periodically
                    if (Math.random() < 0.05) { // Only update UI occasionally to save performance
                        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                            window.playerUI.updatePlayerListUI();
                        }
                    }
                }
            }
        };
    } else {
        console.error('[setupRoomPlayerListeners] state.players not found!');
    }
    
    console.log('[setupRoomPlayerListeners] Room player listeners setup complete');
}

// Setup entity listeners for the room
function setupRoomListeners(room) {
    if (!room || !room.state) {
        console.error('[setupRoomListeners] Room or state not available');
        return;
    }
    
    console.log('[setupRoomListeners] Setting up entity listeners');
    
    // Ensure visuals collections exist
    window.visuals = window.visuals || {};
    window.visuals.operators = window.visuals.operators || {};
    window.visuals.staticNumberblocks = window.visuals.staticNumberblocks || {};
    
    // Check for entities collection
    if (room.state.entities) {
        console.log('[setupRoomListeners] Processing entities:', room.state.entities.size);
        
        // Process existing entities
        room.state.entities.forEach((entity, entityId) => {
            console.log(`Processing entity: ${entityId}, type: ${entity.type}`);
            
            // Handle different entity types
            if (entity.type === 'operator') {
                if (typeof window.createOperatorVisual === 'function') {
                    window.createOperatorVisual(entity, entityId);
                }
            } else if (entity.type === 'staticNumberblock') {
                if (typeof window.createStaticNumberblockVisual === 'function') {
                    window.createStaticNumberblockVisual(entity, entityId);
                }
            }
        });
        
        // Listen for entity added events
        if (typeof room.state.entities.onAdd === 'function') {
            room.state.entities.onAdd = (entity, entityId) => {
                console.log(`Entity added: ${entityId}, type: ${entity.type}`);
                
                // Handle different entity types
                if (entity.type === 'operator') {
                    if (typeof window.createOperatorVisual === 'function') {
                        window.createOperatorVisual(entity, entityId);
                    }
                } else if (entity.type === 'staticNumberblock') {
                    if (typeof window.createStaticNumberblockVisual === 'function') {
                        window.createStaticNumberblockVisual(entity, entityId);
                    }
                }
            };
        }
        
        // Listen for entity removed events
        if (typeof room.state.entities.onRemove === 'function') {
            room.state.entities.onRemove = (entity, entityId) => {
                console.log(`Entity removed: ${entityId}, type: ${entity.type}`);
                
                // Handle different entity types
                if (entity.type === 'operator') {
                    if (typeof window.removeOperatorVisual === 'function') {
                        window.removeOperatorVisual(entityId);
                    }
                } else if (entity.type === 'staticNumberblock') {
                    if (typeof window.removeStaticNumberblockVisual === 'function') {
                        window.removeStaticNumberblockVisual(entityId);
                    }
                }
            };
        }
    } else {
        console.log('[setupRoomListeners] No entities collection found');
    }
    
    console.log('[setupRoomListeners] Entity listeners setup complete');
}

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
