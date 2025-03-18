// Numberblocks game - Entity synchronization module
// Handles entity synchronization (operators, static numberblocks)

// Setup schema listeners for a specific object type
function setupSpecificSchemaListeners(schemaName, schema) {
    if (!room || !schema) {
        console.warn(`Room or schema not available for ${schemaName}`);
        return;
    }
    
    try {
        // Create the appropriate tracking collections if they don't exist
        if (!window[schemaName]) {
            window[schemaName] = {};
        }
        
        // Check if schema is a MapSchema with onAdd method
        if (!schema || typeof schema.onAdd !== 'function') {
            console.error(`${schemaName} collection is not a valid MapSchema or not yet initialized:`, schema);
            console.log("Current room.state:", room.state);
            return;
        }
        
        // Determine which visual class to use
        let VisualClass;
        switch(schemaName) {
            case 'operators':
                VisualClass = OperatorsVisual;
                break;
            case 'staticNumberblocks':
                VisualClass = StaticNumberblocksVisual;
                break;
            default:
                console.warn(`No visual class defined for schema: ${schemaName}`);
                return;
        }
        
        // Setup listeners
        schema.onAdd((entity, entityId) => {
            console.log(`${schemaName} added:`, entityId);
            
            // Store entity in tracking collection
            window[schemaName][entityId] = entity;
            
            // Create visual
            try {
                const visual = new VisualClass(entity);
                visuals[schemaName][entityId] = visual;
                
                // Add to scene
                if (window.scene) {
                    window.scene.add(visual.group || visual.mesh);
                } else {
                    console.warn("Scene not available for adding entity visual");
                }
            } catch (error) {
                console.error(`Error creating ${schemaName} visual:`, error);
            }
            
            // Setup change listener
            entity.onChange(() => {
                // Update visual
                if (visuals[schemaName][entityId]) {
                    visuals[schemaName][entityId].update(entity);
                }
            });
        });
        
        // Listen for removals
        schema.onRemove((entity, entityId) => {
            console.log(`${schemaName} removed:`, entityId);
            
            // Remove visual
            if (visuals[schemaName][entityId]) {
                if (window.scene) {
                    window.scene.remove(visuals[schemaName][entityId].group || 
                                      visuals[schemaName][entityId].mesh);
                }
                delete visuals[schemaName][entityId];
            }
            
            // Remove from tracking
            delete window[schemaName][entityId];
        });
    } catch (error) {
        console.error(`Error setting up ${schemaName} listeners:`, error);
    }
}

// Setup generic schema listeners
function setupGenericSchemaListeners(room, schemaName) {
    if (!room || !room.state || !room.state[schemaName]) {
        console.warn(`Room or ${schemaName} not available`);
        return;
    }
    
    try {
        const schema = room.state[schemaName];
        
        // Initialize the tracking collection
        if (!window[schemaName]) {
            window[schemaName] = {};
        }
        
        // Setup add listener
        schema.onAdd((entity, entityId) => {
            console.log(`Generic ${schemaName} added:`, entityId);
            
            // Store in tracking
            window[schemaName][entityId] = entity;
            
            // Create simple visual representation
            const geometry = new THREE.SphereGeometry(0.5);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Set position if available
            if (entity.x !== undefined && entity.y !== undefined && entity.z !== undefined) {
                mesh.position.set(entity.x, entity.y, entity.z);
            }
            
            // Store visual
            visuals[schemaName] = visuals[schemaName] || {};
            visuals[schemaName][entityId] = { mesh };
            
            // Add to scene
            if (window.scene) {
                window.scene.add(mesh);
            }
            
            // Listen for changes
            entity.onChange(() => {
                // Update position
                if (visuals[schemaName][entityId] && visuals[schemaName][entityId].mesh) {
                    if (entity.x !== undefined && entity.y !== undefined && entity.z !== undefined) {
                        visuals[schemaName][entityId].mesh.position.set(entity.x, entity.y, entity.z);
                    }
                }
            });
        });
        
        // Listen for removals
        schema.onRemove((entity, entityId) => {
            console.log(`Generic ${schemaName} removed:`, entityId);
            
            // Remove visual
            if (visuals[schemaName] && visuals[schemaName][entityId]) {
                if (window.scene && visuals[schemaName][entityId].mesh) {
                    window.scene.remove(visuals[schemaName][entityId].mesh);
                }
                delete visuals[schemaName][entityId];
            }
            
            // Remove from tracking
            delete window[schemaName][entityId];
        });
    } catch (error) {
        console.error(`Error setting up generic ${schemaName} listeners:`, error);
    }
}

// Setup room listeners
function setupRoomListeners() {
    if (!room) {
        console.warn("Room not available for listeners");
        setTimeout(setupRoomListeners, 500);
        return;
    }
    
    try {
        console.log("Setting up room listeners");
        
        // Debug: Log the entire room.state object to inspect its structure
        console.log("Room state before setting up listeners:", room.state);
        console.log("Players collection type:", room.state.players ? typeof room.state.players : 'undefined');
        console.log("Players collection methods:", room.state.players ? Object.getOwnPropertyNames(Object.getPrototypeOf(room.state.players)) : 'undefined');
        
        // Player listeners
        setupPlayerListeners(room);
        
        // Operators listeners
        if (room.state.operators) {
            console.log("Setting up operators listeners");
            setupSpecificSchemaListeners('operators', room.state.operators);
        } else {
            console.warn("Operators collection not found in room state");
        }
        
        // Static numberblocks listeners
        if (room.state.staticNumberblocks) {
            console.log("Setting up staticNumberblocks listeners");
            setupSpecificSchemaListeners('staticNumberblocks', room.state.staticNumberblocks);
        } else {
            console.warn("StaticNumberblocks collection not found in room state");
        }
        
        // Other generic schemas
        const genericSchemas = ['trees', 'rocks'];
        genericSchemas.forEach(schemaName => {
            if (room.state[schemaName]) {
                console.log(`Setting up ${schemaName} listeners`);
                setupGenericSchemaListeners(room, schemaName);
            } else {
                console.warn(`${schemaName} collection not found in room state`);
            }
        });
        
        // Mark as initialized
        window.roomInitialized = true;
        console.log("Room listeners setup complete");
    } catch (error) {
        console.error("Error setting up room listeners:", error);
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
window.setupSpecificSchemaListeners = setupSpecificSchemaListeners;
window.setupGenericSchemaListeners = setupGenericSchemaListeners;
window.setupRoomListeners = setupRoomListeners;
