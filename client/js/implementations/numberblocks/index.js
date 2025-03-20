// 3D AI Game Platform - Numberblocks Implementation Index
// Registers all Numberblocks implementation components with the core platform

// Note: These should already be globally available through window object
// Use existing objects if they're already declared to avoid conflicts
let entityFactory = window.entityFactory;

// Registration function to set up all Numberblocks implementation components
function registerNumberblocksImplementation() {
    console.log("Registering Numberblocks implementation...");
    
    if (!entityFactory) {
        console.error("EntityFactory not found. Make sure core platform is loaded first.");
        return false;
    }
    
    // Check if the implementation is already registered
    if (entityFactory.implementationRegistry && 
        entityFactory.implementationRegistry['numberblocks.numberblock']) {
        console.log("Numberblocks implementation already registered");
        return true;
    }
    
    // Register Numberblocks-specific entity types only if not already registered
    try {
        // If NumberBlock is defined in both new structure and legacy system,
        // prefer to keep the one that's already being used
        const NumberBlockImpl = window.NumberBlock || {};
        const OperatorImpl = window.Operator || {};
        
        entityFactory.registerImplementation('numberblocks', {
            'numberblock': NumberBlockImpl,
            'operator': OperatorImpl
        });
        
        // Set up global configs for Numberblocks implementation
        window.gameImplementation = window.gameImplementation || {
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
                
                // Use existing operator manager if available
                window.operatorManager = window.operatorManager || {};
                
                return true;
            },
            
            // Clean up the implementation
            cleanup: function() {
                console.log("Cleaning up Numberblocks implementation...");
                
                // Clean up operator manager if it exists
                if (window.operatorManager && window.operatorManager.clearAll) {
                    window.operatorManager.clearAll();
                }
            }
        };
        
        console.log("Numberblocks implementation registered successfully");
        return true;
    } catch (error) {
        console.error("Error registering Numberblocks implementation:", error);
        return false;
    }
}

// Auto-register if window is available
if (typeof window !== 'undefined') {
    // Only define the function if it doesn't already exist
    if (!window.registerNumberblocksImplementation) {
        window.registerNumberblocksImplementation = registerNumberblocksImplementation;
    }
    
    // Auto-register if the page is already loaded
    if (document.readyState === 'complete') {
        registerNumberblocksImplementation();
    } else {
        // Otherwise wait for DOM content to load
        window.addEventListener('DOMContentLoaded', registerNumberblocksImplementation);
    }
}

// If using as a module
if (typeof module !== 'undefined') {
    module.exports = { registerNumberblocksImplementation };
} 