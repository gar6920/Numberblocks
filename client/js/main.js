// 3D AI Game Platform - Main Entry Point

// Game configuration - can be modified for different implementations
const gameConfig = {
    implementation: 'numberblocks', // Default implementation
    debug: false,                  // Debug mode
    sceneSettings: {
        groundSize: 100,           // Size of the ground plane
        skyColor: 0x87CEEB,        // Sky color
        groundColor: 0x228B22      // Ground color
    },
    playerSettings: {
        startValue: 1,             // Starting value for player
        startPosition: {
            x: 0,
            y: 1,
            z: 0
        },
        viewMode: 'firstPerson'    // 'firstPerson', 'thirdPerson', or 'freeRoam'
    },
    networkSettings: {
        serverUrl: window.location.hostname.includes('localhost') 
            ? `ws://${window.location.hostname}:2567` // Local development
            : `wss://${window.location.hostname}`,    // Production
        roomName: 'game_room'
    }
};

// Store config globally for access by other modules
window.gameConfig = gameConfig;

// Main game initialization
function initGame() {
    console.log('Initializing 3D AI Game Platform...');
    
    // Load the core platform modules first
    loadCorePlatform()
        .then(() => {
            // Then load the selected implementation
            return loadImplementation(gameConfig.implementation);
        })
        .then(() => {
            // Initialize the game engine with the loaded implementation
            initGameEngine();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
        });
}

// Load core platform modules
function loadCorePlatform() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Loading core platform...');
            
            // Create core module paths
            const corePath = 'js/core/';
            const coreModules = [
                'Entity.js',
                'Player.js',
                'NPC.js',
                'EntityFactory.js',
                'collision.js',
                'player-ui.js',
                // Add any other core modules here
            ];
            
            // Load each module in sequence
            let loadPromise = Promise.resolve();
            
            coreModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(corePath + module);
                });
            });
            
            // Resolve when all core modules are loaded
            loadPromise.then(() => {
                console.log('Core platform loaded successfully');
                resolve();
            }).catch(error => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Load implementation-specific modules
function loadImplementation(implementation) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Loading ${implementation} implementation...`);
            
            // Create implementation module path
            const implPath = `js/implementations/${implementation}/`;
            
            // First load the visual component classes
            loadScript(implPath + 'numberblock.js')
                .then(() => loadScript(implPath + 'operator.js'))
                .then(() => loadScript(implPath + 'NumberBlock.js'))
                .then(() => loadScript(implPath + 'index.js'))
                .then(() => {
                    console.log(`${implementation} implementation loaded successfully`);
                    
                    // Register the implementation
                    if (window.registerNumberblocksImplementation) {
                        window.registerNumberblocksImplementation();
                    }
                    
                    resolve();
                })
                .catch(error => {
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
    
    // Now load the main game engine script
    // This script will use the loaded modules and create the actual game
    loadScript('js/main-fixed.js')
        .then(() => {
            console.log('Game engine loaded');
        })
        .catch(error => {
            console.error('Error loading game engine:', error);
        });
}

// Helper function to load a script asynchronously
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Start the game when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 