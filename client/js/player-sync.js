// Numberblocks game - Player synchronization module
// Handles player synchronization between clients

// Helper functions for visual management
function setupPlayerListeners(player, sessionId) {
    try {
        // Skip if it's our own player
        if (sessionId === window.room.sessionId) {
            console.log("✅ This is my player, not creating visual");
            updatePlayerListUI(); // <-- explicitly ensure own player triggers UI update
            return;
        }

        // Create visual for remote player
        const visual = new PlayersVisual(player);
        if (!visuals.players) visuals.players = {};
        visuals.players[sessionId] = visual;
        
        // Store in tracking collection
        window.otherPlayers[sessionId] = player;

        // Add to scene
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
        }

        // Setup change listener for updates
        player.onChange(() => {
            if (visuals.players[sessionId]) {
                visuals.players[sessionId].update(player);
            }
            updatePlayerListUI();
        
            // ✅ ADD this line explicitly to confirm actual state updates clearly
            if (sessionId === window.room.sessionId) {
                console.log(`✅ CLIENT: Actual player change received (${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)})`);
            }
        });
        

        // Update UI explicitly right after visual setup
        updatePlayerListUI();
    } catch (error) {
        console.error(`Error setting up player (${sessionId}):`, error);
    }
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
        this.group = new THREE.Group();
        this.numberblockMesh = null;
        this.nameLabel = null;
        this.update(playerData);
    }

    createNumberblockMesh(value, color) {
        // Create numberblock mesh based on value
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: color || 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Scale based on value (stack of cubes)
        mesh.scale.y = value || 1;
        mesh.position.y = (value || 1) / 2;
        
        return mesh;
    }

    update(playerData) {
        try {
            // Update numberblock
            if (this.numberblockMesh) {
                this.group.remove(this.numberblockMesh);
            }
            this.numberblockMesh = this.createNumberblockMesh(playerData.value, playerData.color);
            this.group.add(this.numberblockMesh);

            // Update position and rotation
            if (playerData.x !== undefined && playerData.y !== undefined && playerData.z !== undefined) {
                this.group.position.set(playerData.x, playerData.y, playerData.z);
            }
            if (playerData.rotationY !== undefined) {
                this.group.rotation.y = playerData.rotationY;
            }

            // Update name label
            if (!this.nameLabel && playerData.name) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'player-label';
                labelDiv.textContent = playerData.name;
                this.nameLabel = new CSS2DObject(labelDiv);
                this.nameLabel.position.set(0, (playerData.value || 1) + 0.5, 0);
                this.group.add(this.nameLabel);
            } else if (this.nameLabel && playerData.name) {
                this.nameLabel.element.textContent = playerData.name;
                this.nameLabel.position.y = (playerData.value || 1) + 0.5;
            }
        } catch (error) {
            console.error("Error updating player visual:", error);
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

    room.onStateChange.once((state) => {
        if (!state.players) {
            console.error('[setupRoomPlayerListeners] state.players still undefined on first state update!');
            return;
        }

        // Attach listeners now that players is definitely initialized
        state.players.onAdd = (player, sessionId) => {
            console.log("Player added:", sessionId);
            setupPlayerListeners(player, sessionId);
            updatePlayerListUI();
        };
        

        state.players.onRemove = (player, sessionId) => {
            console.log("Player removed:", sessionId);
            removePlayerVisual(sessionId);
            updatePlayerListUI();
        };
        

        // Initial iteration of existing players
        state.players.forEach((player, sessionId) => {
            console.log(`✅ Processing existing player: ${sessionId}`, player);
            setupPlayerListeners(player, sessionId);
        });

        updatePlayerListUI();
        console.log('[setupRoomPlayerListeners] Room player listeners fully set.');
    });
}



// Make this explicitly available globally
window.setupRoomPlayerListeners = setupRoomPlayerListeners;


// Make functions available globally
window.setupPlayerListeners = setupPlayerListeners;
window.removePlayerVisual = removePlayerVisual;
window.updatePlayerListUI = updatePlayerListUI;
window.processExistingPlayers = processExistingPlayers;
