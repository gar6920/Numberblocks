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
    
    // Load legacy modules first (these are needed for main-fixed.js)
    loadLegacyModules()
        .then(() => {
            // Then load the core platform modules
            return loadCorePlatform();
        })
        .then(() => {
            // Load adapter modules
            return loadAdapters();
        })
        .then(() => {
            // Set up adapter functions to bridge between new architecture and old code
            setupAdapterFunctions();
            // Then load the selected implementation
            return loadImplementation(gameConfig.implementation);
        })
        .then(() => {
            // Ensure backwards compatibility
            ensureBackwardsCompatibility();
            // Initialize the game engine with the loaded implementation
            initGameEngine();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
        });
}

// Load legacy modules needed for main-fixed.js
function loadLegacyModules() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Loading legacy modules...');
            
            // These are modules that main-fixed.js directly depends on
            const legacyModules = [
                'js/controls.js',
                'js/network-core.js',
                'js/numberblock.js', // Used directly by main-fixed.js
            ];
            
            // Load each module in sequence
            let loadPromise = Promise.resolve();
            
            legacyModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(module);
                });
            });
            
            // Resolve when all legacy modules are loaded
            loadPromise.then(() => {
                console.log('Legacy modules loaded successfully');
                resolve();
            }).catch(error => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
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

// Load adapter modules
function loadAdapters() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Loading adapter modules...');
            
            // Adapter modules to bridge between old and new architecture
            const adapterPath = 'js/core/';
            const adapterModules = [
                'network-adapter.js',
                'controls-adapter.js',
                'numberblock-adapter.js',
            ];
            
            // Load each module in sequence
            let loadPromise = Promise.resolve();
            
            adapterModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(adapterPath + module);
                });
            });
            
            // Resolve when all adapter modules are loaded
            loadPromise.then(() => {
                console.log('Adapter modules loaded successfully');
                resolve();
            }).catch(error => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Set up adapter functions to bridge between new modules and old code
function setupAdapterFunctions() {
    console.log('Setting up adapter functions...');
    
    // These should now be handled by the adapter modules
}

// Load implementation-specific modules
function loadImplementation(implementation) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Loading ${implementation} implementation...`);
            
            // For Numberblocks, we've already loaded the primary implementation file
            // Just load any additional files and register it
            if (implementation === 'numberblocks') {
                // Skip loading NumberBlock.js since it's causing conflicts
                loadScript(`js/implementations/${implementation}/operator.js`)
                    .then(() => {
                        console.log(`${implementation} implementation loaded successfully`);
                        resolve();
                    })
                    .catch(error => {
                        console.warn(`Error loading operator.js: ${error}, continuing anyway`);
                        resolve(); // Continue anyway
                    });
            } else {
                // For other implementations, load all files
                const implPath = `js/implementations/${implementation}/`;
                
                loadScript(implPath + 'index.js')
                    .then(() => {
                        console.log(`${implementation} implementation loaded successfully`);
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Ensure backwards compatibility with main-fixed.js
function ensureBackwardsCompatibility() {
    console.log('Ensuring backwards compatibility...');
    
    // These should now be handled by the adapter modules
    
    // Set up isFirstPerson for view mode
    window.isFirstPerson = gameConfig.playerSettings.viewMode === 'firstPerson';
    
    // Set up event to notify when the game is fully loaded
    window.addEventListener('load', function() {
        // Create and dispatch a custom event
        const gameLoadedEvent = new Event('gameLoaded');
        window.dispatchEvent(gameLoadedEvent);
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