// Numberblocks game - Base Entity class for all game entities

class Entity {
    constructor({id, name, value, color, x, y, z, rotationY, type}) {
        this.id = id;
        this.name = name || id;
        this.value = value || 1;
        this.color = color; 
        this.type = type; // Type of visual representation ("numberblock", "letterblock", "operator")
        this.x = x || 0;
        this.y = y || 1;
        this.z = z || 0;
        this.rotationY = rotationY || 0;
        
        // Create the mesh - this should be implemented by subclasses
        this.mesh = this.createMesh();
        if (this.mesh) {
            this.mesh.position.set(this.x, this.y, this.z);
            this.mesh.rotation.y = this.rotationY;
            
            // Store a reference to this entity in the mesh's userData
            this.mesh.userData.entity = this;
        }
    }

    // Create the visual representation (mesh) for this entity
    createMesh() {
        let visual = null;
        
        switch (this.type) {
            case 'numberblock':
                // Create a new numberblock visual
                visual = new window.Numberblock(this.value, this.color, this.name);
                return visual.mesh;
                
            case 'operator':
                // Create a new operator visual
                if (typeof window.OperatorsVisual === 'function') {
                    visual = new window.OperatorsVisual(this.value, window.scene);
                    return visual.mesh;
                } else if (typeof window.Operator === 'function') {
                    visual = new window.Operator(this.value, window.scene);
                    return visual.mesh;
                } else {
                    console.warn('Operator class not found');
                    return null;
                }
                
            // Add other entity types here
            default:
                console.warn(`Unknown entity type: ${this.type}`);
                return null;
        }
    }

    // Update the entity's position and rotation
    updatePosition({ x, y, z, rotationY }) {
        if (this.mesh) {
            if (x !== undefined) {
                this.x = x;
                this.mesh.position.x = x;
            }
            
            if (y !== undefined) {
                this.y = y;
                this.mesh.position.y = y;
            }
            
            if (z !== undefined) {
                this.z = z;
                this.mesh.position.z = z;
            }
            
            if (rotationY !== undefined) {
                this.rotationY = rotationY;
                this.mesh.rotation.y = rotationY;
            }
        }
    }

    // Update the entity's value and rebuild the mesh if needed
    updateValue(newValue) {
        if (this.value === newValue) return;
        
        this.value = newValue;
        
        // Remove the old mesh and create a new one
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        this.mesh = this.createMesh();
        
        if (this.mesh) {
            this.mesh.position.set(this.x, this.y, this.z);
            this.mesh.rotation.y = this.rotationY;
            this.mesh.userData.entity = this;
            
            // Add to scene if possible
            if (window.scene) {
                window.scene.add(this.mesh);
            }
        }
    }

    // Update the entity's color
    updateColor(newColor) {
        this.color = newColor;
        
        // If the entity is a numberblock, update its color
        if (this.mesh && this.mesh.userData.numberblock) {
            this.mesh.userData.numberblock.updateColor(newColor);
        }
    }

    // Remove entity from scene when destroyed
    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

// Export to window object for access in other scripts
if (typeof window !== 'undefined') {
    window.Entity = Entity;
}
