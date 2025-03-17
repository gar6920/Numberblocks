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
    staticNumberblocks: {}
};

// Store references to UI elements for players
let playerListElement = null;
let playerListToggleButton = null;
const playerListUiElements = {};
let playerListVisible = true;

// Global reference to other players' Numberblock visuals
window.otherPlayers = {};

// Make sure UI references are available after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    playerListElement = document.getElementById('player-list');
    playerListToggleButton = document.getElementById('player-list-header');
    
    // Set up player list toggle via click
    if (playerListToggleButton) {
        playerListToggleButton.addEventListener('click', togglePlayerList);
    }
});

// Function to get color based on Numberblock value
function getColorForValue(value) {
    const colors = [
        "#FF0000", // Red (1)
        "#FFA500", // Orange (2)
        "#FFFF00", // Yellow (3)
        "#008000", // Green (4)
        "#0000FF", // Blue (5)
        "#800080", // Purple (6)
        "#FFC0CB", // Pink (7)
        "#A52A2A", // Brown (8)
        "#808080", // Grey (9)
        "#FFFFFF"  // White (10+)
    ];
    
    if (value <= 0) return "#CCCCCC"; // Default for invalid values
    if (value > colors.length) return colors[colors.length - 1]; // Use the last color for large values
    return colors[value - 1]; // Arrays are 0-indexed, but our values start at 1
}

// Function to initialize networking for multiplayer
async function initNetworking() {
    try {
        console.log(`Initializing networking with endpoint: ${endpoint}`);
        client = new Colyseus.Client(endpoint);
        
        // Generate random player name and color
        const playerId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log("Attempting to join room with ID:", playerId);
        
        // Join the room
        room = await client.joinOrCreate("numberblocks", { 
            name: playerId,
            color: getRandomColor()
        });
        console.log(`Connected to server with session ID: ${room.sessionId}`);
        
        // Set player name in UI
        const playerName = document.getElementById('player-name');
        if (playerName) {
            playerName.textContent = playerId;
        }
        
        // Wait a brief moment to ensure schemas are initialized
        setTimeout(() => {
            // Setup room listeners for all object types
            setupRoomListeners();
            
            // Process existing players
            processExistingPlayers();
        }, 500);
        
        return room;
    } catch (error) {
        console.error(`Error connecting to Colyseus server: ${error}`);
        // Don't throw, just log the error and continue - allows game to work in offline mode
        console.log("Continuing in offline mode");
        return null;
    }
}

// Process players that already exist in the room when joining
function processExistingPlayers() {
    if (!room || !room.state || !room.state.players) {
        console.warn("Cannot process existing players: room or players schema not available");
        return;
    }
    
    console.log("Processing existing players in room");
    
    // Loop through all existing players
    room.state.players.forEach((player, sessionId) => {
        // Skip local player
        if (sessionId === room.sessionId) {
            console.log("Skipping local player in existing players processing");
            return;
        }
        
        console.log(`Processing existing player: ${sessionId}`, player);
        
        try {
            // Check if we already have this player
            if (window.otherPlayers[sessionId]) {
                console.log(`Player ${sessionId} already has a visual, skipping`);
                return;
            }
            
            // Verify Numberblock class is available
            if (typeof window.Numberblock !== 'function') {
                console.error("Numberblock class not available in window object!");
                return;
            }
            
            // Verify scene is available
            if (!window.scene) {
                console.error("Scene not available in window object!");
                return;
            }
            
            // Create a new Numberblock for this existing player
            const numberblock = new window.Numberblock(player.value, player.color, player.name);
            console.log(`Created Numberblock for existing player ${sessionId}:`, numberblock);
            
            // Position and rotate the Numberblock according to server data
            numberblock.mesh.position.set(player.x, player.y, player.z);
            numberblock.mesh.rotation.y = player.rotationY;
            
            // Add the Numberblock explicitly to the scene
            window.scene.add(numberblock.mesh);
            console.log(`Added existing remote player ${sessionId} Numberblock to scene`);
            
            // Store reference
            window.otherPlayers[sessionId] = numberblock;
            
            // Setup onChange handler for updates
            player.onChange = () => {
                console.log(`Existing player ${sessionId} changed:`, player);
                
                // Skip if Numberblock was removed
                if (!window.otherPlayers[sessionId]) {
                    console.warn(`Numberblock for player ${sessionId} not found during onChange!`);
                    return;
                }
                
                // Update position and rotation
                const nb = window.otherPlayers[sessionId];
                nb.mesh.position.set(player.x, player.y, player.z);
                nb.mesh.rotation.y = player.rotationY;
                
                // Update value if changed
                if (nb.value !== player.value) {
                    console.log(`Updating value for player ${sessionId} from ${nb.value} to ${player.value}`);
                    nb.updateValue(player.value);
                }
            };
        } catch (error) {
            console.error(`Error creating visual for existing player ${sessionId}:`, error);
        }
    });
    
    console.log("Finished processing existing players");
}

// Setup message handlers
function setupMessageHandlers() {
    if (!room) return;
    
    // Handle errors
    room.onError((code, message) => {
        console.error(`Room error: ${code} - ${message}`);
    });
    
    // Handle leaving
    room.onLeave((code) => {
        console.log(`Left room with code ${code}`);
    });
    
    // Handle messages
    room.onMessage("*", (type, message) => {
        console.log(`Received message of type ${type}:`, message);
    });
}

