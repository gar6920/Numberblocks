// RTS View Manager
// Handles 2D top-down real-time strategy view

// Global RTS mode state
window.isRTSViewActive = false;
window.rtsViewLastMode = 'firstperson';
window.rtsCameraHeight = 100; // Much higher camera height for zoomed out view
window.rtsSelectedUnit = null;
window.rtsViewPanSpeed = 0.5;
window.rtsMoveTarget = null;
window.rtsMapSize = 500; // Increased map size (10x larger)

// Initialize RTS view
window.initRTSView = function() {
    console.log("Initializing RTS view");
    
    // Set up event listeners for RTS controls
    document.addEventListener('mousemove', handleRTSMouseMove);
    document.addEventListener('mousedown', handleRTSMouseDown);
    
    // Create minimap
    createRTSMinimap();
    
    // Set initial camera settings
    window.rtsCameraHeight = 100;
    
    // Add event listeners for RTS mode
    document.addEventListener('mousedown', onRTSMouseDown);
    document.addEventListener('contextmenu', function(event) {
        // Prevent context menu in RTS mode
        if (window.isRTSViewActive) {
            event.preventDefault();
        }
    });
    
    console.log("RTS view initialized");
};

// Toggle RTS view mode
window.toggleRTSView = function() {
    if (!window.scene || !window.camera) {
        console.error("Cannot toggle RTS view, scene or camera not available");
        return;
    }
    
    window.isRTSViewActive = !window.isRTSViewActive;
    
    if (window.isRTSViewActive) {
        // Store current view mode to return to later
        window.rtsViewLastMode = window.viewMode;
        
        // Enter RTS view
        console.log("Entering RTS view");
        document.body.style.cursor = 'default'; // Show cursor
        
        // Release pointer lock if active
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Position camera for top-down view
        if (window.playerEntity && window.playerEntity.mesh) {
            const playerPos = window.playerEntity.mesh.position.clone();
            window.camera.position.set(playerPos.x, playerPos.y + window.rtsCameraHeight, playerPos.z);
            window.camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
            window.camera.up.set(0, 0, -1); // Make camera look properly down
        } else {
            window.camera.position.set(0, window.rtsCameraHeight, 0);
            window.camera.lookAt(0, 0, 0);
            window.camera.up.set(0, 0, -1);
        }
        
        // Update camera to orthographic for RTS view - much more zoomed out
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 100; // Much larger value for zoomed out view
        window.rtsOrthographicCamera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 1, 1000
        );
        
        // Copy position and rotation
        window.rtsOrthographicCamera.position.copy(window.camera.position);
        window.rtsOrthographicCamera.rotation.copy(window.camera.rotation);
        window.rtsOrthographicCamera.up.copy(window.camera.up);
        
        // Store perspective camera for later
        window.rtsPerspectiveCamera = window.camera;
        
        // Switch to orthographic camera
        window.camera = window.rtsOrthographicCamera;
        
        // Show the RTS UI elements
        showRTSUI();
        
        // Update RTS toggle button
        const rtsToggleBtn = document.getElementById('rts-toggle');
        if (rtsToggleBtn) {
            rtsToggleBtn.textContent = 'Exit RTS View (R)';
        }
        
        // Ensure controls don't re-lock the pointer in RTS mode
        if (window.controls && typeof window.controls.unlock === 'function') {
            window.controls.unlock();
        }
        
        // Disable pointer lock in RTS mode
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    } else {
        // Exit RTS view
        console.log("Exiting RTS view, returning to " + window.rtsViewLastMode);
        
        // Switch back to perspective camera
        if (window.rtsPerspectiveCamera) {
            window.camera = window.rtsPerspectiveCamera;
        }
        
        // Return to previous view mode
        switch (window.rtsViewLastMode) {
            case 'firstPerson':
                if (typeof window.switchToFirstPersonView === 'function') {
                    window.switchToFirstPersonView();
                }
                break;
            case 'thirdPerson':
                if (typeof window.switchToThirdPersonView === 'function') {
                    window.switchToThirdPersonView();
                }
                break;
            case 'freeCamera':
                if (typeof window.switchToFreeCameraView === 'function') {
                    window.switchToFreeCameraView();
                }
                break;
            default:
                if (typeof window.switchToFirstPersonView === 'function') {
                    window.switchToFirstPersonView();
                }
        }
        
        // Hide the RTS UI elements
        hideRTSUI();
        
        // Update RTS toggle button
        const rtsToggleBtn = document.getElementById('rts-toggle');
        if (rtsToggleBtn) {
            rtsToggleBtn.textContent = 'RTS View (R)';
        }
    }
    
    // Force a render to update the view immediately
    if (window.renderer && window.scene) {
        window.renderer.render(window.scene, window.camera);
    }
};

