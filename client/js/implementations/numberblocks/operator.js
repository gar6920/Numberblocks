// 3D AI Game Platform - Numberblocks Implementation
// Operator class for mathematical operators (+ and -)

// Class to represent mathematical operators (+ and -)
class Operator extends NPC {
    constructor(params) {
        super(params);
        this.type = 'operator';
        this.operatorType = params.value; // 'plus' or 'minus'
        this.scene = params.scene;
        
        // Set the radius for collision detection
        this.collisionRadius = 0.5;
        
        // Animation properties specific to operators
        this.animationState.rotating.enabled = true;
        this.setupAnimation();
    }
    
    // Create the 3D mesh for the operator
    createMesh() {
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
        
        // Create the operator symbol (plus or minus)
        if (this.operatorType === 'plus') {
            // Create a plus sign (+) using two intersecting cubes
            this.createPlusSign(operatorGroup);
        } else if (this.operatorType === 'minus') {
            // Create a minus sign (-) using a single cube
            this.createMinusSign(operatorGroup);
        }
        
        return operatorGroup;
    }
    
    // Create a plus sign inside the sphere
    createPlusSign(parentGroup) {
        // Horizontal part of the plus sign
        const horizontalGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.15);
        const horizontalMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF00, // Green for plus sign
            roughness: 0.5,
            metalness: 0.3
        });
        
        const horizontalPart = new THREE.Mesh(horizontalGeometry, horizontalMaterial);
        parentGroup.add(horizontalPart);
        
        // Vertical part of the plus sign
        const verticalGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const verticalMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF00, // Green for plus sign
            roughness: 0.5,
            metalness: 0.3
        });
        
        const verticalPart = new THREE.Mesh(verticalGeometry, verticalMaterial);
        parentGroup.add(verticalPart);
    }
    
    // Create a minus sign inside the sphere
    createMinusSign(parentGroup) {
        // Horizontal part (minus sign is just horizontal)
        const horizontalGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.15);
        const horizontalMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000, // Red for minus sign
            roughness: 0.5,
            metalness: 0.3
        });
        
        const horizontalPart = new THREE.Mesh(horizontalGeometry, horizontalMaterial);
        parentGroup.add(horizontalPart);
    }
    
    // Set the position of the operator
    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }
    
    // Remove the operator from the scene
    remove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
    
    // Special animation for operators
    animate(deltaTime) {
        super.animate(deltaTime);
        
        // Make operators face the player
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
}

// Operator Manager class for handling multiple operators
class OperatorManager {
    constructor(scene) {
        this.scene = scene;
        this.operators = {}; // Map of operator IDs to operator objects
        this.heldOperator = null; // Currently held operator
        this.heldOperatorMesh = null; // Visual representation of held operator
        
        // Create a floating position for held operators
        this.heldOperatorPosition = {
            offsetX: 0.5, // Position to the right of the player
            offsetY: 0.5, // Position above the player
            offsetZ: -0.5, // Position in front of the player
        };
    }
    
    // Update all operators
    update(deltaTime) {
        // Update held operator position if there is one
        if (this.heldOperator && this.heldOperatorMesh && window.playerNumberblock) {
            // Position the held operator relative to the player
            const playerPos = window.playerNumberblock.mesh.position;
            this.heldOperatorMesh.position.set(
                playerPos.x + this.heldOperatorPosition.offsetX,
                playerPos.y + this.heldOperatorPosition.offsetY,
                playerPos.z + this.heldOperatorPosition.offsetZ
            );
        }
    }
    
    // Create a new operator based on server data
    createOperatorFromServer(id, type, x, y, z) {
        if (this.operators[id]) {
            console.warn(`Operator with ID ${id} already exists`);
            return this.operators[id];
        }
        
        const params = {
            id: id,
            value: type, // Using value to store the operator type
            type: 'operator',
            x: x,
            y: y,
            z: z,
            scene: this.scene
        };
        
        const operator = new Operator(params);
        this.operators[id] = operator;
        
        return operator;
    }
    
