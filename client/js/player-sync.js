// Numberblocks game - Player synchronization module
// Handles player synchronization between clients

// Helper functions for visual management
function setupPlayerListeners(player, sessionId) {
    try {
        // Add logging to help diagnose issues
        console.log(`[setupPlayerListeners] Setting up player ${sessionId}, local session: ${window.room.sessionId}`, player);

        // Explicitly skip listener setup for own local player
        if (sessionId === window.room.sessionId) {
            console.log("✅ This is my player, explicitly not setting listeners");
            updatePlayerListUI(); // Update UI clearly
            return;
        }

        // Check if we already have a visual for this player to avoid duplicates
        if (visuals.players && visuals.players[sessionId]) {
            console.log(`Player ${sessionId} already has a visual, updating it`);
            visuals.players[sessionId].update(player);
            updatePlayerListUI();
            return;
        }

        // Ensure 'player.onChange' explicitly exists for remote players
        if (typeof player.onChange === "function") {
            console.log(`Setting up onChange listener for player ${sessionId}`);
            player.onChange(() => {
                if (visuals.players[sessionId]) {
                    visuals.players[sessionId].update(player);
                }
                updatePlayerListUI();
            });
        } else {
            // If onChange isn't available, we'll need to use fallback polling
            console.warn(`Player ${sessionId} missing onChange method, setting up fallback polling`);
            // Store the original state data to check for changes
            window.playersLastState = window.playersLastState || {};
            window.playersLastState[sessionId] = {...player};
        }

        // Create visual explicitly for remote player
        console.log(`Creating new visual for player ${sessionId}`);
        const visual = new PlayersVisual({
            sessionId,
            name: player.name || `Player_${sessionId.substring(0, 5)}`,
            value: player.value || 1,
            color: player.color || '#FFFF00',
            x: player.x || 0,
            y: player.y || 0,
            z: player.z || 0,
            rotationY: player.rotationY || 0
        });
        
        if (!visuals.players) visuals.players = {};
        visuals.players[sessionId] = visual;

        // Add to tracking and scene
        window.otherPlayers[sessionId] = player;
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
            console.log(`Added player ${sessionId} visual to scene`);
        } else {
            console.warn(`Scene not available, couldn't add player ${sessionId} visual`);
        }

        // Immediately update UI clearly
        updatePlayerListUI();
    } catch (error) {
        console.error(`Error explicitly setting up player (${sessionId}):`, error);
    }
}

// Fallback update function for players without onChange listeners
function checkAndUpdatePlayers() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    window.playersLastState = window.playersLastState || {};
    
    // Check all players in the room state
    window.room.state.players.forEach((player, sessionId) => {
        // Skip our own player
        if (sessionId === window.room.sessionId) return;
        
        const lastState = window.playersLastState[sessionId] || {};
        const needsUpdate = (
            player.x !== lastState.x || 
            player.y !== lastState.y || 
            player.z !== lastState.z ||
            player.rotationY !== lastState.rotationY ||
            player.value !== lastState.value
        );
        
        if (needsUpdate) {
            console.log(`Detected change for player ${sessionId} via polling`);
            if (visuals.players[sessionId]) {
                visuals.players[sessionId].update(player);
            }
            
            // Update stored state
            window.playersLastState[sessionId] = {...player};
        }
        
        // Create visual if it doesn't exist
        if (!visuals.players[sessionId]) {
            console.log(`Creating missing visual for player ${sessionId}`);
            setupPlayerListeners(player, sessionId);
        }
    });
}

function removePlayerVisual(sessionId) {
    try {
        // Remove visual
        if (visuals.players && visuals.players[sessionId]) {
            if (window.scene) {
                window.scene.remove(visuals.players[sessionId].group || 
                                  visuals.players[sessionId].mesh);
            }
            delete visuals.players[sessionId];
        }

        // Remove from tracking
        delete window.otherPlayers[sessionId];
        if (window.playersLastState) {
            delete window.playersLastState[sessionId];
        }

        // Update UI
        updatePlayerListUI();
    } catch (error) {
        console.error(`Error removing player visual (${sessionId}):`, error);
    }
}

// Update player list UI
function updatePlayerListUI() {
    try {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;

        // Clear existing list
        playerList.innerHTML = '';

        // Add all players
        if (window.room && window.room.state) {
            window.room.state.players.forEach((player, sessionId) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                playerDiv.textContent = `${player.name || sessionId} (Value: ${player.value || 1})`;
                if (sessionId === window.room.sessionId) {
                    playerDiv.classList.add('current-player');
                }
                playerList.appendChild(playerDiv);
            });
        }
    } catch (error) {
        console.error("Error updating player list UI:", error);
    }
}