// Handle RTS mouse movements
function handleRTSMouseMove(event) {
    if (!window.isRTSViewActive) return;
    
    // Store mouse position for raycasting
    window.rtsMouse = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
    };
}

// Handle RTS mouse clicks
function handleRTSMouseDown(event) {
    if (!window.isRTSViewActive || !window.scene || !window.camera) return;
    
    // Left click - unit selection
    if (event.button === 0) {
        selectUnitUnderMouse();
    }
    // Right click - movement command
    else if (event.button === 2) {
        moveSelectedUnitToTarget();
    }
}

// Select unit under mouse
function selectUnitUnderMouse() {
    if (!window.isRTSViewActive || !window.rtsMouse) return;
    
    // Raycasting for unit selection
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(window.rtsMouse, window.camera);
    
    // Get all unit meshes
    const selectableUnits = [];
    
    // Add player entities
    if (window.room && window.room.state && window.room.state.players) {
        window.room.state.players.forEach(player => {
            if (player.id && window.visuals && window.visuals.players[player.id] && 
                window.visuals.players[player.id].mesh) {
                selectableUnits.push(window.visuals.players[player.id].mesh);
            }
        });
    }
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(selectableUnits, true);
    
    if (intersects.length > 0) {
        // Find the player that owns this mesh
        if (window.room && window.room.state && window.room.state.players) {
            window.room.state.players.forEach(player => {
                if (player.id && window.visuals && window.visuals.players[player.id] && 
                    window.visuals.players[player.id].mesh === intersects[0].object ||
                    window.visuals.players[player.id].mesh.children.includes(intersects[0].object)) {
                    
                    // Select this unit
                    window.rtsSelectedUnit = player.id;
                    console.log("Selected unit:", player.id);
                    
                    // Visual feedback for selection
                    highlightSelectedUnit();
                }
            });
        }
    } else {
        // Deselect if clicking empty space
        window.rtsSelectedUnit = null;
        clearUnitHighlights();
    }
}

// Highlight the currently selected unit
function highlightSelectedUnit() {
    // Clear previous highlights
    clearUnitHighlights();
    
    // Add highlight to selected unit
    if (window.rtsSelectedUnit && window.visuals && window.visuals.players[window.rtsSelectedUnit]) {
        const selectedMesh = window.visuals.players[window.rtsSelectedUnit].mesh;
        
        // Create selection box
        const boxSize = 2.5; // Slightly larger than the unit
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        
        // Create wireframe material
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const highlight = new THREE.Mesh(geometry, material);
        highlight.name = 'selection-highlight';
        
        // Position at same height as unit
        highlight.position.y = 0;
        
        selectedMesh.add(highlight);
        
        console.log("Added highlight to unit:", window.rtsSelectedUnit);
    }
}

// Clear all unit highlights
function clearUnitHighlights() {
    if (window.visuals) {
        Object.values(window.visuals.players).forEach(player => {
            if (player.mesh) {
                const highlight = player.mesh.getObjectByName('selection-highlight');
                if (highlight) {
                    player.mesh.remove(highlight);
                }
            }
        });
    }
}

