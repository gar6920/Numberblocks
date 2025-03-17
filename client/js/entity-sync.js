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
        
        // Player listeners
        setupPlayerListeners(room);
        
        // Operators listeners
        if (room.state.operators) {
            setupSpecificSchemaListeners('operators', room.state.operators);
        }
        
        // Static numberblocks listeners
        if (room.state.staticNumberblocks) {
            setupSpecificSchemaListeners('staticNumberblocks', room.state.staticNumberblocks);
        }
        
        // Other generic schemas
        const genericSchemas = ['trees', 'rocks'];
        genericSchemas.forEach(schemaName => {
            if (room.state[schemaName]) {
                setupGenericSchemaListeners(room, schemaName);
            }
        });
        
        // Mark room as initialized
        window.roomInitialized = true;
        console.log("Room listeners initialized successfully");
    } catch (error) {
        console.error("Error setting up room listeners:", error);
    }
}

// Define Operators Visual class
window.OperatorsVisual = class OperatorsVisual {
    constructor(operatorData) {
        // Create a group for the operator
        this.group = new THREE.Group();
        
        // Store operator data
        this.type = operatorData.type || '+';
        this.id = operatorData.id;
        
        // Create operator mesh
        this.createOperatorMesh();
        
        // Set initial position
        this.update(operatorData);
        
        // Setup animation properties
        this.floatOffset = Math.random() * Math.PI * 2; // Random starting offset
        this.floatSpeed = 1 + Math.random() * 0.5; // Slightly different speeds
        this.floatAmplitude = 0.2; // How high it floats up and down
        this.rotationSpeed = 0.5 + Math.random() * 0.5; // How fast it rotates
    }
    
    createOperatorMesh() {
        try {
            // Determine color based on operator type
            let color;
            switch(this.type) {
                case '+':
                    color = 0x00ff00; // Green for addition
                    break;
                case '-':
                    color = 0xff0000; // Red for subtraction
                    break;
                case '*':
                    color = 0x0000ff; // Blue for multiplication
                    break;
                case '/':
                    color = 0xffff00; // Yellow for division
                    break;
                default:
                    color = 0xffffff; // White for unknown operators
            }
            
            // Try to create specific operator model
            try {
                // Create plus or minus symbol
                if (this.type === '+' || this.type === '-') {
                    const operatorGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
                    const operatorMaterial = new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.8
                    });
                    
                    // Create main bar
                    this.operatorMesh = new THREE.Mesh(operatorGeometry, operatorMaterial);
                    this.group.add(this.operatorMesh);
                    
                    // For plus operator, add vertical bar
                    if (this.type === '+') {
                        const verticalGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
                        const verticalBar = new THREE.Mesh(verticalGeometry, operatorMaterial);
                        this.group.add(verticalBar);
                    }
                    
                    // Add glow effect
                    const glowGeometry = new THREE.SphereGeometry(0.5);
                    const glowMaterial = new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: a => a * 0.5
                    });
                    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                    this.group.add(glowMesh);
                } else {
                    // Fall back to simple representation for other operators
                    this.createFallbackMesh(color);
                }
            } catch (modelError) {
                console.warn("Error creating operator model, using fallback:", modelError);
                this.createFallbackMesh(color);
            }
        } catch (error) {
            console.error("Failed to create operator mesh:", error);
            // Create a very basic fallback
            this.createFallbackMesh(0xffffff);
        }
    }
    
    createFallbackMesh(color) {
        // Simple sphere as fallback
        const geometry = new THREE.SphereGeometry(0.4);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        this.operatorMesh = new THREE.Mesh(geometry, material);
        this.group.add(this.operatorMesh);
        
        // Add text label
        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: false,
            opacity: 1
        });
        
        // Text sprite would go here in a full implementation
        // For simplicity, just creating another small indicator
        const indicatorGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const indicator = new THREE.Mesh(indicatorGeometry, textMaterial);
        indicator.position.y = 0.5;
        this.group.add(indicator);
    }
    
    update(operatorData) {
        if (!operatorData) return;
        
        // Update position if provided
        if (operatorData.x !== undefined && 
            operatorData.y !== undefined && 
            operatorData.z !== undefined) {
            this.group.position.set(
                operatorData.x,
                operatorData.y,
                operatorData.z
            );
        }
        
        // Update rotation if provided
        if (operatorData.rotation !== undefined) {
            this.group.rotation.y = operatorData.rotation;
        }
        
        // Update type if changed
        if (operatorData.type !== undefined && this.type !== operatorData.type) {
            this.type = operatorData.type;
            
            // Remove old mesh
            this.group.remove(this.operatorMesh);
            
            // Create new mesh with updated type
            this.createOperatorMesh();
        }
    }
    
    // Animate the operator (rotation and floating effect)
    animate(deltaTime) {
        if (!this.group) return;
        
        // Rotate operator
        this.group.rotation.y += this.rotationSpeed * deltaTime;
        
        // Float up and down
        const floatOffset = Math.sin(
            (performance.now() / 1000) * this.floatSpeed + this.floatOffset
        ) * this.floatAmplitude;
        
        // Apply float to current position
        if (this.group.position.y !== undefined) {
            // Store base position if not set
            if (this.baseY === undefined) {
                this.baseY = this.group.position.y;
            }
            
            // Apply floating animation
            this.group.position.y = this.baseY + floatOffset;
        }
        
        // Make operator face the player
        if (window.camera && this.group) {
            // Calculate direction to camera
            const cameraPosition = window.camera.position;
            const direction = new THREE.Vector3();
            direction.subVectors(cameraPosition, this.group.position);
            
            // Only rotate on Y axis (keep upright)
            const angle = Math.atan2(direction.x, direction.z);
            this.group.rotation.y = angle;
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
