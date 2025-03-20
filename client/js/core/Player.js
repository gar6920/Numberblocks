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
        if (!this.isLocalPlayer) {
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
    
    // Base createMesh method - should be overridden by implementation-specific player classes
    createMesh() {
        console.warn("createMesh() method not implemented in Player base class");
        
        // Create a simple placeholder mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: this.color || 0xFFFFFF });
        return new THREE.Mesh(geometry, material);
    }

    // Base methods for updating value and color - to be overridden by implementations
    updateValue(newValue) {
        super.updateValue(newValue);
    }

    updateColor(newColor) {
        super.updateColor(newColor);
    }
}

// Export the Player class
if (typeof window !== 'undefined') {
    window.Player = Player;
}

if (typeof module !== 'undefined') {
    module.exports = { Player };
} 