// Move selected unit to target position
function moveSelectedUnitToTarget() {
    if (!window.isRTSViewActive || !window.rtsSelectedUnit || !window.rtsMouse) return;
    
    // Only the local player can be moved
    if (window.rtsSelectedUnit !== window.room.sessionId) {
        console.log("Cannot move other players' units");
        return;
    }
    
    // Raycasting to find target position on ground
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(window.rtsMouse, window.camera);
    
    // Find intersection with ground plane
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, targetPoint);
    
    // Set move target
    window.rtsMoveTarget = targetPoint;
    
    // Store the target position for rendering a marker
    showMoveTargetMarker(targetPoint);
    
    // Send movement command to server
    if (window.room) {
        window.room.send("playerMove", {
            x: targetPoint.x,
            y: targetPoint.y,
            z: targetPoint.z
        });
    }
    
    console.log("Moving to:", targetPoint);
}

// Show visual marker at move target position
function showMoveTargetMarker(position) {
    // Remove any existing marker
    const existingMarker = window.scene.getObjectByName('move-target-marker');
    if (existingMarker) {
        window.scene.remove(existingMarker);
    }
    
    // Create a new marker
    const geometry = new THREE.RingGeometry(0.8, 1, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.position.y = 0.1; // Slightly above ground
    marker.rotation.x = -Math.PI / 2; // Lay flat
    marker.name = 'move-target-marker';
    
    // Add to scene
    window.scene.add(marker);
    
    // Set up automatic removal after 2 seconds
    setTimeout(() => {
        const marker = window.scene.getObjectByName('move-target-marker');
        if (marker) {
            window.scene.remove(marker);
        }
    }, 2000);
}

// Handle camera panning in RTS view with WASD keys
window.updateRTSView = function(delta) {
    if (!window.isRTSViewActive) return;
    
    // Handle camera panning with WASD
    handleRTSCameraPanning(delta);
    
    // Update minimap
    updateRTSMinimap();
};

// Handle camera panning in RTS view
function handleRTSCameraPanning(delta) {
    if (!window.isRTSViewActive || !window.camera) return;
    
    // Calculate pan speed based on delta time and map size
    const panSpeed = 25 * delta; // Increased for larger map
    
    // Pan based on WASD keys
    if (window.inputState.keys.w) {
        window.camera.position.z -= panSpeed;
    }
    if (window.inputState.keys.s) {
        window.camera.position.z += panSpeed;
    }
    if (window.inputState.keys.a) {
        window.camera.position.x -= panSpeed;
    }
    if (window.inputState.keys.d) {
        window.camera.position.x += panSpeed;
    }
}

// Create 2D icons for entities in RTS mode
function createRTSIcons() {
    // Create simple sprite materials for different entities
    window.rtsIcons = {
        player: new THREE.SpriteMaterial({
            color: 0x00ff00,
            map: createIconTexture('P', 64, 64, 0x00ff00)
        }),
        otherPlayer: new THREE.SpriteMaterial({
            color: 0x0000ff,
            map: createIconTexture('P', 64, 64, 0x0000ff)
        }),
        npc: new THREE.SpriteMaterial({
            color: 0xffff00,
            map: createIconTexture('N', 64, 64, 0xffff00)
        }),
        object: new THREE.SpriteMaterial({
            color: 0xaaaaaa,
            map: createIconTexture('O', 64, 64, 0xaaaaaa)
        })
    };
    
    // Create selection indicator
    window.rtsIcons.selection = new THREE.SpriteMaterial({
        color: 0xffffff,
        map: createSelectionTexture(128, 128)
    });
}

// Create a texture with text for icons
function createIconTexture(text, width, height, color) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    // Fill background as circle
    context.beginPath();
    context.arc(width/2, height/2, width/2 - 4, 0, 2 * Math.PI);
    context.fillStyle = 'white';
    context.fill();
    
    // Add border
    context.lineWidth = 2;
    context.strokeStyle = '#000000';
    context.stroke();
    
    // Add text
    context.font = 'bold ' + Math.floor(width/2) + 'px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#000000';
    context.fillText(text, width/2, height/2);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create a texture for selection indicator
function createSelectionTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    // Draw selection circle
    context.beginPath();
    context.arc(width/2, height/2, width/2 - 4, 0, 2 * Math.PI);
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.stroke();
    
    // Add animated dots around circle (for static texture, we'll show them fixed)
    const dotCount = 8;
    const radius = width/2 - 2;
    context.fillStyle = 'white';
    for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        const x = width/2 + Math.cos(angle) * radius;
        const y = height/2 + Math.sin(angle) * radius;
        context.beginPath();
        context.arc(x, y, 4, 0, 2 * Math.PI);
        context.fill();
    }
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create minimap for RTS view
function createRTSMinimap() {
    // Create minimap canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'rts-minimap';
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.position = 'absolute';
    canvas.style.bottom = '20px';
    canvas.style.left = '20px';
    canvas.style.border = '2px solid white';
    canvas.style.borderRadius = '5px';
    canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    canvas.style.zIndex = '1000';
    canvas.style.display = 'none'; // Hidden by default, shown when RTS mode is active
    
    // Add canvas to document
    document.body.appendChild(canvas);
    
    // Store canvas and context for later use
    window.rtsMinimap = {
        canvas: canvas,
        context: canvas.getContext('2d')
    };
    
    console.log("RTS minimap created");
}