// Setup room listeners
function setupRoomListeners() {
    console.log("Setting up room listeners");
    
    if (!room) {
        console.error("Room not available!");
        return;
    }
    
    // Set up message handlers
    setupMessageHandlers();
    
    // Debug room state
    console.log("Room state:", room.state);
    console.log("Room schemas:", Object.keys(room.state || {}));
    
    // Global reference to other players - explicitly initialize
    window.otherPlayers = window.otherPlayers || {};
    
    // Initialize operators tracking if not already done
    window.operatorsVisuals = window.operatorsVisuals || {};
    
    // Explicit full state handler to ensure all visuals are properly synced
    room.onStateChange((state) => {
        console.log('State snapshot received explicitly:', state);

        // Players explicitly handled
        state.players.forEach((player, sessionId) => {
            if (sessionId === room.sessionId) {
                window.playerNumberblock.updateColor(player.color);
                return; // Local player already explicitly managed
            }

            let numberblock = window.otherPlayers[sessionId];

            if (!numberblock) {
                // Explicitly instantiate visual if not present
                console.log(`Creating visual for previously missed player ${sessionId}`);
                numberblock = new window.Numberblock(player.value, player.color, player.name);
                numberblock.mesh.position.set(player.x, player.y, player.z);
                numberblock.mesh.rotation.y = player.rotationY;

                window.scene.add(numberblock.mesh);
                window.otherPlayers[sessionId] = numberblock;

                // Explicitly set onChange for future incremental updates
                player.onChange = (changes) => {
                    changes.forEach(change => {
                        if (['x', 'y', 'z'].includes(change.field)) {
                            numberblock.mesh.position.set(player.x, player.y, player.z);
                        }
                        if (change.field === "rotationY") {
                            numberblock.mesh.rotation.y = player.rotationY;
                        }
                        if (change.field === "value") {
                            numberblock.updateValue(player.value);
                        }
                        if (change.field === "color") {
                            numberblock.updateColor(player.color);
                        }
                    });
                };
            } else {
                // Explicitly update position/rotation to match snapshot immediately
                numberblock.mesh.position.set(player.x, player.y, player.z);
                numberblock.mesh.rotation.y = player.rotationY;
                numberblock.updateValue(player.value);
                numberblock.updateColor(player.color);
            }
        });

        // Explicitly remove players no longer in state
        Object.keys(window.otherPlayers).forEach(sessionId => {
            if (!state.players.has(sessionId)) {
                console.log(`Explicitly removing player ${sessionId}`);
                window.scene.remove(window.otherPlayers[sessionId].mesh);
                delete window.otherPlayers[sessionId];
            }
        });

        // Update the player list in the UI whenever state changes
        updatePlayerListUI();

        // Operators explicitly handled similarly
        if (state.operators) {
            state.operators.forEach((operator, operatorId) => {
                if (!window.operatorsVisuals[operatorId]) {
                    if (window.OperatorsVisual) {
                        const opVisual = new window.OperatorsVisual(operator);
                        window.scene.add(opVisual.mesh);
                        window.operatorsVisuals[operatorId] = opVisual;

                        operator.onChange = () => {
                            opVisual.update(operator);
                        };
                    }
                } else {
                    window.operatorsVisuals[operatorId].update(operator);
                }
            });

            // Explicitly remove operators no longer present
            Object.keys(window.operatorsVisuals).forEach(operatorId => {
                if (!state.operators.has(operatorId)) {
                    window.scene.remove(window.operatorsVisuals[operatorId].mesh);
                    delete window.operatorsVisuals[operatorId];
                }
            });
        }

        // Similarly handle staticNumberblocks if present
        if (state.staticNumberblocks) {
            // Process staticNumberblocks similar to operators
            // Implementation would be similar to the operators code above
        }
    });

    // Safely access players schema
    if (room.state && room.state.players) {
        console.log("Setting up player schema listeners");
        
        // Global tracking of other players' visuals explicitly
        window.otherPlayers = window.otherPlayers || {};

        // Explicitly handle players joining AFTER local client is connected
        room.state.players.onAdd = (player, sessionId) => {
            if (sessionId === room.sessionId) {
                // This is the local player, just update its color but don't create a new visual
                if (window.playerNumberblock) {
                    window.playerNumberblock.color = player.color;
                    window.playerNumberblock.updateColor(player.color);
                    
                    // Track with entityFactory as well
                    window.entityFactory.trackEntity(window.playerEntity, 'players', sessionId);
                }
                return;
            }

            console.log(`Player ${sessionId} joined later; creating visual explicitly.`);
            const numberblock = new window.Numberblock(player.value, player.color, player.name);
            numberblock.mesh.position.set(player.x, player.y, player.z);
            numberblock.mesh.rotation.y = player.rotationY;

            window.scene.add(numberblock.mesh);
            window.otherPlayers[sessionId] = numberblock;

            player.onChange = (changes) => {
                changes.forEach(change => {
                    if (['x', 'y', 'z'].includes(change.field)) {
                        numberblock.mesh.position.set(player.x, player.y, player.z);
                    }
                    if (change.field === "rotationY") {
                        numberblock.mesh.rotation.y = player.rotationY;
                    }
                    if (change.field === "value") {
                        numberblock.updateValue(player.value);
                    }
                    if (change.field === "color") {
                        numberblock.updateColor(player.color);
                    }
                });
            };
        };

        room.state.players.onRemove = (player, sessionId) => {
            const numberblock = window.otherPlayers[sessionId];
            if (numberblock) {
                window.scene.remove(numberblock.mesh);
                delete window.otherPlayers[sessionId];
            }
        };
    }
    
    // Handle operators if available
    if (room.state && room.state.operators) {
        console.log("Setting up operator schema listeners");
        setupSpecificSchemaListeners('operators', room.state.operators);
    }
    
    // Handle static numberblocks if available
    if (room.state && room.state.staticNumberblocks) {
        console.log("Setting up static numberblocks schema listeners");
        setupSpecificSchemaListeners('staticNumberblocks', room.state.staticNumberblocks);
    }
}

