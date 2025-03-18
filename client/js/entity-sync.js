import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { setupPlayerListeners, removePlayerVisual, setupRoomEventListeners } from './player-sync.js';

// Numberblocks game - Entity synchronization module
// Handles entity synchronization (operators, static numberblocks)

// Helper functions for visual management
function createOperatorVisual(operator, operatorId) {
    try {
        const visual = new OperatorsVisual(operator);
        if (!visuals.operators) visuals.operators = {};
        visuals.operators[operatorId] = visual;
        
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
        }
        
        // Setup change listener
        operator.onChange(() => {
            if (visuals.operators[operatorId]) {
                visuals.operators[operatorId].update(operator);
            }
        });
    } catch (error) {
        console.error(`Error creating operator visual (${operatorId}):`, error);
    }
}

function removeOperatorVisual(operatorId) {
    try {
        if (visuals.operators && visuals.operators[operatorId]) {
            if (window.scene) {
                window.scene.remove(visuals.operators[operatorId].group || 
                                  visuals.operators[operatorId].mesh);
            }
            delete visuals.operators[operatorId];
        }
    } catch (error) {
        console.error(`Error removing operator visual (${operatorId}):`, error);
    }
}

function createStaticNumberblockVisual(block, blockId) {
    try {
        const visual = new StaticNumberblocksVisual(block);
        if (!visuals.staticNumberblocks) visuals.staticNumberblocks = {};
        visuals.staticNumberblocks[blockId] = visual;
        
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
        }
        
        // Setup change listener
        block.onChange(() => {
            if (visuals.staticNumberblocks[blockId]) {
                visuals.staticNumberblocks[blockId].update(block);
            }
        });
    } catch (error) {
        console.error(`Error creating static numberblock visual (${blockId}):`, error);
    }
}

function removeStaticNumberblockVisual(blockId) {
    try {
        if (visuals.staticNumberblocks && visuals.staticNumberblocks[blockId]) {
            if (window.scene) {
                window.scene.remove(visuals.staticNumberblocks[blockId].group || 
                                  visuals.staticNumberblocks[blockId].mesh);
            }
            delete visuals.staticNumberblocks[blockId];
        }
    } catch (error) {
        console.error(`Error removing static numberblock visual (${blockId}):`, error);
    }
}

// Setup room listeners
function setupRoomListeners() {
    if (!window.room) {
        console.error("No room available!");
        return;
    }

    window.room.onStateChange.once((state) => {
        console.log("✅ State synchronized, setting up listeners.");

        // Verify players is a MapSchema or has correct Colyseus methods
        if (state.players && state.players.onAdd && typeof state.players.onAdd === 'function') {
            state.players.onAdd((player, sessionId) => {
                console.log(`Player ${sessionId} joined.`);
                setupPlayerListeners(player, sessionId);
            });

            state.players.onRemove((player, sessionId) => {
                console.log(`Player ${sessionId} left.`);
                removePlayerVisual(sessionId);
            });

            state.players.forEach((player, sessionId) => {
                console.log(`Existing player: ${sessionId}`);
                setupPlayerListeners(player, sessionId);
            });
        } else {
            console.error("❌ state.players is not a valid MapSchema", state.players);
        }

        // Verify operators is a MapSchema
        if (state.operators && state.operators.onAdd && typeof state.operators.onAdd === 'function') {
            state.operators.onAdd((operator, operatorId) => {
                createOperatorVisual(operator, operatorId);
            });

            state.operators.onRemove((operator, operatorId) => {
                removeOperatorVisual(operatorId);
            });

            state.operators.forEach((operator, operatorId) => {
                createOperatorVisual(operator, operatorId);
            });
        } else {
            console.error("❌ state.operators is not a valid MapSchema", state.operators);
        }

        // Verify staticNumberblocks is a MapSchema
        if (state.staticNumberblocks && state.staticNumberblocks.onAdd && typeof state.staticNumberblocks.onAdd === 'function') {
            state.staticNumberblocks.onAdd((block, blockId) => {
                createStaticNumberblockVisual(block, blockId);
            });

            state.staticNumberblocks.onRemove((block, blockId) => {
                removeStaticNumberblockVisual(blockId);
            });

            state.staticNumberblocks.forEach((block, blockId) => {
                createStaticNumberblockVisual(block, blockId);
            });
        } else {
            console.error("❌ state.staticNumberblocks is not a valid MapSchema", state.staticNumberblocks);
        }

        console.log("✅ Room listeners fully set up.");
    });
}