// Update the RTS minimap
function updateRTSMinimap() {
    if (!window.rtsMinimap || !window.rtsMinimap.context || !window.rtsMinimap.canvas) {
        createRTSMinimap();
    }
    
    if (!window.rtsMinimap || !window.isRTSViewActive) return;
    
    const { canvas, context } = window.rtsMinimap;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear previous frame
    context.clearRect(0, 0, width, height);
    
    // Draw background
    context.fillStyle = '#0a1a2a';
    context.fillRect(0, 0, width, height);
    
    // Draw border
    context.strokeStyle = '#3a9bda';
    context.lineWidth = 2;
    context.strokeRect(2, 2, width-4, height-4);
    
    // Calculate scale - how much minimap space represents one unit in the game
    // Adjust for larger map size
    const mapSize = window.rtsMapSize || 500;
    const scale = width / (mapSize * 2); // Scale to fit entire map
    
    // Center of minimap
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw all players
    if (window.room && window.room.state && window.room.state.players) {
        window.room.state.players.forEach(player => {
            // Draw dot on minimap
            const minimapX = centerX + player.x * scale;
            const minimapY = centerY + player.z * scale;
            
            // Different color for local player vs other players
            if (player.id === window.room.sessionId) {
                context.fillStyle = '#00ff00'; // Green for local player
            } else {
                context.fillStyle = '#0088ff'; // Blue for other players
            }
            
            // Draw player dot
            context.beginPath();
            context.arc(minimapX, minimapY, 3, 0, 2 * Math.PI);
            context.fill();
        });
    }
    
    // Draw camera view area
    if (window.camera) {
        drawCameraFrustum(centerX, centerY, scale);
    }
}