// Setup schema listeners for a specific object type
function setupSpecificSchemaListeners(schemaName, schema) {
    console.log(`Setting up schema listeners for ${schemaName}`);
    
    // Skip if no schema
    if (!schema) {
        console.warn(`No schema available for ${schemaName}`);
        return;
    }
    
    // Get the visual class based on schema name
    let VisualClass;
    
    // Handle special naming cases
    if (schemaName === 'operators') {
        VisualClass = window.OperatorsVisual;
    } else if (schemaName === 'staticNumberblocks') {
        VisualClass = window.StaticNumberblocksVisual;
    } else {
        // Default naming convention
        const VisualClassName = `${schemaName.charAt(0).toUpperCase() + schemaName.slice(1, -1)}Visual`;
        VisualClass = window[VisualClassName];
    }
    
    if (!VisualClass) {
        console.error(`No visual class found for ${schemaName}. Available classes:`, 
            Object.keys(window).filter(key => key.includes('Visual')));
        return;
    }
    
    console.log(`Found visual class for ${schemaName}:`, VisualClass.name);
    
    // Set up onAdd listener
    schema.onAdd = function(obj, id) {
        console.log(`${schemaName} added: ${id}`, obj);
        
        // Skip local player
        if (schemaName === "players" && id === room.sessionId) {
            console.log("Skipping visual creation for local player");
            return;
        }
        
        try {
            // Create visual
            const visual = new VisualClass(obj);
            
            // Add to scene
            if (window.scene && visual.mesh) {
                window.scene.add(visual.mesh);
                console.log(`Added ${schemaName} visual for ${id} to scene`);
            } else {
                console.error(`Scene or mesh not available for ${schemaName} ${id}`);
            }
            
            // Store in visuals tracking
            visuals[schemaName][id] = visual;
            
            // Set up onChange listener
            obj.onChange = function() {
                console.log(`${schemaName} ${id} changed:`, obj);
                
                if (visuals[schemaName][id]) {
                    visuals[schemaName][id].update(obj);
                }
                
                // Update player list UI if this is a player
                if (schemaName === "players") {
                    updatePlayerListUI();
                }
            };
        } catch (error) {
            console.error(`Error creating visual for ${schemaName} ${id}:`, error);
        }
    };
    
    // Set up onRemove listener
    schema.onRemove = function(obj, id) {
        console.log(`${schemaName} removed: ${id}`);
        
        // Skip local player
        if (schemaName === "players" && id === room.sessionId) {
            console.log("Skipping visual removal for local player");
            return;
        }
        
        // Remove visual
        if (visuals[schemaName][id]) {
            const visual = visuals[schemaName][id];
            
            try {
                // Remove from scene
                if (window.scene && visual.mesh) {
                    window.scene.remove(visual.mesh);
                }
                
                // Dispose resources
                if (visual.mesh) {
                    if (visual.mesh.geometry) {
                        visual.mesh.geometry.dispose();
                    }
                    
                    if (visual.mesh.material) {
                        if (Array.isArray(visual.mesh.material)) {
                            visual.mesh.material.forEach(m => m.dispose());
                        } else {
                            visual.mesh.material.dispose();
                        }
                    }
                }
                
                // Remove from tracking
                delete visuals[schemaName][id];
                console.log(`Removed ${schemaName} ${id} visual`);
            } catch (error) {
                console.error(`Error removing ${schemaName} ${id} visual:`, error);
            }
        }
        
        // Update player list UI if this is a player
        if (schemaName === "players") {
            updatePlayerListUI();
        }
    };
}

// Setup schema-specific listeners for a generic schema
function setupGenericSchemaListeners(room, schemaName) {
    // Check for schema access
    if (!room.state || !room.state[schemaName]) {
        console.error(`Schema ${schemaName} not found in room state`);
        return;
    }
    
    console.log(`Setting up schema listeners for ${schemaName}`);
    
    // Setup onAdd listener for this schema
    room.state[schemaName].onAdd = (entity, id) => {
        try {
            console.log(`Adding ${schemaName} with ID: ${id}`, entity);
            
            if (schemaName === 'players' && id === room.sessionId) {
                // This is the local player, just update its color but don't create a new visual
                if (window.playerNumberblock) {
                    window.playerNumberblock.color = entity.color;
                    window.playerNumberblock.updateColor(entity.color);
                    
                    // Track with entityFactory as well
                    window.entityFactory.trackEntity(window.playerEntity, schemaName, id);
                }
                return;
            }
            
            // Create entity through the factory
            const entityOptions = {
                id: id,
                isLocalPlayer: (schemaName === 'players' && id === room.sessionId)
            };
            
            // Create entity
            const visualEntity = window.entityFactory.createEntity(entity, schemaName, entityOptions);
            
            // Add to scene if it has a mesh
            if (visualEntity && visualEntity.mesh) {
                window.scene.add(visualEntity.mesh);
            }
            
            // Setup onChange handler
            entity.onChange = (changes) => {
                changes.forEach(change => {
                    if (['x', 'y', 'z', 'rotationY'].includes(change.field)) {
                        visualEntity.updatePosition({
                            x: entity.x,
                            y: entity.y,
                            z: entity.z,
                            rotationY: entity.rotationY
                        });
                    }
                    if (change.field === "value") {
                        visualEntity.updateValue(entity.value);
                    }
                    if (change.field === "color") {
                        visualEntity.updateColor(entity.color);
                    }
                });
            };
            
            // If this is a player, update the player list UI
            if (schemaName === 'players') {
                updatePlayerListUI();
            }
        } catch (error) {
            console.error(`Error in ${schemaName}.onAdd:`, error);
        }
    };
    
    // Setup onRemove listener for this schema
    room.state[schemaName].onRemove = (entity, id) => {
        try {
            console.log(`Removing ${schemaName} with ID: ${id}`);
            
            // Remove entity through factory
            window.entityFactory.removeEntity(schemaName, id);
            
            // If this is a player, update the player list UI
            if (schemaName === 'players') {
                updatePlayerListUI();
            }
        } catch (error) {
            console.error(`Error in ${schemaName}.onRemove:`, error);
        }
    };
}

