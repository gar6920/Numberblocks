// Default Implementation - Player class
// Simple player with a box representation

class DefaultPlayer extends Player {
    constructor(params) {
        super(params);
        
        // Default properties
        this.color = params.color || 0x3366CC;
    }
    
    // Create a simple box mesh
    createMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    // Override update function for any player-specific logic
    update(deltaTime) {
        // Any default player-specific update logic goes here
        
        // Always call the parent update function
        super.update(deltaTime);
    }
}

// Register this class with the entity factory if available
if (window.entityFactory) {
    window.entityFactory.registerType('defaultPlayer', DefaultPlayer);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DefaultPlayer = DefaultPlayer;
}

if (typeof module !== 'undefined') {
    module.exports = { DefaultPlayer };
} 