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
    staticEntities: {},
    trees: {},
    rocks: {}
};

// Visual tracking containers
const visualTracking = {
    players: {},
    operators: {},
    staticEntities: {},
};

// Function to get color based on entity value
function getColorForValue(value) {
    // Default colors for values 1-10
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
                // Check which client constructor is available (handles both 0.14.x and 0.16.x versions)
                if (typeof Colyseus !== 'undefined') {
                    if (typeof Colyseus.Client === 'function') {
                        client = new Colyseus.Client(endpoint);
                    } else if (typeof colyseus !== 'undefined' && typeof colyseus.Client === 'function') {
                        client = new colyseus.Client(endpoint);
                    } else {
                        // Direct instantiation for older versions
                        client = new Client(endpoint);
                    }
                } else if (typeof Client === 'function') {
                    client = new Client(endpoint);
                } else {
                    throw new Error("Colyseus client library not found");
                }
                console.log("Colyseus client created successfully");
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
            
            // Initialize object collections - use a single source of truth
            window.otherPlayers = {};
            window.operators = {};
            window.staticEntities = {};
            window.trees = {};
            window.rocks = {};
            
            // Setup message handlers
            setupMessageHandlers();
            
            // Setup automatic reconnection
            setupReconnection(room, client);
            
            // Wait for the initial state before setting up listeners
            room.onStateChange.once((state) => {
                console.log("Initial state received:", state);
                setupRoomListeners(room);
                setupRoomPlayerListeners(room);
                
                // Register updateRemotePlayers with the animation loop
                if (typeof window.registerAnimationCallback === 'function') {
                    window.registerAnimationCallback(window.updateRemotePlayers);
                    console.log("Registered updateRemotePlayers with animation loop");
                } else {
                    // Set up a fallback timer if animation callback registration is not available
                    console.log("Setting up fallback timer for remote player updates");
                    window.playerUpdateInterval = setInterval(window.updateRemotePlayers, 1000/60); // 60fps
                }
                
                // Explicitly create local player object
                window.myPlayer = new Player({ 
                    id: window.room.sessionId, 
                    isLocalPlayer: true,
                    value: 1, 
                    color: "#FFFF00"
                });
                console.log("Local player created and linked to existing entity mesh:", window.myPlayer);
                
                if (typeof animate === 'function') {
                    animate();
                }
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
    room.onMessage("player-collision", (message) => {
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

// Send player collision message
function sendPlayerCollision(targetId) {
    if (!room) return;
    
    room.send("player-collision", { targetId: targetId });
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
        
        // Create a new entity for this player
        createRemotePlayerObject(player);
    }
    
    // Update the player list in the UI
    updatePlayerListUI();
}

// Create 3D object for remote player
function createRemotePlayerObject(player) {
    // Validate that the player object and sessionId exist
    if (!player || !player.sessionId) {
        console.error("Invalid player data received - missing sessionId:", player);
        return null;
    }
    
    if (!window.scene) {
        console.error("Scene not available to create remote player object");
        return null;
    }
    
    console.log("Creating remote player:", player);
    
    try {
        // Create a player object for the remote player
        // Use DefaultPlayer if available, otherwise fallback to base Player
        const PlayerClass = window.DefaultPlayer || window.Player;
        const remotePlayer = new PlayerClass({
            id: player.sessionId,  // Use the sessionId as the id
            isLocalPlayer: false,
            color: player.color || 0x3366CC,
            value: player.value || 1
        });
        
        // Set position and rotation
        remotePlayer.mesh.position.set(player.x || 0, player.y || 0, player.z || 0);
        remotePlayer.mesh.rotation.y = player.rotationY || 0;
        
        // Add to scene
        window.scene.add(remotePlayer.mesh);
        
        // Store in global collections - use otherPlayers as the single source of truth
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
        return null;
    }
}

// Player left callback
function onPlayerLeave(player) {
    // Validate player data
    if (!player || !player.sessionId) {
        console.error("Invalid player in onPlayerLeave:", player);
        return;
    }
    
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

// Update remote players in the scene - this runs in the animation loop
window.updateRemotePlayers = function() {
    if (!window.room || !window.room.state || !window.scene) {
        return;
    }
    
    // Debug log periodically to confirm this is running
    if (Math.random() < 0.001) {
        console.log("updateRemotePlayers running, player count:", window.room.state.players.size);
    }
    
    // First, collect all valid sessionIds from the server
    const serverPlayerIds = new Set();
    window.room.state.players.forEach((player, sessionId) => {
        if (sessionId && sessionId !== window.room.sessionId) {
            serverPlayerIds.add(sessionId);
        }
    });
    
    // Now process each player from the server
    window.room.state.players.forEach((player, sessionId) => {
        // Skip local player and invalid sessionIds
        if (!sessionId || sessionId === window.room.sessionId) return;
        
        // Create remote player object if it doesn't exist
        if (!window.otherPlayers || !window.otherPlayers[sessionId]) {
            console.log(`Creating missing remote player: ${sessionId}`);
            // Ensure we pass the sessionId in the player object
            const playerWithId = {
                ...player,
                sessionId: sessionId  // Explicitly set the sessionId
            };
            createRemotePlayerObject(playerWithId);
            return;
        }
        
        // Update remote player position and rotation using otherPlayers collection
        const remotePlayer = window.otherPlayers[sessionId];
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
            
            
            if (remotePlayer.value !== player.value) {
                try {
                    // Remove old mesh
                    if (remotePlayer.mesh.parent) {
                        remotePlayer.mesh.parent.remove(remotePlayer.mesh);
                    }
                    
                    // Create new entity with updated value
                    const newPlayerEntity = new PlayerEntity(player.value);
                    newPlayerEntity.id = sessionId;
                    newPlayerEntity.mesh.position.copy(remotePlayer.mesh.position);
                    newPlayerEntity.mesh.rotation.y = remotePlayer.mesh.rotation.y;
                    
                    // Add to scene
                    window.scene.add(newPlayerEntity.mesh);
                    
                    // Update reference in otherPlayers collection
                    window.otherPlayers[sessionId] = newPlayerEntity;
                    // Also update in visuals collection
                    if (window.visuals && window.visuals.players) {
                        window.visuals.players[sessionId] = newPlayerEntity;
                    }
                } catch (error) {
                    console.error("Error updating player value:", error);
                }
            }
        }
    });
    
    // Check for players in otherPlayers that no longer exist in the server state
    if (window.otherPlayers) {
        for (const sessionId in window.otherPlayers) {
            // Validate sessionId to avoid issues with undefined
            if (!sessionId || sessionId === "undefined") {
                console.error("Invalid sessionId in otherPlayers:", sessionId);
                delete window.otherPlayers[sessionId];
                continue;
            }
            
            // Check if this player still exists on the server
            if (!serverPlayerIds.has(sessionId)) {
                console.log(`Removing stale player: ${sessionId}`);
                onPlayerLeave({ sessionId: sessionId });
            }
        }
    }
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
            // Skip players without valid sessionId or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Setting up existing player: ${sessionId}`, player);
            
            // Create remote player for other players
            createRemotePlayerObject({...player, sessionId: sessionId});
        });
        
        // Update UI immediately to show all players
        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
            window.playerUI.updatePlayerListUI();
        } else {
            updatePlayerListUI();
        }
        
        // Listen for player added events
        room.state.players.onAdd = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Player added: ${sessionId}`, player);
            
            // Ensure the player object has a sessionId field
            const playerWithId = {...player, sessionId: sessionId};
            
            // Create remote player object
            createRemotePlayerObject(playerWithId);
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            } else {
                updatePlayerListUI();
            }
        };
        
        // Listen for player removed events
        room.state.players.onRemove = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Player removed: ${sessionId}`);
            
            // Remove player
            onPlayerLeave({ sessionId: sessionId });
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            } else {
                updatePlayerListUI();
            }
        };
        
        // Listen for player changes
        room.state.players.onChange = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            // For debugging
            if (Math.random() < 0.01) {
                console.log(`Player changed: ${sessionId}, pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)})`);
            }
            
            // Update remote player - using otherPlayers consistently
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
                    if (Math.random() < 0.01) { // Only update UI occasionally to save performance
                        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                            window.playerUI.updatePlayerListUI();
                        } else {
                            updatePlayerListUI();
                        }
                    }
                }
            } else {
                // If player exists in server state but not in otherPlayers, create it
                console.log(`Creating missing player from onChange: ${sessionId}`);
                createRemotePlayerObject({...player, sessionId: sessionId});
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
    window.visuals.staticEntities = window.visuals.staticEntities || {};
    
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
            } else if (entity.type === 'staticValueEntity') {
                if (typeof window.createStaticEntityVisual === 'function') {
                    window.createStaticEntityVisual(entity, entityId);
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
                } else if (entity.type === 'staticValueEntity') {
                    if (typeof window.createStaticEntityVisual === 'function') {
                        window.createStaticEntityVisual(entity, entityId);
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
                } else if (entity.type === 'staticValueEntity') {
                    if (typeof window.removeStaticEntityVisual === 'function') {
                        window.removeStaticEntityVisual(entityId);
                    }
                }
            };
        }
    } else {
        console.log('[setupRoomListeners] No entities collection found');
    }
    
    console.log('[setupRoomListeners] Entity listeners setup complete');
}

