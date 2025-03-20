// 3D AI Game Platform - Core NPC entity class

class NPC extends Entity {
    constructor(params) {
        super(params);
        
        // NPC-specific properties
        this.isStatic = params.isStatic || false;
        this.behaviorType = params.behaviorType || 'static';
        this.target = params.target || null;
        
        // Animation properties - base implementation
        this.animationState = {
            floating: {
                enabled: !this.isStatic,
                height: 0.5,
                speed: 1.0,
                time: Math.random() * Math.PI * 2 // Random start phase
            },
            rotating: {
                enabled: false,
                speed: 0.5
            }
        };
        
        // Set initial animation state
        this.setupAnimation();
    }
    
    setupAnimation() {
        // Only set up animation for non-static NPCs
        if (this.isStatic) {
            this.animationState.floating.enabled = false;
            this.animationState.rotating.enabled = false;
        }
    }
    
    // Base animation method - can be extended by implementations
    animate(deltaTime) {
        if (!this.mesh) return;
        
        // Handle floating animation
        if (this.animationState.floating.enabled) {
            this.animationState.floating.time += deltaTime * this.animationState.floating.speed;
            const floatHeight = Math.sin(this.animationState.floating.time) * this.animationState.floating.height;
            
            // Apply floating motion
            this.mesh.position.y = this.y + floatHeight;
        }
        
        // Handle rotation animation (if enabled)
        if (this.animationState.rotating.enabled) {
            this.mesh.rotation.y += this.animationState.rotating.speed * deltaTime;
        }
    }
    
    // Update position and also handle any animations
    updatePosition(position) {
        super.updatePosition(position);
        
        // Re-enable animations if needed
        this.setupAnimation();
    }
    
    // Base createMesh method - should be overridden by implementation-specific NPC classes
    createMesh() {
        console.warn("createMesh() method not implemented in NPC base class");
        
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
    
    // NPCs can have behavior in their update method
    update(deltaTime) {
        // Implement different behaviors
        switch (this.behaviorType) {
            case 'idle':
                // Do nothing
                break;
                
            case 'wander':
                // Random movement could be implemented by subclasses
                break;
                
            case 'follow':
                // Follow logic could be implemented by subclasses
                break;
        }
        
        // Animate the NPC
        this.animate(deltaTime);
    }
}

// Export the NPC class
if (typeof window !== 'undefined') {
    window.NPC = NPC;
}

if (typeof module !== 'undefined') {
    module.exports = { NPC };
} 