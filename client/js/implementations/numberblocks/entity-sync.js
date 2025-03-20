// Numberblocks - Entity synchronization module
// Handles entity synchronization (operators, static numberblocks)

// Global tracking of all visuals 
window.visuals = window.visuals || {};
window.visuals.operators = window.visuals.operators || {};
window.visuals.staticNumberblocks = window.visuals.staticNumberblocks || {};

// Helper functions for visual management
function createOperatorVisual(operator, operatorId) {
    try {
        const visual = new OperatorsVisual(operator);
        window.visuals.operators[operatorId] = visual;
        
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
        }
        
        // Setup change listener if available
        if (operator.onChange) {
            operator.onChange(() => {
                if (window.visuals.operators[operatorId]) {
                    window.visuals.operators[operatorId].update(operator);
                }
            });
        }
    } catch (error) {
        console.error(`Error creating operator visual (${operatorId}):`, error);
    }
}

function removeOperatorVisual(operatorId) {
    try {
        if (window.visuals.operators && window.visuals.operators[operatorId]) {
            if (window.scene) {
                window.scene.remove(window.visuals.operators[operatorId].group || 
                                  window.visuals.operators[operatorId].mesh);
            }
            delete window.visuals.operators[operatorId];
        }
    } catch (error) {
        console.error(`Error removing operator visual (${operatorId}):`, error);
    }
}

function createStaticNumberblockVisual(block, blockId) {
    try {
        const visual = new StaticNumberblocksVisual(block);
        window.visuals.staticNumberblocks[blockId] = visual;
        
        if (window.scene) {
            window.scene.add(visual.group || visual.mesh);
        }
        
        // Setup change listener if available
        if (block.onChange) {
            block.onChange(() => {
                if (window.visuals.staticNumberblocks[blockId]) {
                    window.visuals.staticNumberblocks[blockId].update(block);
                }
            });
        }
    } catch (error) {
        console.error(`Error creating static numberblock visual (${blockId}):`, error);
    }
}

function removeStaticNumberblockVisual(blockId) {
    try {
        if (window.visuals.staticNumberblocks && window.visuals.staticNumberblocks[blockId]) {
            if (window.scene) {
                window.scene.remove(window.visuals.staticNumberblocks[blockId].group || 
                                  window.visuals.staticNumberblocks[blockId].mesh);
            }
            delete window.visuals.staticNumberblocks[blockId];
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
        console.log("✅ State synchronized, setting up entity listeners.");

        // Check if we have entities collection
        if (state.entities) {
            // Process all entities and create appropriate visuals
            state.entities.forEach((entity, entityId) => {
                // Check entity type to determine how to handle it
                if (entity.type === "operator") {
                    createOperatorVisual(entity, entityId);
                } else if (entity.type === "staticNumberblock") {
                    createStaticNumberblockVisual(entity, entityId);
                }
            });

            // Set up listeners for entity changes
            try {
                state.entities.onAdd = (entity, entityId) => {
                    console.log(`Entity added: ${entityId}, type: ${entity.type}`);
                    if (entity.type === "operator") {
                        createOperatorVisual(entity, entityId);
                    } else if (entity.type === "staticNumberblock") {
                        createStaticNumberblockVisual(entity, entityId);
                    }
                };

                state.entities.onRemove = (entity, entityId) => {
                    console.log(`Entity removed: ${entityId}, type: ${entity.type}`);
                    if (entity.type === "operator") {
                        removeOperatorVisual(entityId);
                    } else if (entity.type === "staticNumberblock") {
                        removeStaticNumberblockVisual(entityId);
                    }
                };

                // Listen for changes to individual entities
                state.entities.onChange = (entity, entityId) => {
                    if (entity.type === "operator") {
                        updateOperatorVisual(entity, entityId);
                    } else if (entity.type === "staticNumberblock") {
                        updateStaticNumberblockVisual(entity, entityId);
                    }
                };
            } catch (error) {
                console.warn("Could not set up Colyseus schema handlers:", error);
            }
        } else {
            console.error("❌ state.entities not found");
        }

        console.log("✅ Entity listeners fully set up");
    });

    // Continuous state updates as fallback if onChange is not working
    window.room.onStateChange((state) => {
        // Update entities (if onChange not working properly)
        if (state.entities) {
            state.entities.forEach((entity, entityId) => {
                if (entity.type === "operator") {
                    updateOperatorVisual(entity, entityId);
                } else if (entity.type === "staticNumberblock") {
                    updateStaticNumberblockVisual(entity, entityId);
                }
            });
        }
    });
}

function updateOperatorVisual(operator, operatorId) {
    const operatorVisual = window.visuals.operators[operatorId];
    if (operatorVisual) {
        operatorVisual.update({
            x: operator.x,
            y: operator.y,
            z: operator.z,
            type: operator.operatorType
        });
    }
}

function updateStaticNumberblockVisual(block, blockId) {
    const blockVisual = window.visuals.staticNumberblocks[blockId];
    if (blockVisual) {
        blockVisual.update({
            x: block.x,
            y: block.y,
            z: block.z,
            value: block.value,
            color: block.color
        });
    }
}