    // Get an operator by its server ID
    getOperatorByServerId(id) {
        return this.operators[id] || null;
    }
    
    // Update an operator's position based on server data
    updateOperatorFromServer(id, x, y, z) {
        const operator = this.getOperatorByServerId(id);
        if (operator) {
            operator.setPosition(x, y, z);
        }
    }
    
    // Remove an operator
    removeOperator(operator) {
        if (!operator) return;
        
        // Remove from scene
        operator.remove();
        
        // Remove from operators map
        const id = operator.id;
        if (this.operators[id]) {
            delete this.operators[id];
        }
    }
    
    // Remove an operator by its server ID
    removeOperatorByServerId(id) {
        const operator = this.getOperatorByServerId(id);
        if (operator) {
            this.removeOperator(operator);
        }
    }
    
    // Set the currently held operator
    setHeldOperator(operator, numberblock) {
        // Clear any currently held operator first
        this.clearHeldOperator();
        
        if (!operator) return;
        
        // Store the operator
        this.heldOperator = operator;
        
        // Make the original operator invisible
        if (operator.mesh) {
            operator.mesh.visible = false;
        }
        
        // Create a visual representation for the held operator
        this.heldOperatorMesh = this.createHeldOperatorMesh(operator.operatorType);
        
        // Position it relative to the player
        if (this.heldOperatorMesh && numberblock && numberblock.mesh) {
            const playerPos = numberblock.mesh.position;
            this.heldOperatorMesh.position.set(
                playerPos.x + this.heldOperatorPosition.offsetX,
                playerPos.y + this.heldOperatorPosition.offsetY,
                playerPos.z + this.heldOperatorPosition.offsetZ
            );
            
            // Add it to the scene
            this.scene.add(this.heldOperatorMesh);
        }
        
        // Create a smaller version of the operator and attach it to the numberblock
        if (numberblock) {
            this.attachOperatorToNumberblock(numberblock);
        }
        
        return this.heldOperator;
    }
    
    // Clear currently held operator
    clearHeldOperator() {
        if (this.heldOperator) {
            // Make the original operator visible again if it still exists
            const id = this.heldOperator.id;
            const originalOperator = this.getOperatorByServerId(id);
            if (originalOperator && originalOperator.mesh) {
                originalOperator.mesh.visible = true;
            }
        }
        
        // Remove the held operator mesh
        if (this.heldOperatorMesh && this.heldOperatorMesh.parent) {
            this.heldOperatorMesh.parent.remove(this.heldOperatorMesh);
        }
        
        this.heldOperator = null;
        this.heldOperatorMesh = null;
    }
    
    // Get the currently held operator
    getHeldOperator() {
        return this.heldOperator;
    }
    
    // Create a smaller version of the operator and attach it to the numberblock
    createHeldOperatorMesh(type) {
        // Create a smaller version of the operator for display
        const params = {
            value: type,
            type: 'operator',
            scene: this.scene
        };
        
        const operatorVisual = new Operator(params);
        const mesh = operatorVisual.mesh;
        
        // Scale it down
        mesh.scale.set(0.5, 0.5, 0.5);
        
        return mesh;
    }
    
    // Create a smaller version of the operator and attach it to the numberblock
    attachOperatorToNumberblock(numberblock) {
        if (!this.heldOperator || !numberblock || !numberblock.mesh) return;
        
        // We could add a small visual indicator on the numberblock to show the held operator
        // For now, we'll just log it
        console.log(`Numberblock ${numberblock.value} is holding a ${this.heldOperator.operatorType} operator`);
    }
    
    // Clear all operators
    clearAll() {
        // Clear held operator
        this.clearHeldOperator();
        
        // Remove all operators
        for (const id in this.operators) {
            this.removeOperator(this.operators[id]);
        }
        
        this.operators = {};
    }
    
    // Get all operators
    getOperators() {
        return Object.values(this.operators);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Operator = Operator;
    window.OperatorManager = OperatorManager;
}

if (typeof module !== 'undefined') {
    module.exports = { Operator, OperatorManager };
} 