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

// Function to initialize networking for multiplayer
async function initNetworking() {
    try {
        console.log("Connecting to Colyseus server at:", endpoint);
        
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
            room = await client.joinOrCreate("numberblocks_room", {
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
            
            // Setup room listeners after a slight delay
            setTimeout(() => {
                // Room listeners
                if (room) {
                    window.roomInitialized = false;
                    setupRoomListeners(room);
                    
                    // Check if room initialization succeeded
                    const checkRoomInit = () => {
                        if (window.roomInitialized) {
                            // Process existing players
                            processExistingPlayers();
                            
                            // Initial player list update
                            updatePlayerListUI();
                            
                            // Notify that avatar is ready
                            window.dispatchEvent(new CustomEvent('avatarReady'));
                            console.log("Avatar is ready");
                        } else {
                            // Keep checking if not initialized yet
                            setTimeout(checkRoomInit, 100);
                        }
                    };
                    
                    // Start initialization check
                    checkRoomInit();
                } else {
                    console.error("Room not available for initialization");
                }
            }, 500);
            
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
function sendPlayerUpdate(position, rotationY, pitch, value) {
    if (!room) return;
    
    try {
        // Validate inputs before sending
        if (!position || position.x === undefined) {
            console.warn("Invalid position for player update");
            return;
        }
        
        // Send update to the server
        room.send("player-update", {
            x: position.x,
            y: position.y,
            z: position.z,
            rotationY: rotationY || 0,
            pitch: pitch || 0,
            value: value || 1
        });
    } catch (error) {
        console.error("Error sending player update:", error);
    }
}

// Send operator collection message
function sendOperatorCollect(operatorId) {
    if (!room) return;
    
    room.send("collect-operator", { id: operatorId });
}

// Send numberblock collision message
function sendNumberblockCollision(targetId) {
    if (!room) return;
    
    room.send("numberblock-collision", { targetId: targetId });
}

// Make functions available globally
window.initNetworking = initNetworking;
window.setupMessageHandlers = setupMessageHandlers;
window.sendPlayerUpdate = sendPlayerUpdate;
window.sendOperatorCollect = sendOperatorCollect;
window.sendNumberblockCollision = sendNumberblockCollision;
window.getRandomColor = getRandomColor;
window.getColorForValue = getColorForValue;
window.CSS2DObject = CSS2DObject;
window.CSS2DRenderer = CSS2DRenderer;
