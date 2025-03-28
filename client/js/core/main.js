// 3D Game Platform - Main Entry Point

// Parse URL parameters for customization
function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    // Get custom player name if provided
    if (urlParams.has('playerName')) {
        params.playerName = urlParams.get('playerName');
    }
    
    // Get custom player color if provided
    if (urlParams.has('playerColor')) {
        // Convert hex string to number
        const colorStr = urlParams.get('playerColor');
        params.playerColor = parseInt(colorStr, 16);
    }
    
    return params;
}

// Get URL parameters
const urlParams = getUrlParams();

// Game configuration
const gameConfig = {
    debug: false,                 // Debug mode
    sceneSettings: {
        groundSize: 100,          // Size of the ground plane
        skyColor: 0x87CEEB,       // Sky color
        groundColor: 0x228B22     // Ground color
    },
    playerSettings: {
        startPosition: {
            x: 0,
            y: 1,
            z: 0
        },
        viewMode: 'firstPerson',   // 'firstPerson', 'thirdPerson', or 'freeRoam'
        // Use custom player name if provided in URL, otherwise generate random name
        playerName: urlParams.playerName || `Player_${Math.floor(Math.random() * 1000)}`,
        playerColor: urlParams.playerColor || 0xCCCCCC, // Default to grey
        playerModelPath: 'models/fbx/Idle.fbx' // Path to the player model
    },
    networkSettings: {
        serverUrl: window.location.hostname.includes('localhost') 
            ? `ws://${window.location.hostname}:3000` // Local development
            : `wss://${window.location.hostname}`,    // Production
        roomName: 'active'       // Default active room
    }
};

// Store config globally for access by other modules
window.gameConfig = gameConfig;

// Main game initialization
function initGame() {
    console.log('Initializing 3D Game Platform...');
    
    // Display player name in loading screen if custom name provided
    if (urlParams.playerName) {
        const loadingStatus = document.getElementById('loading-status');
        loadingStatus.textContent = `Loading game engine for ${urlParams.playerName}...`;
    }
    
    // Load core modules
    loadCoreModules()
        .then(() => {
            // Initialize the game engine
            initGameEngine();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
        });
}

// Load core platform modules
function loadCoreModules() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Loading core modules...');
            
            // Create core module paths
            const corePath = 'js/core/';
            const coreModules = [
                'Entity.js',
                'Player.js',
                'NPC.js',
                'EntityFactory.js',
                'collision.js',
                'player-ui.js',
                'network-core.js',
                'controls.js'
            ];
            
            // Add implementation-specific modules (currently just DefaultPlayer)
            const implementationPath = 'js/implementations/default/';
            const implementationModules = [
                'DefaultPlayer.js'
            ];
            
            // Load each module in sequence
            let loadPromise = Promise.resolve();
            
            coreModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(corePath + module);
                });
            });
            
            // Load each implementation module after core modules
            implementationModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(implementationPath + module);
                });
            });
            
            // Resolve when all core modules are loaded
            loadPromise.then(() => {
                console.log('Core modules loaded successfully');
                resolve();
            }).catch(error => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize the main game engine
function initGameEngine() {
    console.log('Initializing game engine...');
    
    // Initialize default player factory first
    window.createPlayerEntity = function(scene, value = 1) {
        // Dynamically select Player class based on availability
        const PlayerClass = window.DefaultPlayer || window.Player; // Use DefaultPlayer if loaded
        console.log(`[createPlayerEntity] Using Player class: ${PlayerClass.name}`);
        
        // Create a player with color from gameConfig
        const player = new PlayerClass({
            id: 'player',
            isLocalPlayer: true,
            color: gameConfig.playerSettings.playerColor,
            scene: scene // Pass the scene object
        });
        
        // Register the local player's update method to be called in the animation loop
        if (typeof player.update === 'function' && typeof registerAnimationCallback === 'function') {
            // Bind the update function to the player instance to ensure 'this' is correct
            registerAnimationCallback(player.update.bind(player));
            console.log(`[createPlayerEntity] Registered update callback for local player: ${player.id}`);
        } else {
            console.warn(`[createPlayerEntity] Could not register update callback for local player. Missing player.update or registerAnimationCallback.`);
        }
        
        if (scene && player.mesh) {
            scene.add(player.mesh);
        }
        
        return player;
    };
    
    // Load the game engine
    loadScript('js/core/game-engine.js')
        .then(() => {
            console.log('Game engine loaded');
            // Remove the loading screen once everything is loaded
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Set isFirstPerson based on viewMode
            window.isFirstPerson = gameConfig.playerSettings.viewMode === 'firstPerson';
            window.viewMode = gameConfig.playerSettings.viewMode;
        })
        .catch(error => {
            console.error('Error loading game engine:', error);
        });
}

// Helper function to load a script asynchronously
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Check if this script has already been loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`Script already loaded: ${src}`);
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Start the game when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 