// Define Operators Visual class
window.OperatorsVisual = class OperatorsVisual {
    constructor(operatorData) {
        // Store operator data
        this.id = operatorData.id;
        this.type = operatorData.operatorType === "plus" ? "plus" : "minus";
        
        // Use the OperatorManager to create the operator if available
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
            console.warn("OperatorManager not available - creating simple operator visual");
            // Create a fallback visual
            this.createFallbackMesh(this.type === "plus" ? 0x00ff00 : 0xff0000);
        }
    }
    
    // Create a simple fallback mesh if operatorManager is not available
    createFallbackMesh(color) {
        this.group = new THREE.Group();
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.2 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);
    }
    
    update(operatorData) {
        if (!operatorData) return;
        
        // Update position
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
        this.color = blockData.color || this.getColorForNumber(this.value);
        
        // Create numberblock mesh
        this.createNumberblockMesh();
        
        // Set initial position
        this.update(blockData);
    }
    
    createNumberblockMesh() {
        try {
            // Clear existing meshes
            while (this.group.children.length > 0) {
                this.group.remove(this.group.children[0]);
            }
            
            // Use Numberblock class if available for consistent visuals
            if (window.Numberblock) {
                const numberblock = new window.Numberblock(this.value, this.color);
                this.group.add(numberblock.mesh);
                // Store reference for future updates
                this.numberblockRef = numberblock;
                return;
            }
            
            // Fallback to manual creation if Numberblock class isn't available
            console.log("Creating static numberblock with value:", this.value);
            
            // Block size and spacing
            const blockSize = 1;
            const blockSpacing = 0.05;
            
            // Get color based on value
            const color = this.color;
            
            // Create basic geometry for a single block
            const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.7,
                metalness: 0.2
            });
            
            // Create separate blocks for each value unit
            const totalHeight = this.value;
            
            // Determine arrangement (1D, 2D, or 3D) based on value
            if (this.value <= 5) {
                // 1D arrangement (stack)
                for (let i = 0; i < this.value; i++) {
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.y = i * (blockSize + blockSpacing);
                    this.group.add(cube);
                }
            } else if (this.value <= 10) {
                // 2D arrangement (2x stack)
                const halfValue = Math.ceil(this.value / 2);
                for (let i = 0; i < halfValue; i++) {
                    const cube1 = new THREE.Mesh(geometry, material);
                    cube1.position.set(
                        -(blockSize + blockSpacing) / 2,
                        i * (blockSize + blockSpacing),
                        0
                    );
                    this.group.add(cube1);
                    
                    // Add second column if needed
                    if (i + halfValue < this.value) {
                        const cube2 = new THREE.Mesh(geometry, material);
                        cube2.position.set(
                            (blockSize + blockSpacing) / 2,
                            i * (blockSize + blockSpacing),
                            0
                        );
                        this.group.add(cube2);
                    }
                }
            } else {
                // For larger numbers, create a uniform block with a text label
                const scale = Math.pow(this.value, 1/3); // Cube root scaling
                const bigCube = new THREE.Mesh(geometry, material);
                bigCube.scale.set(scale, scale, scale);
                this.group.add(bigCube);
            }
            
            // Add number label
            this.addNumberLabel();
        } catch (error) {
            console.error("Error creating static numberblock mesh:", error);
        }
    }
    
    addNumberLabel() {
        // Create a simple canvas with the number
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Fill canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw centered number
        ctx.fillStyle = 'black';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.value.toString(), canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a plane with the texture
        const labelGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        
        // Position the label in front of the numberblock
        // For stack arrangements, put it at the top
        if (this.value <= 5) {
            label.position.set(0, this.value + 0.5, 0.6);
        } else {
            // For other arrangements, center it
            label.position.set(0, this.value / 3, 0.6);
        }
        
        this.group.add(label);
    }
    
    getColorForNumber(number) {
        // Color mapping for numberblocks
        const colors = {
            1: 0xFF0000, // Red (One)
            2: 0xFFA500, // Orange (Two)
            3: 0xFFFF00, // Yellow (Three)
            4: 0x00FF00, // Green (Four)
            5: 0x0000FF, // Blue (Five)
            6: 0x800080, // Purple (Six)
            7: 0xFFC0CB, // Pink (Seven)
            8: 0xA52A2A, // Brown (Eight)
            9: 0x808080  // Grey (Nine)
        };
        
        // For values > 9, cycle through colors
        return colors[number % 9] || 0xFFFFFF;
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
            // Update color if needed based on new value
            this.color = blockData.color || this.getColorForNumber(this.value);
            // Recreate mesh with new value
            this.createNumberblockMesh();
        }
        
        // Update color if explicitly changed
        if (blockData.color !== undefined && this.color !== blockData.color) {
            this.color = blockData.color;
            // Update existing numberblock if possible
            if (this.numberblockRef && typeof this.numberblockRef.updateColor === 'function') {
                this.numberblockRef.updateColor(this.color);
            } else {
                // Otherwise recreate the mesh with new color
                this.createNumberblockMesh();
            }
        }
    }
};

// Make functions available globally
window.setupRoomListeners = setupRoomListeners;
window.createOperatorVisual = createOperatorVisual;
window.removeOperatorVisual = removeOperatorVisual;
window.createStaticNumberblockVisual = createStaticNumberblockVisual;
window.removeStaticNumberblockVisual = removeStaticNumberblockVisual;
window.updateOperatorVisual = updateOperatorVisual;
window.updateStaticNumberblockVisual = updateStaticNumberblockVisual;