// Setup listeners for all schemas and handle the room
function setupRoomListeners(room) {
    console.log("Setting up room listeners");
    
    if (!room) {
        console.error("Room not available!");
        return;
    }
    
    // Set up message handlers
    setupMessageHandlers();
    
    // Debug room state
    console.log("Room state:", room.state);
    console.log("Room schemas:", Object.keys(room.state || {}));
    
    // Ensure entity factory is initialized
    if (!window.entityFactory) {
        window.entityFactory = new EntityFactory();
    }
    
    // Explicit full state handler to ensure all visuals are properly synced
    room.onStateChange((state) => {
        console.log('State snapshot received explicitly:', state);

        // Process all players in the state
        if (state.players) {
            state.players.forEach((player, sessionId) => {
                if (sessionId === room.sessionId) {
                    // Local player - just update color
                    if (window.playerNumberblock) {
                        window.playerNumberblock.updateColor(player.color);
                    }
                    return;
                }
                
                // Check if we already have this player entity
                let playerEntity = window.entityFactory.getEntity('players', sessionId);
                
                if (!playerEntity) {
                    // Create new player entity if not found
                    console.log(`Creating entity for previously missed player ${sessionId}`);
                    const entityOptions = { id: sessionId, type: 'numberblock' };
                    playerEntity = window.entityFactory.createEntity(player, 'players', entityOptions);
                    
                    // Add mesh to scene
                    if (playerEntity && playerEntity.mesh) {
                        window.scene.add(playerEntity.mesh);
                    }
                    
                    // Setup onChange for future incremental updates
                    player.onChange = (changes) => {
                        changes.forEach(change => {
                            if (['x', 'y', 'z', 'rotationY'].includes(change.field)) {
                                playerEntity.updatePosition({
                                    x: player.x,
                                    y: player.y,
                                    z: player.z,
                                    rotationY: player.rotationY
                                });
                            }
                            if (change.field === "value") {
                                playerEntity.updateValue(player.value);
                            }
                            if (change.field === "color") {
                                playerEntity.updateColor(player.color);
                            }
                        });
                    };
                } else {
                    // Update existing player entity
                    playerEntity.updatePosition({
                        x: player.x,
                        y: player.y,
                        z: player.z,
                        rotationY: player.rotationY
                    });
                    playerEntity.updateValue(player.value);
                    playerEntity.updateColor(player.color);
                }
            });
            
            // Check for players to remove
            const allPlayerEntities = window.entityFactory.getAllEntities('players');
            Object.keys(allPlayerEntities).forEach(sessionId => {
                if (sessionId !== room.sessionId && !state.players.has(sessionId)) {
                    console.log(`Explicitly removing player ${sessionId}`);
                    window.entityFactory.removeEntity('players', sessionId);
                }
            });
        }
        
        // Process all operators in the state
        if (state.operators) {
            state.operators.forEach((operator, operatorId) => {
                // Check if we already have this operator entity
                let operatorEntity = window.entityFactory.getEntity('operators', operatorId);
                
                if (!operatorEntity) {
                    // Create new operator entity if not found
                    console.log(`Creating entity for previously missed operator ${operatorId}`);
                    const entityOptions = { 
                        id: operatorId, 
                        type: 'operator',
                        // Map 'plus' or 'minus' to value
                        value: operator.type 
                    };
                    operatorEntity = window.entityFactory.createEntity(operator, 'operators', entityOptions);
                    
                    // Add mesh to scene
                    if (operatorEntity && operatorEntity.mesh) {
                        window.scene.add(operatorEntity.mesh);
                    }
                    
                    // Setup onChange for future incremental updates
                    operator.onChange = () => {
                        operatorEntity.updatePosition({
                            x: operator.x,
                            y: operator.y,
                            z: operator.z
                        });
                    };
                } else {
                    // Update existing operator entity
                    operatorEntity.updatePosition({
                        x: operator.x,
                        y: operator.y,
                        z: operator.z
                    });
                }
            });
            
            // Check for operators to remove
            const allOperatorEntities = window.entityFactory.getAllEntities('operators');
            Object.keys(allOperatorEntities).forEach(operatorId => {
                if (!state.operators.has(operatorId)) {
                    console.log(`Explicitly removing operator ${operatorId}`);
                    window.entityFactory.removeEntity('operators', operatorId);
                }
            });
        }
        
        // Similarly handle static numberblocks
        if (state.staticNumberblocks) {
            state.staticNumberblocks.forEach((staticBlock, blockId) => {
                // Check if we already have this static numberblock entity
                let staticBlockEntity = window.entityFactory.getEntity('staticNumberblocks', blockId);
                
                if (!staticBlockEntity) {
                    // Create new static numberblock entity if not found
                    console.log(`Creating entity for previously missed static numberblock ${blockId}`);
                    const entityOptions = { 
                        id: blockId, 
                        type: 'numberblock',
                        isStatic: true 
                    };
                    staticBlockEntity = window.entityFactory.createEntity(staticBlock, 'staticNumberblocks', entityOptions);
                    
                    // Add mesh to scene
                    if (staticBlockEntity && staticBlockEntity.mesh) {
                        window.scene.add(staticBlockEntity.mesh);
                    }
                    
                    // Setup onChange for future incremental updates
                    staticBlock.onChange = (changes) => {
                        changes.forEach(change => {
                            if (['x', 'y', 'z', 'rotationY'].includes(change.field)) {
                                staticBlockEntity.updatePosition({
                                    x: staticBlock.x,
                                    y: staticBlock.y,
                                    z: staticBlock.z,
                                    rotationY: staticBlock.rotationY
                                });
                            }
                            if (change.field === "value") {
                                staticBlockEntity.updateValue(staticBlock.value);
                            }
                            if (change.field === "color") {
                                staticBlockEntity.updateColor(staticBlock.color);
                            }
                        });
                    };
                } else {
                    // Update existing static numberblock entity
                    staticBlockEntity.updatePosition({
                        x: staticBlock.x,
                        y: staticBlock.y,
                        z: staticBlock.z,
                        rotationY: staticBlock.rotationY
                    });
                    staticBlockEntity.updateValue(staticBlock.value);
                    staticBlockEntity.updateColor(staticBlock.color);
                }
            });
            
            // Check for static numberblocks to remove
            const allStaticBlockEntities = window.entityFactory.getAllEntities('staticNumberblocks');
            Object.keys(allStaticBlockEntities).forEach(blockId => {
                if (!state.staticNumberblocks.has(blockId)) {
                    console.log(`Explicitly removing static numberblock ${blockId}`);
                    window.entityFactory.removeEntity('staticNumberblocks', blockId);
                }
            });
        }

        // Update the player list in the UI whenever state changes
        updatePlayerListUI();
    });

    // Setup listeners for each schema type
    const schemaTypes = ['players', 'operators', 'staticNumberblocks'];
    schemaTypes.forEach(schemaName => {
        if (room.state && room.state[schemaName]) {
            console.log(`Setting up ${schemaName} schema listeners`);
            setupGenericSchemaListeners(room, schemaName);
        }
    });
    
    // Handle local player
    if (window.playerNumberblock) {
        // Create a Player entity for the local player
        window.playerEntity = new Player({
            id: room.sessionId,
            name: 'You',
            value: window.playerNumberblock.value,
            color: window.playerNumberblock.color,
            type: 'numberblock',
            isLocalPlayer: true
        });
        
        // Store the reference in entityFactory
        window.entityFactory.trackEntity(window.playerEntity, 'players', room.sessionId);
    }
}

