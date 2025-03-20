// 3D AI Game Platform - Numberblocks Implementation
// Numberblock class that extends Player with Numberblocks-specific functionality

class NumberBlock extends Player {
    constructor(params) {
        super(params);
        this.type = 'numberblock';
        
        // Numberblock-specific properties
        this.blockSize = 1; // Size of each cube
        this.blockSpacing = 0.01; // Small gap between blocks
        this.totalHeight = 0;
        
        // For Numberblocks implementation, override the mesh if needed
        if (this.isLocalPlayer && window.playerNumberblock) {
            this.mesh = window.playerNumberblock.mesh;
            this.mesh.userData.entity = this;
        }
    }
    
    // Get the standard Numberblocks color based on value
    getColorForNumber(number) {
        const colors = {
            1: 0xFF0000,   // Red (One)
            2: 0xFFA500,   // Orange (Two)
            3: 0xFFFF00,   // Yellow (Three)
            4: 0x00FF00,   // Green (Four)
            5: 0x0000FF,   // Blue (Five)
            6: 0x800080,   // Purple (Six)
            7: 0xFFC0CB,   // Pink (Seven)
            8: 0xA52A2A,   // Brown (Eight)
            9: 0x808080    // Grey (Nine)
        };
        
        // For numbers greater than 9, cycle through the colors or use white
        return colors[number % 9] || 0xFFFFFF;
    }
    
    createMesh() {
        const numberblock = new window.Numberblock(this.value, this.color, this.name);
        return numberblock.mesh;
    }

    updateValue(newValue) {
        if (this.value === newValue) return;
        
        super.updateValue(newValue);
        
        // For numberblocks, we need to recreate the visual
        if (this.mesh) {
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
        if (this.mesh) {
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
    
    // Initialize local player functionality
    initLocalPlayer() {
        // Override for local player initialization if needed
    }
}

// Register the NumberBlock class with the EntityFactory
if (typeof window !== 'undefined' && window.entityFactory) {
    window.entityFactory.registerType('numberblock', NumberBlock);
    window.NumberBlock = NumberBlock;
}

if (typeof module !== 'undefined') {
    module.exports = { NumberBlock };
} 