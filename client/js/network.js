// Network configuration
const endpoint = 'ws://localhost:3000';
let client = null;
let room = null;

// Store references to UI elements for players
let playerListElement = null;
let playerCountElement = null;

// Make sure UI references are available after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    playerListElement = document.getElementById('player-list');
    playerCountElement = document.getElementById('player-count');
    
    // Set up player list toggle via click
    const playerListHeader = document.getElementById('player-list-header');
    if (playerListHeader) {
        playerListHeader.addEventListener('click', togglePlayerList);
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

// Initialize the networking
async function initNetworking() {
    try {
        console.log(`Initializing networking with endpoint: ${endpoint}`);
        client = new Colyseus.Client(endpoint);
        
        // Join with a player name
        const playerName = `Player${Math.floor(Math.random() * 1000)}`;
        console.log("Attempting to join room with name:", playerName);
        
        // Join the room
        room = await client.joinOrCreate("numberblocks", { name: playerName });
        console.log(`Connected to server with session ID: ${room.sessionId}`);
        
        // Setup connection message handlers
        setupMessageHandlers();
        
        // Setup state change listeners
        setupStateChangeListeners();
        
        return room;
    } catch (error) {
        console.error(`Error connecting to Colyseus server: ${error}`);
        // Don't throw, just log the error and continue - allows game to work in offline mode
        console.log("Continuing in offline mode");
    }
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

// Setup state change listeners
function setupStateChangeListeners() {
    if (!room) return;
    
    // Debug: Log room id and sessionId
    console.log(`Room ID: ${room.id}, Session ID: ${room.sessionId}`);
    
    // First state sync
    room.onStateChange.once((state) => {
        console.log("Initial state synchronized:", state);
        
        // Explicitly verify schema iteration is working
        if (state.players) {
            console.log("VERIFICATION: Testing schema iteration...");
            state.players.forEach((player, sessionId) => {
                console.log("PLAYER DATA:", sessionId, player.name, player.x, player.y, player.z, player.value, player.color);
            });
        } else {
            console.error("VERIFICATION FAILED: players collection missing from state!");
        }
        
        // Setup room event handlers now that we have the state
        setupRoomHandlers();
    });
    
    // Handle ongoing state changes
    room.onStateChange((state) => {
        // Log periodic state updates
        console.log("State updated, current players:");
        if (state.players) {
            state.players.forEach((player, sessionId) => {
                console.log(`Player ${sessionId}: value=${player.value}, position=(${player.x},${player.y},${player.z})`);
            });
        }
        
        updatePlayerListUI();
    });
}

// Set up room event handlers after state is available
function setupRoomHandlers() {
    if (!room || !room.state) {
        console.error("Cannot setup handlers: room or state is not initialized");
        return;
    }
    
    console.log("Setting up room handlers with state:", room.state);
    
    // Watch for player additions and removals
    if (room.state.players) {
        // Set up player listeners with error handling
        try {
            // Listen for player additions
            room.state.players.onAdd = function(player, sessionId) {
                console.log(`Player added: ${sessionId}`, player);
                
                // Also listen for changes to this player
                player.onChange = function() {
                    console.log(`Player ${sessionId} changed:`, player);
                    updatePlayerListUI();
                };
                
                // Update UI when a player is added
                updatePlayerListUI();
            };
            
            // Listen for player removals
            room.state.players.onRemove = function(player, sessionId) {
                console.log(`Player removed: ${sessionId}`);
                updatePlayerListUI();
            };
            
            console.log("Successfully set up player schema listeners");
        } catch (error) {
            console.error("Error setting up schema listeners:", error);
            // Fall back to periodic updates
            console.log("Falling back to periodic updates");
            setInterval(updatePlayerListUI, 1000);
        }
    } else {
        console.warn("No players collection found in state:", room.state);
        // Fallback to periodic updates
        setInterval(updatePlayerListUI, 1000);
    }
    
    // Initial update
    updatePlayerListUI();
    
    // Set up key handlers for player list toggle
    setupPlayerListKeyControls();
}

// Update player list in UI
function updatePlayerListUI() {
    // Get references if not yet set
    if (!playerListElement) playerListElement = document.getElementById('player-list');
    if (!playerCountElement) playerCountElement = document.getElementById('player-count');
    
    if (!playerListElement || !playerCountElement) {
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
                            console.log(`Player [${key}]:`, player);
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
    playerCountElement.textContent = `(${playerCount})`;
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

// Send player update to server
function sendPlayerUpdate(position, rotation, pitch, value) {
    if (!room) return;
    
    // Send position and rotation update to server
    room.send("move", {
        x: position.x,
        y: position.y,
        z: position.z,
        rotationY: rotation,
        pitch: pitch
    });
}

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

// Make functions available globally
window.initNetworking = initNetworking;
window.updatePlayerListUI = updatePlayerListUI;
window.getPlayerPosition = getPlayerPosition;
window.sendPlayerUpdate = sendPlayerUpdate;
window.sendOperatorCollect = sendOperatorCollect;
window.sendNumberblockCollision = sendNumberblockCollision;
window.getColorForValue = getColorForValue;
window.togglePlayerList = togglePlayerList;
