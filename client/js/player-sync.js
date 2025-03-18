// Numberblocks game - Player synchronization module
// Handles player synchronization between clients

// Process players that already exist in the room when joining
function processExistingPlayers() {
    if (!room) {
        console.warn("Room not available for processing existing players");
        return;
    }
    
    try {
        // Get all player objects from the room state
        const players = room.state.players;
        if (!players) {
            console.warn("No players collection in room state");
            return;
        }
        
        // Track our own player ID
        window.mySessionId = room.sessionId;
        
        // Process each player in the room
        players.forEach((player, sessionId) => {
            // Skip our own player
            if (sessionId === room.sessionId) {
                console.log("Found myself in the player list, sessionId:", sessionId);
                
                // Update our own player value if needed
                if (window.player && player.value) {
                    window.player.value = player.value;
                    
                    // Update the HUD
                    if (window.updateHUD) {
                        window.updateHUD();
                    }
                }
                return;
            }
            
            // Check if player is valid
            if (!player || !player.x || player.x === undefined) {
                console.warn("Invalid player data for sessionId:", sessionId);
                return;
            }
            
            // Create visual for other player if it doesn't exist
            if (!visuals.players[sessionId]) {
                try {
                    // Create new visual using player data
                    const playerVisual = new PlayersVisual(player);
                    
                    // Store the visual
                    visuals.players[sessionId] = playerVisual;
                    
                    // Add to the scene
                    if (window.scene) {
                        window.scene.add(playerVisual.group);
                    } else {
                        console.warn("Scene not available, cannot add player visual");
                    }
                    
                    // Add player to other players collection
                    window.otherPlayers[sessionId] = player;
                    
                    console.log("Created visual for existing player:", sessionId);
                } catch (error) {
                    console.error("Error creating player visual:", error);
                }
            } else {
                console.log("Visual already exists for player:", sessionId);
                
                // Update player data
                visuals.players[sessionId].update(player);
            }
        });
        
        console.log("Processed existing players. Total:", players.size);
    } catch (error) {
        console.error("Error processing existing players:", error);
    }
}

// Setup specific schema listeners for Players
function setupPlayerListeners(room) {
    if (!room || !room.state) {
        console.warn("Room not available for player listeners");
        return;
    }
    
    try {
        const players = room.state.players;
        
        // Check if players is a MapSchema with onAdd method
        if (!players || typeof players.onAdd !== 'function') {
            console.error("Players collection is not a valid MapSchema or not yet initialized:", players);
            // Log the state for debugging
            console.log("Current room.state:", room.state);
            return;
        }
        
        // Listen for player additions
        players.onAdd((player, sessionId) => {
            console.log(`Player added: ${sessionId}`);
            
            // Skip if it's our own player
            if (sessionId === room.sessionId) {
                console.log("This is my player, not creating visual");
                return;
            }
            
            // Store the player in our tracking object
            window.otherPlayers[sessionId] = player;
            
            // Create visual for player
            try {
                const playerVisual = new PlayersVisual(player);
                visuals.players[sessionId] = playerVisual;
                
                // Add to scene
                if (window.scene) {
                    window.scene.add(playerVisual.group);
                } else {
                    console.warn("Scene not available, cannot add player visual");
                }
                
                // Update the player list UI
                updatePlayerListUI();
            } catch (error) {
                console.error("Error creating player visual:", error);
            }
            
            // Listen for player removal
            player.listen("active", (isActive) => {
                if (!isActive) {
                    // If player becomes inactive, remove from scene
                    if (visuals.players[sessionId] && window.scene) {
                        window.scene.remove(visuals.players[sessionId].group);
                        delete visuals.players[sessionId];
                    }
                    
                    // Remove from tracking object
                    delete window.otherPlayers[sessionId];
                    
                    // Update UI
                    updatePlayerListUI();
                }
            });
            
            // Listen for player position updates
            player.onChange(() => {
                // Update visual if it exists
                if (visuals.players[sessionId]) {
                    visuals.players[sessionId].update(player);
                }
            });
        });
        
        // Listen for player removals
        players.onRemove((player, sessionId) => {
            console.log(`Player removed: ${sessionId}`);
            
            // If visual exists, remove it
            if (visuals.players[sessionId]) {
                if (window.scene) {
                    window.scene.remove(visuals.players[sessionId].group);
                }
                delete visuals.players[sessionId];
            }
            
            // Remove from tracking object
            delete window.otherPlayers[sessionId];
            
            // Update UI
            updatePlayerListUI();
        });
    } catch (error) {
        console.error("Error setting up player listeners:", error);
    }
}

// Define visual class for Players
window.PlayersVisual = class PlayersVisual {
    constructor(playerData) {
        this.group = new THREE.Group();
        this.lastPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.interpolationFactor = 0.15; // Smooth movement factor
        
        // Player name display
        this.nameLabel = document.createElement('div');
        this.nameLabel.className = 'player-label';
        this.nameLabel.style.color = 'white';
        this.nameLabel.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.nameLabel.style.padding = '2px 5px';
        this.nameLabel.style.borderRadius = '3px';
        this.nameLabel.style.fontSize = '12px';
        this.nameLabel.style.pointerEvents = 'none';
        this.nameLabel.style.userSelect = 'none';
        this.nameLabel.textContent = playerData.name || 'Player';
        
        // Create CSS2D object for name
        this.nameObject = new CSS2DObject(this.nameLabel);
        this.nameObject.position.set(0, 3, 0); // Position above player
        this.group.add(this.nameObject);
        
        // Create numberblock for player
        this.createNumberblockMesh(playerData.value || 1, playerData.color || '#FF0000');
        
        // Set initial position
        this.update(playerData);
    }
    
    createNumberblockMesh(value, color) {
        // Create basic mesh for now
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: color || window.getColorForValue(value || 1)
        });
        
        // Create multiple cubes for higher values
        const blockHeight = 1;
        this.mesh = new THREE.Group();
        
        for (let i = 0; i < value; i++) {
            const cube = new THREE.Mesh(geometry, material);
            cube.position.y = i * blockHeight;
            this.mesh.add(cube);
        }
        
        // Center the mesh
        const totalHeight = value * blockHeight;
        this.mesh.position.y = totalHeight / 2;
        
        // Add to the group
        this.group.add(this.mesh);
    }
    
    update(playerData) {
        // Get player position with validation
        const position = window.getPlayerPosition(playerData);
        
        if (position) {
            // Store target position for interpolation
            this.targetPosition.copy(position);
            
            // Update position with smooth interpolation
            this.group.position.lerp(this.targetPosition, this.interpolationFactor);
            
            // Update rotation if available
            if (playerData.rotationY !== undefined) {
                this.group.rotation.y = playerData.rotationY;
            }
            
            // Update value if changed
            if (this.lastValue !== playerData.value && playerData.value > 0) {
                this.lastValue = playerData.value;
                
                // Remove old mesh
                if (this.mesh) {
                    this.group.remove(this.mesh);
                }
                
                // Create new mesh with updated value
                this.createNumberblockMesh(playerData.value, playerData.color);
            }
        }
    }
};

// Get position from player object, with validation
function getPlayerPosition(player) {
    if (!player || player.x === undefined || player.y === undefined || player.z === undefined) {
        return null;
    }
    
    return new THREE.Vector3(player.x, player.y, player.z);
}

// Make functions available globally
window.processExistingPlayers = processExistingPlayers;
window.setupPlayerListeners = setupPlayerListeners;
window.getPlayerPosition = getPlayerPosition;