// Update player list in UI
function updatePlayerListUI() {
    // Get references if not yet set
    if (!playerListElement) playerListElement = document.getElementById('player-list');
    if (!playerListToggleButton) playerListToggleButton = document.getElementById('player-list-header');
    
    if (!playerListElement || !playerListToggleButton) {
        console.log("Player list elements not yet available in DOM");
        return;
    }
    
    // Clear current list
    playerListElement.innerHTML = '';
    
    // Default to 0 players
    let playerCount = 0;
    
    // Detailed debug for state structure
    if (room && room.state) {
        console.log("Current room state:", JSON.stringify(room.state));
    }
    
    // Log the current state of players
    console.log("Player state:", room?.state?.players);
    
    // Try different approaches to get players
    if (room && room.state && room.state.players) {
        try {
            // APPROACH 1: Use schema forEach if available (most reliable for Colyseus schemas)
            if (typeof room.state.players.forEach === 'function') {
                console.log("Using forEach method");
                room.state.players.forEach((player, key) => {
                    console.log(`Player [${key}]:`, player);
                    addPlayerToList(player, key);
                    playerCount++;
                });
            }
            // APPROACH 2: Use manual iteration over entries
            else if (typeof room.state.players.entries === 'function') {
                console.log("Using entries method");
                for (const [key, player] of room.state.players.entries()) {
                    console.log(`Player [${key}]:`, player);
                    addPlayerToList(player, key);
                    playerCount++;
                }
            } 
            // APPROACH 3: Use standard object iteration
            else {
                console.log("Using object iteration");
                // Get all players
                try {
                    // Try to use toJSON first (some versions of Colyseus)
                    const playersObj = room.state.players.toJSON ? room.state.players.toJSON() : room.state.players;
                    
                    // Iterate through players
                    for (const key in playersObj) {
                        if (playersObj.hasOwnProperty(key)) {
                            const player = playersObj[key];
                            console.log(`Player [${key}}:`, player);
                            addPlayerToList(player, key);
                            playerCount++;
                        }
                    }
                } catch (e) {
                    console.error("Error iterating players:", e);
                }
            }
        } catch (error) {
            console.error("Error updating player list:", error);
        }
    }
    
    console.log(`Total player count: ${playerCount}`);
    
    // Update player count in header
    playerListToggleButton.textContent = `Players (${playerCount})`;
}