// Clean up network resources when leaving
window.cleanupNetworking = function() {
    console.log("Cleaning up network resources");
    
    // Clear the player update interval if it exists
    if (window.playerUpdateInterval) {
        clearInterval(window.playerUpdateInterval);
        window.playerUpdateInterval = null;
    }
    
    // Unregister updateRemotePlayers if it was registered with the animation loop
    if (typeof window.unregisterAnimationCallback === 'function' && 
        typeof window.updateRemotePlayers === 'function') {
        window.unregisterAnimationCallback(window.updateRemotePlayers);
    }
    
    // Clean up other players
    if (window.otherPlayers) {
        for (const sessionId in window.otherPlayers) {
            if (sessionId) {  // Skip undefined keys
                try {
                    if (window.scene && window.otherPlayers[sessionId] && window.otherPlayers[sessionId].mesh) {
                        window.scene.remove(window.otherPlayers[sessionId].mesh);
                    }
                } catch (error) {
                    console.error(`Error removing player ${sessionId} from scene:`, error);
                }
            }
        }
        window.otherPlayers = {};
    }
    
    // Clean up visuals
    if (window.visuals && window.visuals.players) {
        window.visuals.players = {};
    }
    
    // Leave the room if connected
    if (window.room) {
        try {
            window.room.leave();
        } catch (error) {
            console.error("Error leaving room:", error);
        }
        window.room = null;
    }
    
    // Reset client
    client = null;
    room = null;
    
    console.log("Network resources cleaned up successfully");
};

// Make functions available globally
window.initNetworking = initNetworking;
window.setupMessageHandlers = setupMessageHandlers;
window.sendPlayerCollision = sendPlayerCollision;
window.getRandomColor = getRandomColor;
window.getColorForValue = getColorForValue;
window.CSS2DObject = CSS2DObject;
window.CSS2DRenderer = CSS2DRenderer;
window.onPlayerJoin = onPlayerJoin;
window.onPlayerLeave = onPlayerLeave;
