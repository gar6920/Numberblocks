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

function setupRoomListeners() {
    if (!window.room) {
        console.error("No room available!");
        return;
    }

    window.room.onStateChange.once((state) => {
        console.log("✅ State synchronized, setting up listeners.");
    
        // Players (CORRECTED LOOP)
        if (state.players) {
            state.players.forEach((player, sessionId) => {  // <-- CORRECT METHOD
                setupPlayerListeners(player, sessionId);
            });
        } else {
            console.error("❌ state.players not found");
        }
    
        // Operators (CORRECTED LOOP)
        if (state.operators) {
            state.operators.forEach((operator, operatorId) => {  // <-- CORRECT METHOD
                createOperatorVisual(operator, operatorId);
            });
        } else {
            console.error("❌ state.operators not found");
        }
    
        // Static Numberblocks (CORRECTED LOOP)
        if (state.staticNumberblocks) {
            state.staticNumberblocks.forEach((block, blockId) => {  // <-- CORRECT METHOD
                createStaticNumberblockVisual(block, blockId);
            });
        } else {
            console.error("❌ state.staticNumberblocks not found");
        }
    
        console.log("✅ Room listeners fully set up.");
    });
    
    

    // Continuous state updates without schema methods
    window.room.onStateChange((state) => {
        // Players handled explicitly here because there's no onChange defined for them yet
        state.players.forEach((playerState, sessionId) => {
            if (playerState.x !== undefined && playerState.y !== undefined && playerState.z !== undefined) {
                updatePlayerVisual(playerState, sessionId);
            } else {
                console.warn("[DEBUG] playerState has undefined position values:", sessionId, playerState);
            }
        });
    
        // Operators and staticNumberblocks are handled ALREADY via their onChange listeners
        // REMOVE THE FOLLOWING LINES ENTIRELY:
        /*
        for (const operatorId in state.operators) {
            updateOperatorVisual(state.operators[operatorId], operatorId);
        }
    
        for (const blockId in state.staticNumberblocks) {
            updateStaticNumberblockVisual(state.staticNumberblocks[blockId], blockId);
        }
        */
    });
    
}

// Update functions you need to implement if you haven't yet
function updatePlayerVisual(playerState, sessionId) {
    if (!playerState) {
        console.warn(`[DEBUG] updatePlayerVisual called with undefined playerState for sessionId: ${sessionId}`);
        return;
    }

    let playerVisual = window.visuals.players[sessionId];

    if (!playerVisual) {
        console.warn(`[DEBUG] Player visual doesn't exist yet for sessionId: ${sessionId}, creating now.`);
        playerVisual = new Player({
            id: sessionId,
            name: playerState.name,
            color: playerState.color,
            value: playerState.value
        });
        scene.add(playerVisual.mesh);
        window.visuals.players[sessionId] = playerVisual;
    }

    if (playerState.x === undefined || playerState.y === undefined || playerState.z === undefined) {
        console.warn(`[DEBUG] playerState has undefined position values:`, playerState);
        return;
    }

    playerVisual.updatePosition({
        x: playerState.x,
        y: playerState.y,
        z: playerState.z,
        rotationY: playerState.rotationY
    });
}


function updateStaticNumberblockVisual(block, blockId) {
    const blockVisual = window.visuals.staticNumberblocks[blockId];
    if (blockVisual) {
        blockVisual.update({
            x: block.x,
            y: block.y,
            z: block.z,
            value: block.value
        });
    }
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
window.setupRoomListeners = setupRoomListeners;
window.createOperatorVisual = createOperatorVisual;
window.removeOperatorVisual = removeOperatorVisual;
window.createStaticNumberblockVisual = createStaticNumberblockVisual;
window.removeStaticNumberblockVisual = removeStaticNumberblockVisual;
