// 3D AI Game Platform - Base Entity class for all game entities

class Entity {
    constructor({id, name, value, color, x, y, z, rotationY, type}) {
        this.id = id;
        this.name = name || id;
        this.value = value || 1;
        this.color = color; 
        this.type = type; // Type of visual representation
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
    // This is a base method that should be overridden by implementation-specific subclasses
    createMesh() {
        console.warn("createMesh() method not implemented in Entity base class");
        return null;
    }

    // Update the entity's position and rotation
    updatePosition(pos) {
        if (!pos) {
            console.warn("updatePosition called with undefined position!");
            return;
        }
    
        const { x, y, z, rotationY } = pos;
    
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
    
    // Update the entity's value
    // This is a base method that implementations can override
    updateValue(newValue) {
        if (this.value === newValue) return;
        this.value = newValue;
    }

    // Update the entity's color
    // This is a base method that implementations can override
    updateColor(newColor) {
        this.color = newColor;
    }

    // Generic update method called once per frame
    // This should be overridden by subclasses that need frame-by-frame updates
    update(deltaTime) {
        // Base implementation does nothing
    }

    // Remove entity from scene when destroyed
    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

// Export the Entity class
if (typeof window !== 'undefined') {
    window.Entity = Entity;
}

if (typeof module !== 'undefined') {
    module.exports = { Entity };
} 