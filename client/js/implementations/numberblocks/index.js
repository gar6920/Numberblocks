// 3D AI Game Platform - Numberblocks Implementation Index
// Registers all Numberblocks implementation components with the core platform

// Import the core factory
// Note: These should already be globally available through window object
const entityFactory = window.entityFactory;

// Registration function to set up all Numberblocks implementation components
function registerNumberblocksImplementation() {
    console.log("Registering Numberblocks implementation...");
    
    if (!entityFactory) {
        console.error("EntityFactory not found. Make sure core platform is loaded first.");
        return false;
    }
    
    // Register all Numberblocks-specific entity types
    entityFactory.registerImplementation('numberblocks', {
        'numberblock': window.NumberBlock,
        'operator': window.Operator
    });
    
    // Set up global configs for Numberblocks implementation
    window.gameImplementation = {
        name: 'numberblocks',
        description: 'Mathematical blocks implementation',
        version: '1.0.0',
        
        // Create a player entity for this implementation
        createPlayer: function(params) {
            params.type = 'numberblocks.numberblock';
            return entityFactory.createPlayer(params);
        },
        
        // Create an operator entity for this implementation
        createOperator: function(params) {
            params.type = 'numberblocks.operator';
            return entityFactory.createEntity(params.type, params);
        },
        
        // Initialize the implementation
        init: function(scene) {
            console.log("Initializing Numberblocks implementation...");
            
            // Create the operator manager
            window.operatorManager = new window.OperatorManager(scene);
            
            return true;
        },
        
        // Clean up the implementation
        cleanup: function() {
            console.log("Cleaning up Numberblocks implementation...");
            
            // Clean up operator manager
            if (window.operatorManager) {
                window.operatorManager.clearAll();
            }
        }
    };
    
    console.log("Numberblocks implementation registered successfully");
    return true;
}

// Auto-register if window is available
if (typeof window !== 'undefined') {
    window.registerNumberblocksImplementation = registerNumberblocksImplementation;
    
    // Auto-register if the page is already loaded
    if (document.readyState === 'complete') {
        registerNumberblocksImplementation();
    } else {
        // Otherwise wait for DOM content to load
        window.addEventListener('DOMContentLoaded', registerNumberblocksImplementation);
    }
}

if (typeof module !== 'undefined') {
    module.exports = { registerNumberblocksImplementation };
} 