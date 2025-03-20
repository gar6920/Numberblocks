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
        
        // Create the player mesh if not already created
        if (!this.mesh && window.createPlayerNumberblock && window.scene) {
            this.value = params.value || 1;
            this.color = params.color || "#FFFF00";
            
            // Use createPlayerNumberblock function if available
            const numberblock = window.createPlayerNumberblock(window.scene, this.value);
            this.mesh = numberblock.mesh;
            
            // Apply color if specified
            if (numberblock.updateColor && this.color) {
                numberblock.updateColor(this.color);
            }
        }
        
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
    
    // Base createMesh method - should be overridden by implementation-specific player classes
    createMesh() {
        // Create a simple box player
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.color || 0xFFFF00,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        // Add shadow casting
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }

    // Base methods for updating value and color - to be overridden by implementations
    updateValue(newValue) {
        super.updateValue(newValue);
    }

    updateColor(newColor) {
        super.updateColor(newColor);
    }
}

// Make available globally
window.Player = Player;

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = { Player };
} 