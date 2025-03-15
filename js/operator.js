// Numberblocks game - Operator implementation

// Class to represent mathematical operators (+ and -)
class Operator {
    constructor(type, scene) {
        this.type = type; // 'plus' or 'minus'
        this.scene = scene;
        this.mesh = this.createOperatorMesh();
        
        // Add the operator to the scene
        scene.add(this.mesh);
        
        // Set the radius for collision detection
        this.collisionRadius = 0.5;
    }
    
    // Create the 3D mesh for the operator
    createOperatorMesh() {
        const operatorGroup = new THREE.Group();
        
        // Create a semi-transparent white sphere as the base
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White sphere
            roughness: 0.3,
            metalness: 0.2,
            transparent: true, // Make it transparent
            opacity: 0.6 // 60% opacity
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        operatorGroup.add(sphere);
        
        // Create the symbol geometry (+ or -) and place it in the center
        const symbolColor = 0x000000; // Black symbol
        const symbolMaterial = new THREE.MeshBasicMaterial({ color: symbolColor });
        
        if (this.type === 'plus') {
            // Create a plus sign (+) using two cylinders
            // Horizontal bar
            const horizontalGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
            horizontalGeometry.rotateZ(Math.PI / 2); // Rotate to make it horizontal
            const horizontalBar = new THREE.Mesh(horizontalGeometry, symbolMaterial);
            
            // Vertical bar
            const verticalGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
            const verticalBar = new THREE.Mesh(verticalGeometry, symbolMaterial);
            
            operatorGroup.add(horizontalBar);
            operatorGroup.add(verticalBar);
        } else {
            // Create a minus sign (-) using a single cylinder
            const minusGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
            minusGeometry.rotateZ(Math.PI / 2); // Rotate to make it horizontal
            const minusBar = new THREE.Mesh(minusGeometry, symbolMaterial);
            
            operatorGroup.add(minusBar);
        }
        
        // Add a soft glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // White glow
            transparent: true,
            opacity: 0.2
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        operatorGroup.add(glow);
        
        // Add rotation animation that ensures the symbol stays visible
        this.animate = (deltaTime) => {
            // Instead of rotating around Y-axis, make the operator face the camera
            if (window.camera) {
                // Get direction to camera
                const direction = new THREE.Vector3();
                direction.subVectors(window.camera.position, operatorGroup.position).normalize();
                
                // Create a temporary up vector (world up)
                const up = new THREE.Vector3(0, 1, 0);
                
                // Create a look-at matrix
                const lookMatrix = new THREE.Matrix4();
                lookMatrix.lookAt(operatorGroup.position, 
                                  operatorGroup.position.clone().add(direction), 
                                  up);
                
                // Convert to quaternion and apply
                operatorGroup.quaternion.setFromRotationMatrix(lookMatrix);
            } else {
                // Default rotation if no camera
                operatorGroup.rotation.y += deltaTime * 1.5;
            }
            
            // Add a subtle floating animation
            operatorGroup.position.y = Math.sin(Date.now() * 0.002) * 0.1 + 0.6; // Float between 0.5 and 0.7
        };
        
        return operatorGroup;
    }
    
    // Position the operator in the scene
    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }
    
    // Remove the operator from the scene
    remove() {
        this.scene.remove(this.mesh);
        
        // Clean up geometries and materials to prevent memory leaks
        this.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    // Create a smaller version of the operator for holding
    createHeldOperatorMesh() {
        // Create a smaller version of the operator for holding
        const scale = 0.4; // Smaller scale for held operator
        const heldMesh = this.createOperatorMesh();
        heldMesh.scale.set(scale, scale, scale);
        
        return heldMesh;
    }
}

// Class to manage all operators in the game
class OperatorManager {
    constructor(scene) {
        this.scene = scene;
        this.operators = [];
        this.spawnTimer = 0;
        this.spawnInterval = this.getRandomSpawnInterval();
        this.maxOperators = 10; // Maximum number of operators allowed at once
        this.groundY = 0; // Y position of the ground
        this.mapSize = 40; // Size of the playable area (40x40)
        
        // Player's held operator
        this.heldOperator = null;
        this.heldOperatorMesh = null;
        
        // Debug message to check initialization
        console.log("OperatorManager initialized");
    }
    
    // Get a random spawn interval between 5-10 seconds
    getRandomSpawnInterval() {
        return 5 + Math.random() * 5; // 5-10 seconds
    }
    
    // Update function to be called in animation loop
    update(deltaTime) {
        // Update existing operators
        this.operators.forEach(operator => {
            operator.animate(deltaTime);
        });
        
        // Check if it's time to spawn a new operator
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.operators.length < this.maxOperators) {
            this.spawnOperator();
            this.spawnTimer = 0;
            this.spawnInterval = this.getRandomSpawnInterval();
        }
    }
    
    // Spawn a new operator at a random position
    spawnOperator() {
        // Randomly choose between plus and minus
        const type = Math.random() > 0.5 ? 'plus' : 'minus';
        
        // Create the operator
        const operator = new Operator(type, this.scene);
        
        // Set a random position on the ground
        const posX = (Math.random() * this.mapSize) - (this.mapSize / 2);
        const posZ = (Math.random() * this.mapSize) - (this.mapSize / 2);
        
        // Set the Y position slightly above the ground to prevent z-fighting
        operator.setPosition(posX, this.groundY + 0.6, posZ);
        
        // Add to the array of active operators
        this.operators.push(operator);
        
        console.log(`Spawned ${type} operator at (${posX.toFixed(2)}, ${this.groundY + 0.6}, ${posZ.toFixed(2)})`);
        
        return operator;
    }
    
    // Remove an operator from the scene and the operators array
    removeOperator(operator) {
        const index = this.operators.indexOf(operator);
        if (index !== -1) {
            operator.remove();
            this.operators.splice(index, 1);
        }
    }
    
    // Set the currently held operator
    setHeldOperator(operator) {
        // Clear any previously held operator
        this.clearHeldOperator();
        
        // Store the operator type
        this.heldOperator = operator.type;
        
        // Create a smaller version of the operator for holding
        this.heldOperatorMesh = operator.createHeldOperatorMesh();
        
        // Add to the scene
        this.scene.add(this.heldOperatorMesh);
        
        // Remove the original operator from the scene
        this.removeOperator(operator);
        
        console.log(`Holding ${this.heldOperator} operator`);
        return this.heldOperator;
    }
    
    // Clear the currently held operator
    clearHeldOperator() {
        if (this.heldOperatorMesh) {
            this.scene.remove(this.heldOperatorMesh);
            this.heldOperatorMesh = null;
        }
        this.heldOperator = null;
    }
    
    // Get the currently held operator type
    getHeldOperator() {
        return this.heldOperator;
    }
    
    // Clear all operators
    clearAll() {
        while (this.operators.length > 0) {
            this.removeOperator(this.operators[0]);
        }
        this.clearHeldOperator();
    }
    
    // Get all operators for collision checking
    getOperators() {
        return this.operators;
    }
    
    // Attach the held operator to a Numberblock
    attachOperatorToNumberblock(numberblock) {
        if (this.heldOperatorMesh && numberblock) {
            // The numberblock will handle the positioning
            return {
                type: this.heldOperator,
                mesh: this.heldOperatorMesh
            };
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        Operator,
        OperatorManager
    };
}