// Draw a dot on the minimap
function drawMinimapDot(x, y, size, color) {
    const { context } = window.rtsMinimap;
    context.beginPath();
    context.arc(x, y, size, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#ffffff';
    context.stroke();
}

// Draw camera frustum/view direction on minimap
function drawCameraFrustum(centerX, centerY, scale) {
    if (!window.camera || !window.rtsMinimap) return;
    
    const { context } = window.rtsMinimap;
    
    // Get player position
    let x = 0, z = 0;
    if (window.playerEntity && window.playerEntity.mesh) {
        x = window.playerEntity.mesh.position.x;
        z = window.playerEntity.mesh.position.z;
    } else if (window.camera) {
        x = window.camera.position.x;
        z = window.camera.position.z;
    }
    
    // Draw player position indicator (simple dot)
    const viewX = centerX + x * scale;
    const viewZ = centerY + z * scale;
    
    context.beginPath();
    context.arc(viewX, viewZ, 4, 0, 2 * Math.PI);
    context.fillStyle = '#ffffff';
    context.fill();
}

// Show RTS UI elements
function showRTSUI() {
    // Show minimap
    if (window.rtsMinimap && window.rtsMinimap.canvas) {
        window.rtsMinimap.canvas.style.display = 'block';
    } else {
        // Create minimap if it doesn't exist
        createRTSMinimap();
        if (window.rtsMinimap && window.rtsMinimap.canvas) {
            window.rtsMinimap.canvas.style.display = 'block';
        }
    }
    
    // Add RTS mode indicator
    let rtsModeIndicator = document.getElementById('rts-mode-indicator');
    if (!rtsModeIndicator) {
        rtsModeIndicator = document.createElement('div');
        rtsModeIndicator.id = 'rts-mode-indicator';
        rtsModeIndicator.style.position = 'absolute';
        rtsModeIndicator.style.top = '20px';
        rtsModeIndicator.style.left = '20px';
        rtsModeIndicator.style.color = 'white';
        rtsModeIndicator.style.fontSize = '16px';
        rtsModeIndicator.style.fontWeight = 'bold';
        rtsModeIndicator.style.textShadow = '1px 1px 2px black';
        rtsModeIndicator.style.zIndex = '1000';
        document.body.appendChild(rtsModeIndicator);
    }
    rtsModeIndicator.textContent = 'RTS MODE - Use WASD to pan camera';
    rtsModeIndicator.style.display = 'block';
}

// Hide RTS UI elements
function hideRTSUI() {
    // Hide minimap
    if (window.rtsMinimap && window.rtsMinimap.canvas) {
        window.rtsMinimap.canvas.style.display = 'none';
    }
    
    // Hide RTS mode indicator
    const rtsModeIndicator = document.getElementById('rts-mode-indicator');
    if (rtsModeIndicator) {
        rtsModeIndicator.style.display = 'none';
    }
}

// RTS mouse handlers
function onRTSMouseDown(event) {
    if (!window.isRTSViewActive) return;
    
    if (event.button === 0) { // Left mouse button
        // Select units
        selectUnitsAtPosition(event.clientX, event.clientY);
    } else if (event.button === 2) { // Right mouse button
        // Move selected units
        moveSelectedUnits(event.clientX, event.clientY);
    }
}

function onRTSMouseUp(event) {
    if (!window.isRTSViewActive) return;
    
    // Handle any mouse up events specific to RTS mode
}

function onRTSMouseMove(event) {
    if (!window.isRTSViewActive) return;
    
    // Handle mouse move events for RTS mode
    // For example, show hover effects or update selection box
}

function onRTSMouseWheel(event) {
    if (!window.isRTSViewActive) return;
    
    // Handle mouse wheel for zooming in RTS mode
    event.preventDefault();
    
    // Adjust orthographic camera zoom
    if (window.camera && window.camera.isOrthographicCamera) {
        // Determine zoom direction
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        
        // Apply zoom to orthographic camera
        window.camera.left *= zoomFactor;
        window.camera.right *= zoomFactor;
        window.camera.top *= zoomFactor;
        window.camera.bottom *= zoomFactor;
        window.camera.updateProjectionMatrix();
        
        // Adjust RTS view zoom
        window.rtsViewZoom *= (event.deltaY > 0 ? 0.9 : 1.1);
        window.rtsViewZoom = THREE.MathUtils.clamp(window.rtsViewZoom, 0.5, 3.0);
        
        console.log("RTS zoom level:", window.rtsViewZoom.toFixed(2));
    }
}

// Select units at a screen position
function selectUnitsAtPosition(x, y) {
    if (!window.isRTSViewActive) return;
    
    // Clear previous selection
    window.rtsSelectedUnits = [];
    
    // Cast a ray to find clickable objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Convert mouse position to normalized device coordinates
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, window.camera);
    
    // Find intersections with selectable objects
    const selectableObjects = [];
    
    // Add the player entity if it exists
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableObjects.push(window.playerEntity.mesh);
    }
    
    // Add other players if available
    if (window.otherPlayers) {
        Object.values(window.otherPlayers).forEach(player => {
            if (player.mesh) {
                selectableObjects.push(player.mesh);
            }
        });
    }
    
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
        // Get the first intersection
        const selectedObject = intersects[0].object;
        
        // Add to selected units
        window.rtsSelectedUnits.push(selectedObject);
        
        // Add selection indicator
        addSelectionIndicator(selectedObject);
        
        console.log("Selected unit:", selectedObject);
    }
}