// Define Operators Visual class
window.OperatorsVisual = class OperatorsVisual {
    constructor(operatorData) {
        // Store operator data
        this.id = operatorData.id;
        this.type = operatorData.type === "plus" ? "plus" : "minus";
        
        // Use the OperatorManager to create the operator instead of creating meshes directly
        if (window.operatorManager) {
            this.operator = window.operatorManager.createOperatorFromServer(
                this.id,
                this.type,
                operatorData.x || 0,
                operatorData.y || 0.6,
                operatorData.z || 0
            );
            
            // Use the operator's group as our visual representation
            this.group = this.operator.group || this.operator.mesh;
        } else {
            console.error("OperatorManager not available - can't create operator visual");
            // Create a fallback visual so we don't crash
            this.createFallbackMesh(this.type === "plus" ? 0x00ff00 : 0xff0000);
        }
    }
    
    // Create a simple fallback mesh if operatorManager is not available
    createFallbackMesh(color) {
        this.group = new THREE.Group();
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);
    }
    
    update(operatorData) {
        if (!operatorData) return;
        
        // Use the OperatorManager to update the operator's position
        if (window.operatorManager && this.id) {
            window.operatorManager.updateOperatorFromServer(
                this.id,
                operatorData.x,
                operatorData.y,
                operatorData.z
            );
        } else if (this.group) {
            // Fallback update directly if OperatorManager not available
            this.group.position.set(
                operatorData.x,
                operatorData.y,
                operatorData.z
            );
        }
        
        // Update type if changed
        if (operatorData.type !== undefined && this.type !== operatorData.type) {
            this.type = operatorData.type;
            console.log(`Operator ${this.id} type changed to ${this.type}`);
            // Currently we don't handle type changes - would need to remove and recreate
        }
    }
    
    // Method called when this operator is removed
    remove() {
        if (window.operatorManager && this.id) {
            window.operatorManager.removeOperatorByServerId(this.id);
        } else if (this.group && this.group.parent) {
            this.group.parent.remove(this.group);
        }
    }
};

// Define StaticNumberblocks Visual class
window.StaticNumberblocksVisual = class StaticNumberblocksVisual {
    constructor(blockData) {
        this.group = new THREE.Group();
        this.id = blockData.id;
        this.value = blockData.value || 1;
        
        // Create numberblock mesh
        this.createNumberblockMesh();
        
        // Set initial position
        this.update(blockData);
    }
    
    createNumberblockMesh() {
        try {
            // Get color based on value
            const color = window.getColorForValue(this.value);
            
            // Create basic geometry
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color });
            
            // Create blocks
            const totalHeight = this.value;
            for (let i = 0; i < this.value; i++) {
                const cube = new THREE.Mesh(geometry, material);
                cube.position.y = i;
                this.group.add(cube);
            }
            
            // Add number label (simplified)
            const labelGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
            const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.y = totalHeight + 0.3;
            label.position.z = 0.6;
            this.group.add(label);
        } catch (error) {
            console.error("Error creating numberblock mesh:", error);
        }
    }
    
    update(blockData) {
        if (!blockData) return;
        
        // Update position
        if (blockData.x !== undefined && 
            blockData.y !== undefined && 
            blockData.z !== undefined) {
            this.group.position.set(
                blockData.x,
                blockData.y,
                blockData.z
            );
        }
        
        // Update value if changed
        if (blockData.value !== undefined && this.value !== blockData.value) {
            this.value = blockData.value;
            
            // Clear group
            while (this.group.children.length > 0) {
                this.group.remove(this.group.children[0]);
            }
            
            // Recreate mesh with new value
            this.createNumberblockMesh();
        }
    }
};

// Make functions available globally
window.setupRoomEventListeners = setupRoomEventListeners;
window.createOperatorVisual = createOperatorVisual;
window.removeOperatorVisual = removeOperatorVisual;
window.createStaticNumberblockVisual = createStaticNumberblockVisual;
window.removeStaticNumberblockVisual = removeStaticNumberblockVisual;