// Define visual class for Players
window.PlayersVisual = class PlayersVisual {
    constructor(playerData) {
        console.log("Creating PlayersVisual with data:", playerData);
        this.group = new THREE.Group();
        this.numberblockMesh = null;
        this.nameLabel = null;
        this.playerData = playerData; // Store the original data
        this.update(playerData);
    }

    createNumberblockMesh(value, color) {
        // Ensure valid value
        const blockValue = Math.max(1, value || 1);
        
        // Convert color from string to hex if needed
        let colorHex = color;
        if (typeof color === 'string' && color.startsWith('#')) {
            colorHex = parseInt(color.replace('#', '0x'), 16);
        } else if (!color) {
            // Default to yellow for missing color
            colorHex = 0xffff00;
        }
        
        console.log(`Creating numberblock with value: ${blockValue}, color: ${colorHex}`);
        
        // Create numberblock mesh based on value
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Scale based on value (stack of cubes)
        mesh.scale.y = blockValue;
        mesh.position.y = blockValue / 2;
        
        return mesh;
    }

    update(playerData) {
        try {
            // Merge with existing data to handle partial updates
            this.playerData = {...this.playerData, ...playerData};
            
            // Log the update
            console.log(`Updating player visual with data:`, this.playerData);
            
            // Update numberblock
            if (this.numberblockMesh) {
                this.group.remove(this.numberblockMesh);
            }
            this.numberblockMesh = this.createNumberblockMesh(this.playerData.value, this.playerData.color);
            this.group.add(this.numberblockMesh);

            // Update position and rotation
            if (this.playerData.x !== undefined && this.playerData.y !== undefined && this.playerData.z !== undefined) {
                this.group.position.set(this.playerData.x, this.playerData.y, this.playerData.z);
            }
            if (this.playerData.rotationY !== undefined) {
                this.group.rotation.y = this.playerData.rotationY;
            }

            // Update name label
            if (!this.nameLabel && this.playerData.name) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'player-label';
                labelDiv.textContent = this.playerData.name;
                this.nameLabel = new CSS2DObject(labelDiv);
                this.nameLabel.position.set(0, (this.playerData.value || 1) + 0.5, 0);
                this.group.add(this.nameLabel);
            } else if (this.nameLabel && this.playerData.name) {
                this.nameLabel.element.textContent = this.playerData.name;
                this.nameLabel.position.y = (this.playerData.value || 1) + 0.5;
            }
        } catch (error) {
            console.error("Error updating player visual:", error, playerData);
        }
    }
};

// Process players that already exist in the room when joining
function processExistingPlayers() {
    if (!window.room) {
        console.warn("Room not available for processing existing players");
        return;
    }
    
    try {
        // Get all player objects from the room state
        const players = window.room.state.players;
        if (!players) {
            console.warn("No players collection in room state");
            return;
        }
        
        // Track our own player ID
        window.mySessionId = window.room.sessionId;
        
        // Process each player in the room
        players.forEach((player, sessionId) => {
            setupPlayerListeners(player, sessionId);
        });
        
        console.log("Processed existing players. Total:", players.size);
    } catch (error) {
        console.error("Error processing existing players:", error);
    }
}

// Setup specific schema listeners for Players
// Setup room-level listeners specifically for Players
function setupRoomPlayerListeners(room) {
    if (!room || !room.state) {
        console.warn('[setupRoomPlayerListeners] Room or state not available yet.');
        return;
    }

    // Debug the state first to help understand what's happening
    console.log('[setupRoomPlayerListeners] Current state structure:', Object.keys(room.state));
    console.log('[setupRoomPlayerListeners] Players collection exists:', !!room.state.players);
    if (room.state.players) {
        console.log('[setupRoomPlayerListeners] Players collection type:', Object.getPrototypeOf(room.state.players));
        console.log('[setupRoomPlayerListeners] Current player count:', room.state.players.size);
    }

    // Always process existing players first when this function is called
    if (room.state.players) {
        console.log('[setupRoomPlayerListeners] Processing existing players on setup');
        room.state.players.forEach((player, sessionId) => {
            console.log(`✅ Setting up existing player: ${sessionId}`, player);
            setupPlayerListeners(player, sessionId);
        });
        updatePlayerListUI();
    }

    // Set up a continuous state change listener to always process players
    room.onStateChange((state) => {
        // Always check for new players on every state change
        if (state.players && typeof state.players.forEach === 'function') {
            state.players.forEach((player, sessionId) => {
                // If this player doesn't have a visual and isn't our local player, create one
                if (!visuals.players[sessionId] && sessionId !== room.sessionId) {
                    console.log(`🆕 Discovered new player on state change: ${sessionId}`);
                    setupPlayerListeners(player, sessionId);
                    updatePlayerListUI();
                }
            });
        }
    });

    // Set up schema listeners once with proper error handling
    room.onStateChange.once((state) => {
        if (!state.players) {
            console.error('[setupRoomPlayerListeners] state.players still undefined on first state update!');
            return;
        }

        // Try to attach the schema methods if they're available
        try {
            // Attach listeners now that players is definitely initialized
            if (typeof state.players.onAdd === 'function') {
                state.players.onAdd = (player, sessionId) => {
                    console.log("⭐ Schema onAdd triggered for player:", sessionId);
                    setupPlayerListeners(player, sessionId);
                    updatePlayerListUI();
                };
            } else {
                console.warn("⚠️ state.players.onAdd is not a function, schema listener not attached");
            }
            
            if (typeof state.players.onRemove === 'function') {
                state.players.onRemove = (player, sessionId) => {
                    console.log("❌ Player removed:", sessionId);
                    removePlayerVisual(sessionId);
                    updatePlayerListUI();
                };
            } else {
                console.warn("⚠️ state.players.onRemove is not a function, schema listener not attached");
            }
        } catch (error) {
            console.error("Error setting up schema listeners:", error);
        }

        console.log('[setupRoomPlayerListeners] Room player listeners fully set.');
    });
}

// Make this explicitly available globally
window.setupRoomPlayerListeners = setupRoomPlayerListeners;

// Setup polling for players without onChange
function setupPlayerPolling() {
    console.log("Setting up player polling fallback");
    // Poll every 100ms for player updates
    window.playerPollingInterval = setInterval(checkAndUpdatePlayers, 100);
}

// Make functions available globally
window.setupPlayerListeners = setupPlayerListeners;
window.removePlayerVisual = removePlayerVisual;
window.updatePlayerListUI = updatePlayerListUI;
window.processExistingPlayers = processExistingPlayers;
window.checkAndUpdatePlayers = checkAndUpdatePlayers;
window.setupPlayerPolling = setupPlayerPolling;

