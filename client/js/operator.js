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
        operatorGroup.userData.operator = this; // Store reference for easy access
        
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
        this.groundY = 0; // Y position of the ground
        
        // Player's held operator
        this.heldOperator = null;
        this.heldOperatorMesh = null;
        
        // Debug message to check initialization
        console.log("OperatorManager initialized");
    }
    
    // Update function to be called in animation loop
    update(deltaTime) {
        // Update existing operators
        this.operators.forEach(operator => {
            operator.animate(deltaTime);
        });
        
        // NOTE: We no longer spawn operators locally
        // Operators are created by the server and synchronized via Colyseus
    }
    
    // Create an operator from server data
    // This is called by the entity-sync system when a new operator is received from the server
    createOperatorFromServer(id, type, x, y, z) {
        // Create the operator
        const operator = new Operator(type, this.scene);
        
        // Set the position from server data
        operator.setPosition(x, y, z);
        
        // Store server ID for reference
        operator.serverId = id;
        
        // Add to the array of active operators
        this.operators.push(operator);
        
        console.log(`Created ${type} operator from server at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        
        return operator;
    }
    
    // Find an operator by server ID
    getOperatorByServerId(id) {
        return this.operators.find(op => op.serverId === id);
    }
    
    // Update an operator's position based on server data
    updateOperatorFromServer(id, x, y, z) {
        const operator = this.getOperatorByServerId(id);
        if (operator) {
            operator.setPosition(x, y, z);
        }
    }
    
    // Remove an operator from the scene and the operators array
    removeOperator(operator) {
        const index = this.operators.indexOf(operator);
        if (index !== -1) {
            operator.remove();
            this.operators.splice(index, 1);
        }
    }
    
    // Remove an operator by server ID
    removeOperatorByServerId(id) {
        const operator = this.getOperatorByServerId(id);
        if (operator) {
            this.removeOperator(operator);
        }
    }
    
    // Set the currently held operator
    setHeldOperator(operator, numberblock) {
        // Clear any previously held operator
        this.clearHeldOperator();
        
        // Store the operator type
        this.heldOperator = operator.type;
        console.log("Setting held operator type:", this.heldOperator); // Debug log
        
        // Create a smaller version of the operator for holding
        this.heldOperatorMesh = operator.createHeldOperatorMesh();
        
        // Attach the operator to the Numberblock's right hand
        if (numberblock && numberblock.mesh) {
            // Find the right hand in the Numberblock's mesh hierarchy
            let rightHand = null;
            
            // Look for the arm block (should be the second block for Numberblocks with more than 3 blocks)
            const armBlockIndex = numberblock.value <= 3 ? Math.floor(numberblock.value / 2) : 1;
            
            // Find the right hand if there are enough blocks
            if (numberblock.value > 0 && armBlockIndex < numberblock.value) {
                // Get the arm block
                const armBlock = numberblock.mesh.children[armBlockIndex];
                
                // Search for the rightHand in the arm block's children
                armBlock.traverse((child) => {
                    if (child.name === 'rightHand') {
                        rightHand = child;
                    }
                });
                
                // If we found the right hand, attach the operator to it
                if (rightHand) {
                    // Position the held operator slightly offset from the hand
                    this.heldOperatorMesh.position.set(0, 0.2, 0);
                    
                    // Add the held operator mesh to the right hand
                    rightHand.add(this.heldOperatorMesh);
                    
                    console.log(`Attached ${this.heldOperator} operator to Numberblock's right hand`);
                } else {
                    // Fallback: Add to the scene if we can't find the hand
                    console.warn("Could not find rightHand - adding operator to scene");
                    this.scene.add(this.heldOperatorMesh);
                }
            } else {
                // Fallback: Add to the scene if Numberblock doesn't have arms
                console.warn("Numberblock doesn't have enough blocks for arms - adding operator to scene");
                this.scene.add(this.heldOperatorMesh);
            }
        } else {
            // Add to the scene if no Numberblock is provided
            this.scene.add(this.heldOperatorMesh);
        }
        
        // Remove the original operator from the scene
        this.removeOperator(operator);
        
        console.log(`Now holding ${this.heldOperator} operator`); // Debug log
        return this.heldOperator;
    }
    
    // Clear the currently held operator
    clearHeldOperator() {
        if (this.heldOperatorMesh) {
            // Remove from parent (either scene or hand)
            if (this.heldOperatorMesh.parent) {
                this.heldOperatorMesh.parent.remove(this.heldOperatorMesh);
            } else {
                this.scene.remove(this.heldOperatorMesh);
            }
            
            this.heldOperatorMesh = null;
        }
        this.heldOperator = null;
        console.log("Cleared held operator"); // Debug log
    }
    
    // Get the currently held operator type
    getHeldOperator() {
        console.log("Getting held operator type:", this.heldOperator); // Debug log
        return this.heldOperator;
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
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        Operator,
        OperatorManager
    };
}