// Helper function to add a player to the list UI
function addPlayerToList(player, sessionId) {
    if (!player) {
        console.warn(`Skipping undefined player with ID ${sessionId}`);
        return;
    }
    
    console.log(`Creating UI entry for player ${sessionId}`);
    
    // Create player entry
    const playerEntry = document.createElement('div');
    playerEntry.className = 'player-entry';
    
    // Create color indicator
    const colorIndicator = document.createElement('div');
    colorIndicator.className = 'player-color';
    colorIndicator.style.backgroundColor = player.color || getColorForValue(player.value || 1);
    
    // Player info - show "You" for local player
    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';
    
    // Determine display name
    let displayName;
    let valueText = player.value || 1;
    
    if (room && sessionId === room.sessionId) {
        displayName = "You";
    } else {
        // Use name property if available, fallback to session ID
        displayName = player.name || `Player-${sessionId.substring(0, 4)}`;
    }
    
    playerInfo.textContent = `${displayName} (${valueText})`;
    
    // Log the entry we're adding to the UI
    console.log(`Adding player entry: ${displayName} with value ${valueText} and color ${colorIndicator.style.backgroundColor}`);
    
    // Add elements to entry
    playerEntry.appendChild(colorIndicator);
    playerEntry.appendChild(playerInfo);
    playerListElement.appendChild(playerEntry);
}

// Get position from player object, with validation
function getPlayerPosition(player) {
    if (!player) return { x: 0, y: 0, z: 0 };
    return {
        x: player.x || 0,
        y: player.y || 0,
        z: player.z || 0,
        rotationY: player.rotationY || 0,
        pitch: player.pitch || 0
    };
}

// Set up key event listeners for player list toggle
function setupPlayerListKeyControls() {
    // Using keydown to capture Tab key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault(); // Prevent default tab behavior
            togglePlayerList(); // Use a dedicated toggle function
        }
    });
}

// Function to toggle player list visibility
function togglePlayerList() {
    const playerList = document.getElementById('player-list');
    const collapseIcon = document.getElementById('collapse-icon');
    
    if (!playerList || !collapseIcon) return;
    
    console.log("Toggling player list visibility");
    
    if (playerList.style.display === 'none') {
        playerList.style.display = 'block';
        collapseIcon.textContent = '▼';
    } else {
        playerList.style.display = 'none';
        collapseIcon.textContent = '▶';
    }
}

// Send player position updates to the server
window.sendPlayerUpdate = function(position, rotationY, pitch, value) {
    if (!room) {
        console.log("Room not connected, skipping position update");
        return;
    }
    
    try {
        let posX, posY, posZ;
        
        // Check if position is a Vector3 or a simple object
        if (position instanceof THREE.Vector3) {
            posX = position.x;
            posY = position.y;
            posZ = position.z;
        } else if (typeof position === 'object' && position !== null) {
            posX = position.x;
            posY = position.y;
            posZ = position.z;
        } else {
            console.error("Invalid position:", position);
            return;
        }
        
        // Validate data before sending
        if (isNaN(posX) || isNaN(posY) || isNaN(posZ)) {
            console.error("Position contains NaN values:", position);
            return;
        }
        
        // Send more detailed data to the server
        room.send("move", {
            x: posX,
            y: posY,
            z: posZ,
            rotationY: rotationY || 0,
            pitch: pitch || 0,
            value: value || 1
        });
        
        // Debug output for position updates
        if (window.DEBUG) {
            console.log(`Sent position: (${posX.toFixed(2)}, ${posY.toFixed(2)}, ${posZ.toFixed(2)}), rot: ${rotationY?.toFixed(2)}`);
        }
    } catch (error) {
        console.error("Error sending player update:", error);
    }
};

// Send operator collection message
function sendOperatorCollect(operatorId) {
    if (!room) return;
    
    room.send("collectOperator", {
        id: operatorId
    });
}

// Send numberblock collision message
function sendNumberblockCollision(targetId) {
    if (!room) return;
    
    room.send("numberblockCollision", {
        targetId: targetId
    });
}

