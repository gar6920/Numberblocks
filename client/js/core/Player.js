// 3D AI Game Platform - Core Player entity class

class Player extends Entity {
    constructor(params) {
        super(params);
        this.isPlayer = true;
        this.isLocalPlayer = params.isLocalPlayer || false;
        
        // Player-specific properties
        this.moveSpeed = params.moveSpeed || 5.0;
        this.jumpHeight = params.jumpHeight || 5.0;
        this.isJumping = false;
        this.isColliding = false;
        this.controls = null;
        
        // This will be overridden in implementation-specific player classes
        if (this.isLocalPlayer && this.initLocalPlayer) {
            this.initLocalPlayer();
        }
    }
    
    // For local player, position is controlled by PointerLockControls
    // For remote players, position is updated via network
    updatePosition(position) {
        // Only update remote players via network updates
        if (!this.isLocalPlayer && this.mesh) {
            super.updatePosition(position);
        }
    }
    
    // Base method for creating player camera - to be implemented by subclasses
    createPlayerCamera() {
        if (this.isLocalPlayer) {
            console.warn("createPlayerCamera() method not implemented in Player base class");
        }
    }
    
    // Base method for handling player input - to be implemented by subclasses
    handleInput(inputState) {
        if (this.isLocalPlayer) {
            console.warn("handleInput() method not implemented in Player base class");
        }
    }
    
    // Base methods for updating value 
    updateValue(newValue) {
        super.updateValue(newValue);
    }

    // Base method for initializing local player controls - may be overridden
    initLocalPlayer() { }
}

// Make available globally
window.Player = Player;

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = { Player };
}