// Add selection indicator to a selected unit
function addSelectionIndicator(object) {
    // Remove existing selection indicators
    removeSelectionIndicators();
    
    // Create a new selection indicator
    if (window.rtsIcons && window.rtsIcons.selection) {
        const selectionIndicator = new THREE.Sprite(window.rtsIcons.selection);
        selectionIndicator.scale.set(5, 5, 1); // Make it larger than the unit
        
        // Position it slightly below the unit to avoid z-fighting
        selectionIndicator.position.copy(object.position);
        selectionIndicator.position.y = 0.1;
        
        // Mark it as a selection indicator
        selectionIndicator.userData.isSelectionIndicator = true;
        
        // Add to scene
        window.scene.add(selectionIndicator);
    }
}

// Remove all selection indicators from the scene
function removeSelectionIndicators() {
    if (!window.scene) return;
    
    const indicatorsToRemove = [];
    
    // Find all selection indicators
    window.scene.traverse(object => {
        if (object.userData && object.userData.isSelectionIndicator) {
            indicatorsToRemove.push(object);
        }
    });
    
    // Remove them from the scene
    indicatorsToRemove.forEach(indicator => {
        window.scene.remove(indicator);
    });
}

// Move selected units to a position
function moveSelectedUnits(x, y) {
    if (!window.isRTSViewActive || window.rtsSelectedUnits.length === 0) return;
    
    // Cast a ray to find the target position on the ground
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Convert mouse position to normalized device coordinates
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, window.camera);
    
    // Create a virtual ground plane if needed
    const groundY = 0; // Assume ground is at Y=0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
    
    // Find intersection with ground plane
    const targetPosition = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, targetPosition);
    
    // If got a valid target position
    if (targetPosition) {
        console.log("Moving selected units to:", targetPosition);
        
        // Send a move command for the player if they're selected
        if (window.playerEntity && window.rtsSelectedUnits.includes(window.playerEntity.mesh)) {
            // Send movement command to server
            if (window.room) {
                window.room.send("moveToPosition", {
                    x: targetPosition.x,
                    y: targetPosition.y,
                    z: targetPosition.z
                });
            }
            
            // Show click indicator
            showClickIndicator(targetPosition);
        }
    }
}

// Show click indicator at the target position
function showClickIndicator(position) {
    // Create a simple click indicator
    const geometry = new THREE.RingGeometry(0.5, 0.7, 16);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.rotation.x = -Math.PI / 2; // Lay flat on the ground
    indicator.position.copy(position);
    indicator.position.y = 0.1; // Slightly above ground
    
    // Add to scene
    window.scene.add(indicator);
    
    // Animate and remove after a short time
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    function animateIndicator() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            // Remove indicator when animation is complete
            window.scene.remove(indicator);
            return;
        }
        
        // Scale up over time
        const scale = 1 + progress * 2;
        indicator.scale.set(scale, scale, scale);
        
        // Fade out
        material.opacity = 0.7 * (1 - progress);
        
        // Continue animation
        requestAnimationFrame(animateIndicator);
    }
    
    // Start animation
    animateIndicator();
}

// Register RTS view update function
if (typeof window.registerAnimationCallback === 'function') {
    window.registerAnimationCallback(window.updateRTSView);
}