// Define visual classes for each object type
window.PlayersVisual = class PlayersVisual {
    constructor(playerData) {
        console.log("Creating player visual with data:", playerData);
        
        this.value = playerData.value;
        this.color = playerData.color || getColorForValue(this.value);
        
        // Create a Numberblock for this player
        const NumberblockClass = window.Numberblock || Numberblock;
        
        try {
            this.numberblock = new NumberblockClass(this.value, this.color);
            this.mesh = this.numberblock.mesh;
            
            // Set initial position
            this.mesh.position.set(playerData.x, playerData.y, playerData.z);
            
            // Set rotation if available
            if (playerData.rotationY !== undefined) {
                this.mesh.rotation.y = playerData.rotationY;
            }
            
            // Add player name label above the numberblock
            if (playerData.name) {
                const nameDiv = document.createElement('div');
                nameDiv.className = 'player-name-label';
                nameDiv.textContent = playerData.name;
                nameDiv.style.color = 'white';
                nameDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
                nameDiv.style.padding = '2px 5px';
                nameDiv.style.borderRadius = '3px';
                nameDiv.style.userSelect = 'none';
                
                const nameLabel = new CSS2DObject(nameDiv);
                nameLabel.position.set(0, this.numberblock.getHeight() + 0.5, 0);
                this.mesh.add(nameLabel);
            }
        } catch (error) {
            console.error("Error creating player visual:", error);
            // Create a fallback placeholder mesh
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: this.color });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(playerData.x, playerData.y, playerData.z);
        }
    }
    
    update(playerData) {
        console.log("Updating player visual with data:", playerData);
        
        // Skip update for null/undefined data
        if (!playerData) {
            console.warn("Received invalid player data");
            return;
        }
        
        // Update position
        if (this.mesh) {
            // Only update position if we have valid coordinates
            if (playerData.x !== undefined && playerData.y !== undefined && playerData.z !== undefined) {
                // Check if values are not NaN
                if (!isNaN(playerData.x) && !isNaN(playerData.y) && !isNaN(playerData.z)) {
                    this.mesh.position.set(playerData.x, playerData.y, playerData.z);
                } else {
                    console.warn("Received NaN position values", playerData);
                }
            }
            
            // Update rotation if available and valid
            if (playerData.rotationY !== undefined && !isNaN(playerData.rotationY)) {
                this.mesh.rotation.y = playerData.rotationY;
            }
            
            // Force the mesh to be visible
            this.mesh.visible = true;
        } else {
            console.warn("No mesh exists for this player visual");
        }
        
        // Update value if changed and we have an updateValue method
        if (this.value !== playerData.value && playerData.value !== undefined && !isNaN(playerData.value)) {
            console.log(`Player value changed from ${this.value} to ${playerData.value}`);
            this.value = playerData.value;
            
            if (this.numberblock && typeof this.numberblock.updateValue === 'function') {
                // Try the elegant update if available
                this.numberblock.updateValue(this.value);
            } else {
                // Fallback to recreate the mesh
                const oldMesh = this.mesh;
                const position = oldMesh.position.clone();
                const rotation = oldMesh.rotation.clone();
                
                // Remove old mesh
                if (window.scene) {
                    window.scene.remove(oldMesh);
                }
                
                // Create new mesh
                const NumberblockClass = window.Numberblock || Numberblock;
                this.numberblock = new NumberblockClass(this.value, this.color);
                this.mesh = this.numberblock.mesh;
                
                // Set position and rotation
                this.mesh.position.copy(position);
                this.mesh.rotation.copy(rotation);
                
                // Add to scene
                if (window.scene) {
                    window.scene.add(this.mesh);
                }
                
                // Dispose old resources
                if (oldMesh.geometry) oldMesh.geometry.dispose();
                if (oldMesh.material) {
                    if (Array.isArray(oldMesh.material)) {
                        oldMesh.material.forEach(m => m.dispose());
                    } else {
                        oldMesh.material.dispose();
                    }
                }
            }
        }
    }
};

