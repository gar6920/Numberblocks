// Numberblocks game - NPC entity class

class NPC extends Entity {
    constructor(params) {
        super(params);
        
        // NPC-specific properties
        this.isStatic = params.isStatic || false;
        this.operatorType = params.operatorType || null;
        this.behaviorType = params.behaviorType || 'static';
        this.target = params.target || null;
        
        // Animation properties
        this.animationState = {
            floating: {
                enabled: !this.isStatic,
                height: 0.5,
                speed: 1.0,
                time: Math.random() * Math.PI * 2 // Random start phase
            },
            rotating: {
                enabled: params.type === 'operator',
                speed: 0.5
            }
        };
        
        // Set initial animation state
        this.setupAnimation();
    }
    
    setupAnimation() {
        // Only set up animation for non-static NPCs or operators
        if (this.isStatic) {
            this.animationState.floating.enabled = false;
            this.animationState.rotating.enabled = false;
        }
        
        // Operators should rotate to face player
        if (this.type === 'operator') {
            this.animationState.rotating.enabled = true;
        }
    }
    
    // Animate the NPC
    animate(deltaTime) {
        if (!this.mesh) return;
        
        // Handle floating animation
        if (this.animationState.floating.enabled) {
            this.animationState.floating.time += deltaTime * this.animationState.floating.speed;
            const floatHeight = Math.sin(this.animationState.floating.time) * this.animationState.floating.height;
            
            // Apply floating motion
            this.mesh.position.y = this.y + floatHeight;
        }
        
        // Handle rotation animation (e.g., operators facing player)
        if (this.animationState.rotating.enabled && window.playerNumberblock) {
            // Rotate to face the player
            const playerPos = window.playerNumberblock.mesh.position;
            const direction = new THREE.Vector3();
            direction.subVectors(playerPos, this.mesh.position);
            
            // Calculate the angle but only on the Y axis (horizontal rotation)
            const targetRotation = Math.atan2(direction.x, direction.z);
            
            // Smooth rotation
            const rotationSpeed = this.animationState.rotating.speed;
            const angleDiff = (targetRotation - this.mesh.rotation.y + Math.PI) % (Math.PI * 2) - Math.PI;
            this.mesh.rotation.y += angleDiff * rotationSpeed * deltaTime;
        }
    }
    
    // Update position and also handle any animations
    updatePosition(position) {
        super.updatePosition(position);
        
        // Re-enable animations if needed
        this.setupAnimation();
    }
    
    createMesh() {
        // Create visual representation based on the type
        switch (this.type) {
            case 'numberblock':
                // For static numberblocks, we use the same Numberblock class
                const numberblock = new window.Numberblock(this.value, this.color, this.name);
                
                // Store the numberblock reference for later updates
                numberblock.mesh.userData.numberblockRef = numberblock;
                
                return numberblock.mesh;
                
            case 'operator':
                // For operators, use the Operator class if available
                if (window.OperatorsVisual) {
                    const operator = new window.OperatorsVisual({
                        type: this.value, // 'plus' or 'minus', stored in value
                        x: this.x,
                        y: this.y,
                        z: this.z
                    });
                    return operator.mesh;
                }
                break;
                
            default:
                // Default fallback
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshStandardMaterial({ color: this.color || 0xFFFFFF });
                return new THREE.Mesh(geometry, material);
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
            this.mesh.userData.numberblockRef = numberblock;
        }
    }

    updateColor(newColor) {
        super.updateColor(newColor);
        
        // Update the color based on entity type
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
    
    // NPCs can have behavior in their update method
    update(deltaTime) {
        super.update(deltaTime);
        
        // Implement different behaviors
        switch (this.behaviorType) {
            case 'idle':
                // Do nothing
                break;
                
            case 'wander':
                // Random movement could be implemented here
                break;
                
            case 'follow':
                // Follow logic could be implemented here
                break;
        }
        
        // Animate the NPC
        this.animate(deltaTime);
    }
}

// Export to window object for access in other scripts
if (typeof window !== 'undefined') {
    window.NPC = NPC;
}

if (typeof module !== 'undefined') {
    module.exports = { NPC };
}
