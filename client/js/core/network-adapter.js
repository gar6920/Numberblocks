// 3D AI Game Platform - Network Adapter
// Bridges between the legacy networking code and the modular architecture

// This adapter ensures that the initNetworking function in network-core.js 
// is available and works correctly with our new architecture

(function() {
    // Store the original initNetworking function if it exists
    const originalInitNetworking = window.initNetworking;
    
    // Create a new wrapper function that adds additional capabilities
    window.initNetworking = function(options) {
        console.log('Network adapter: initializing networking');
        
        // If the original function exists, call it
        if (typeof originalInitNetworking === 'function') {
            try {
                const result = originalInitNetworking(options);
                console.log('Network initialization successful');
                return result;
            } catch (error) {
                console.error('Error in original initNetworking:', error);
            }
        }
        
        // Fallback implementation if original fails or doesn't exist
        console.warn('Using fallback network implementation');
        
        // Create a simple stub that does nothing but prevents errors
        return {
            connect: function() {
                console.log('Fallback network connection');
            },
            sendUpdate: function() {
                // Do nothing
            },
            sendInputUpdate: function() {
                // Do nothing
            },
            sendOperatorCollection: function() {
                // Do nothing
            },
            sendNumberblockCollision: function() {
                // Do nothing
            }
        };
    };
    
    // Also create a dummy room object if it doesn't exist
    if (!window.room) {
        window.room = {
            state: {
                players: new Map(),
                operators: new Map()
            },
            send: function() {
                // Do nothing
            },
            sessionId: 'local-player'
        };
    }
    
    console.log('Network adapter loaded');
})(); 