window.OperatorsVisual = class OperatorsVisual {
    constructor(operatorData) {
        console.log("Creating operator visual with data:", operatorData);
        
        this.type = operatorData.type; // "+" or "-"
        this.value = operatorData.value || 1;
        
        // Create a mesh for this operator
        this.createOperatorMesh();
        
        // Set initial position
        this.mesh.position.set(operatorData.x, operatorData.y, operatorData.z);
        
        // Add a rotation animation
        this.rotationSpeed = 0.01;
        this.bounceHeight = 0.2;
        this.bounceSpeed = 0.5;
        this.initialY = operatorData.y;
        this.time = Math.random() * 1000; // Randomize starting point in animation
    }
    
    createOperatorMesh() {
        // Create operator text geometry
        const operatorSymbol = this.type === "add" ? "+" : "-";
        const color = this.type === "add" ? 0x00ff00 : 0xff0000; // Green for +, Red for -
        
        try {
            // Check if font loader is available in window
            if (window.fontLoader) {
                // Create text geometry for the operator
                window.fontLoader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
                    const textGeometry = new THREE.TextGeometry(operatorSymbol, {
                        font: font,
                        size: 0.5,
                        height: 0.1,
                    });
                    
                    const textMaterial = new THREE.MeshStandardMaterial({
                        color: color,
                        emissive: color,
                        emissiveIntensity: 0.5,
                        transparent: true,
                        opacity: 0.9
                    });
                    
                    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
                    
                    // Center the text geometry
                    textGeometry.computeBoundingBox();
                    const textSize = textGeometry.boundingBox.getSize(new THREE.Vector3());
                    textMesh.position.set(-textSize.x/2, -textSize.y/2, -textSize.z/2);
                    
                    // Create a group to hold the text and allow for easier rotation
                    const group = new THREE.Group();
                    group.add(textMesh);
                    
                    // Add a glow effect (sphere with transparent material)
                    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
                    const glowMaterial = new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.3
                    });
                    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                    group.add(glowMesh);
                    
                    // Replace placeholder if it exists
                    if (this.mesh && this.mesh.parent) {
                        const position = this.mesh.position.clone();
                        const parent = this.mesh.parent;
                        parent.remove(this.mesh);
                        this.mesh = group;
                        this.mesh.position.copy(position);
                        parent.add(this.mesh);
                    } else {
                        this.mesh = group;
                    }
                });
            } else {
                // Fallback if font loader is not available
                console.warn("Font loader not available, creating fallback operator mesh");
                this.createFallbackMesh(color);
            }
        } catch (error) {
            console.error("Error creating operator text mesh:", error);
            this.createFallbackMesh(color);
        }
    }
    
    createFallbackMesh(color) {
        // Create a simple shape as fallback
        const geometry = this.type === "add" ? 
            new THREE.OctahedronGeometry(0.3) : 
            new THREE.BoxGeometry(0.5, 0.2, 0.2);
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        
        // Create a group to hold both meshes
        const group = new THREE.Group();
        group.add(this.mesh);
        group.add(glowMesh);
        
        this.mesh = group;
    }
    
    update(operatorData) {
        // Update position
        this.mesh.position.set(operatorData.x, operatorData.y, operatorData.z);
        this.initialY = operatorData.y; // Update initial Y for animation
        
        // Update type if changed
        if (this.type !== operatorData.type) {
            console.log(`Operator type changed from ${this.type} to ${operatorData.type}`);
            this.type = operatorData.type;
            
            // Recreate mesh with new type
            const oldMesh = this.mesh;
            const position = oldMesh.position.clone();
            const parent = oldMesh.parent;
            
            // Create new mesh
            this.createOperatorMesh();
            this.mesh.position.copy(position);
            
            // Add to scene/parent
            if (parent) {
                parent.remove(oldMesh);
                parent.add(this.mesh);
            } else if (window.scene) {
                window.scene.remove(oldMesh);
                window.scene.add(this.mesh);
            }
            
            // Dispose old resources (if possible)
            try {
                if (oldMesh.traverse) {
                    oldMesh.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("Error disposing operator resources:", error);
            }
        }
    }
    
    // Animate the operator (rotation and floating effect)
    animate(deltaTime) {
        if (!this.mesh) return;
        
        // Increment time counter
        this.time += deltaTime;
        
        // Rotate around Y axis
        this.mesh.rotation.y += this.rotationSpeed;
        
        // Floating effect (sine wave)
        const yOffset = Math.sin(this.time * this.bounceSpeed) * this.bounceHeight;
        this.mesh.position.y = this.initialY + yOffset;
        
        // Always face camera if available
        if (window.camera) {
            // Only align in XZ plane, keeping Y rotation normal
            const cameraPos = window.camera.position.clone();
            const meshPos = this.mesh.position.clone();
            
            // Set the same Y coordinate for both positions to only align in XZ plane
            cameraPos.y = meshPos.y;
            
            // Look at camera
            // We're not using lookAt directly on the mesh to avoid flipping issues
            // Instead, we use a temporary vector to calculate the direction
            const direction = new THREE.Vector3().subVectors(cameraPos, meshPos).normalize();
            const angle = Math.atan2(direction.x, direction.z);
            
            // Apply rotation only to inner content if it's a group
            if (this.mesh.children && this.mesh.children.length > 0) {
                this.mesh.children.forEach(child => {
                    if (child.isText) {
                        child.rotation.y = angle;
                    }
                });
            } else {
                this.mesh.rotation.y = angle;
            }
        }
    }
};

window.StaticNumberblocksVisual = class StaticNumberblocksVisual {
    constructor(blockData) {
        this.value = blockData.value;
        this.color = blockData.color;
        
        // Create a Numberblock for this static block
        const NumberblockClass = window.Numberblock || Numberblock;
        this.mesh = new NumberblockClass(this.value, this.color).mesh;
        
        // Set initial position
        this.mesh.position.set(blockData.x, blockData.y, blockData.z);
        
        // Static blocks don't move, but may rotate or animate
        if (blockData.rotationY !== undefined) {
            this.mesh.rotation.y = blockData.rotationY;
        }
    }
    
    update(blockData) {
        // Update position if needed (should be rare for static blocks)
        this.mesh.position.set(blockData.x, blockData.y, blockData.z);
        
        // Update rotation if available
        if (blockData.rotationY !== undefined) {
            this.mesh.rotation.y = blockData.rotationY;
        }
        
        // Update value if changed
        if (this.value !== blockData.value) {
            console.log(`Static block value changed from ${this.value} to ${blockData.value}`);
            this.value = blockData.value;
            
            // Create a new Numberblock with the updated value
            const oldMesh = this.mesh;
            const position = oldMesh.position.clone();
            const rotation = oldMesh.rotation.clone();
            
            // Remove old mesh
            window.scene.remove(oldMesh);
            
            // Create new mesh
            const NumberblockClass = window.Numberblock || Numberblock;
            const numberblock = new NumberblockClass(this.value, this.color);
            this.mesh = numberblock.mesh;
            
            // Set position and rotation
            this.mesh.position.copy(position);
            this.mesh.rotation.copy(rotation);
            
            // Add to scene
            window.scene.add(this.mesh);
            
            // Dispose old resources
            if (oldMesh.geometry) oldMesh.geometry.dispose();
            if (oldMesh.material) {
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach(m => m.dispose());
                } else {
                    oldMesh.material.dispose();
                }
            }
        }
    }
};

// Make functions available globally
window.initNetworking = initNetworking;
window.updatePlayerListUI = updatePlayerListUI;
window.getPlayerPosition = getPlayerPosition;
window.sendPlayerUpdate = sendPlayerUpdate;
window.sendOperatorCollect = sendOperatorCollect;
window.sendNumberblockCollision = sendNumberblockCollision;
window.getColorForValue = getColorForValue;
window.togglePlayerList = togglePlayerList;
window.visuals = visuals; // Export for debugging
