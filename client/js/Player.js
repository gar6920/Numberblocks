// Numberblocks game - Player entity class

class Player extends Entity {
    constructor(params) {
        super(params);
        this.isPlayer = true;
        this.isLocalPlayer = params.isLocalPlayer || false;
        
        // Player-specific properties
        this.moveSpeed = 5.0;
        this.jumpHeight = 5.0;
        this.isJumping = false;
        this.isColliding = false;
        this.controls = null;
        
        // Override the mesh if this is the local player
        if (this.isLocalPlayer && window.playerNumberblock) {
            this.mesh = window.playerNumberblock.mesh;
            this.mesh.userData.entity = this;
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
    
    // Create playerCamera
    createPlayerCamera() {
        if (this.isLocalPlayer) {
            // Implementation of first-person camera setup
        }
    }
    
    // Handle player input and movement
    handleInput(inputState) {
        if (this.isLocalPlayer) {
            // Handle player input (WASD, etc)
        }
    }
    
    createMesh() {
        // Create visual representation based on the type
        switch (this.type) {
            case 'numberblock':
            default:
                // Default to numberblock for now
                const numberblock = new window.Numberblock(this.value, this.color, this.name);
                return numberblock.mesh;
        }
    }

    updateValue(newValue) {
        super.updateValue(newValue);
        
        // For numberblocks, we need to recreate the visual
        if (this.type === 'numberblock' && this.mesh) {
            const parentScene = this.mesh.parent;
            const position = this.mesh.position.clone();
            const rotation = this.mesh.rotation.y;
            
            // Remove old mesh
            if (parentScene) {
                parentScene.remove(this.mesh);
            }
            
            // Create new numberblock with updated value
            const numberblock = new window.Numberblock(newValue, this.color, this.name);
            this.mesh = numberblock.mesh;
            
            // Restore position and rotation
            this.mesh.position.copy(position);
            this.mesh.rotation.y = rotation;
            
            // Add back to scene
            if (parentScene) {
                parentScene.add(this.mesh);
            }
            
            // Store reference to this entity
            this.mesh.userData.entity = this;
        }
    }

    updateColor(newColor) {
        super.updateColor(newColor);
        
        // Update the color of all blocks in the numberblock
        if (this.type === 'numberblock' && this.mesh) {
            // Delegate to Numberblock's updateColor if we can
            const numberblockRef = this.mesh.userData.numberblockRef;
            if (numberblockRef && typeof numberblockRef.updateColor === 'function') {
                numberblockRef.updateColor(newColor);
            } else {
                // Otherwise traverse all children and update materials
                this.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.color.set(newColor);
                    }
                });
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Player = Player;
}

if (typeof module !== 'undefined') {
    module.exports = { Player };
}
