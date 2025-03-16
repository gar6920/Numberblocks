// Numberblocks game - Main game logic

// Debug support
const DEBUG = true;
const debugPanel = document.getElementById('debug-panel');

function debug(message, isError = false) {
    if (!DEBUG) return;
    
    console.log(`[DEBUG] ${message}`);
    
    if (debugPanel) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (isError) {
            messageElement.style.color = '#ff5555';
            console.error(`[ERROR] ${message}`);
        }
        debugPanel.appendChild(messageElement);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
}

// Game variables
let scene, camera, renderer, controls;
let playerNumberblock;
let operatorManager;
let prevTime = performance.now();
let playerValue = 1;

// Add operator tracking without redeclaring variables
let heldOperator = null;
let lastOperatorSpawn = 0;

// Movement keys state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let turnLeft = false;
let turnRight = false;

// Physics variables
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = true;

// Rotation variables for Q/E keys
const rotationQuaternion = new THREE.Quaternion();
const worldUp = new THREE.Vector3(0, 1, 0);
const rotationAxis = new THREE.Vector3();

// Add global variable for tracking view mode
window.isFirstPerson = true;

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Global variables and UI elements
let viewToggleBtn = null; // Global reference for the view toggle button

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    
    // Add view toggle button
    addViewToggleButton();
    
    init();
};

// Add view toggle button to switch between first and third person
function addViewToggleButton() {
    try {
        // Create button if it doesn't exist
        viewToggleBtn = document.getElementById('view-toggle');
        
        if (!viewToggleBtn) {
            viewToggleBtn = document.createElement('button');
            viewToggleBtn.id = 'view-toggle';
            viewToggleBtn.textContent = 'Third Person View';
            viewToggleBtn.style.position = 'absolute';
            viewToggleBtn.style.bottom = '20px';
            viewToggleBtn.style.left = '20px';
            viewToggleBtn.style.zIndex = '100';
            viewToggleBtn.style.padding = '8px 12px';
            viewToggleBtn.style.backgroundColor = '#4CAF50';
            viewToggleBtn.style.color = 'white';
            viewToggleBtn.style.border = 'none';
            viewToggleBtn.style.borderRadius = '4px';
            viewToggleBtn.style.cursor = 'pointer';
            document.body.appendChild(viewToggleBtn);
        }
        
        // Add click event listener
        viewToggleBtn.addEventListener('click', toggleCameraView);
        
        debug('View toggle button added');
    } catch (error) {
        debug(`Error adding view toggle button: ${error.message}`, true);
    }
}

// Toggle between first and third person views
function toggleCameraView() {
    window.isFirstPerson = !window.isFirstPerson;
    
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        viewToggleBtn.innerText = window.isFirstPerson ? 'Switch to Third Person' : 'Switch to First Person';
    }
    
    // Store the current position before switching views to ensure consistency
    const currentPosition = playerNumberblock ? playerNumberblock.mesh.position.clone() : null;
    const currentRotation = playerNumberblock ? playerNumberblock.mesh.rotation.y : 0;
    
    if (window.isFirstPerson) {
        debug('Switched to first-person view');
        switchToFirstPersonView();
    } else {
        debug('Switched to third-person view');
        switchToThirdPersonView();
    }
    
    // After switching views, ensure position consistency
    if (currentPosition && playerNumberblock) {
        playerNumberblock.mesh.position.copy(currentPosition);
        playerNumberblock.mesh.rotation.y = currentRotation;
        
        // If in first-person mode, also update controls position
        if (window.isFirstPerson && controls) {
            controls.getObject().position.set(
                currentPosition.x,
                currentPosition.y + 1.0, // Adjust for eye height
                currentPosition.z
            );
        }
        
        // Force a position update to the server to ensure sync
        if (typeof window.room !== 'undefined' && window.room) {
            window.room.send("updatePosition", {
                x: playerNumberblock.mesh.position.x,
                y: playerNumberblock.mesh.position.y,
                z: playerNumberblock.mesh.position.z,
                rotation: playerNumberblock.mesh.rotation.y
            });
        }
    }
}

// Switch to first-person view
function switchToFirstPersonView() {
    try {
        debug('Switched to first-person view');
        
        // Set global flag
        window.isFirstPerson = true;
        
        // Check if camera is already a child of controls
        // First make sure we're not trying to add camera as a child of itself
        if (camera.parent !== controls.getObject() && camera !== controls.getObject()) {
            // Remove camera from any previous parent
            if (camera.parent) {
                camera.parent.remove(camera);
            }
            
            // Add camera to controls (only if not already there)
            controls.getObject().add(camera);
        }
        
        // Reset camera position relative to controls
        camera.position.set(0, 0, 0);
        
        // Update button text
        if (viewToggleBtn) {
            viewToggleBtn.textContent = 'Third Person View';
        }
    } catch (error) {
        debug(`Error switching to first-person view: ${error.message}`, true);
    }
}

// Switch to third-person view
function switchToThirdPersonView() {
    try {
        debug('Switched to third-person view');
        
        // Set global flag
        window.isFirstPerson = false;
        
        // Remove camera from controls
        if (camera.parent) {
            const cameraWorldPosition = new THREE.Vector3();
            camera.getWorldPosition(cameraWorldPosition);
            camera.parent.remove(camera);
            
            // Add camera directly to scene
            scene.add(camera);
            
            // Maintain world position
            camera.position.copy(cameraWorldPosition);
        }
        
        // Set up third-person mouse handler if it doesn't exist
        if (!window.thirdPersonMouseHandler) {
            window.thirdPersonMouseHandler = function(event) {
                // Only process if we're in third-person mode and pointer is locked
                if (!window.isFirstPerson && controls.isLocked) {
                    // Skip processing extremely small movements to prevent drift
                    if (Math.abs(event.movementX) > 0.5) {
                        window.thirdPersonCameraAngle -= event.movementX * 0.002;
                    }
                }
            };
        }
        
        // Add mouse movement handler
        document.addEventListener('mousemove', window.thirdPersonMouseHandler);
        
        // Initialize camera angle if it's not set yet
        if (typeof window.thirdPersonCameraAngle === 'undefined') {
            window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
        }
        
        // Update button text
        if (viewToggleBtn) {
            viewToggleBtn.textContent = 'First Person View';
        }
    } catch (error) {
        debug(`Error switching to third-person view: ${error.message}`, true);
    }
}

// Main initialization function
function init() {
    try {
        debug('Starting initialization...');
        
        // Create the scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        debug('Scene created');
        
        // Create the camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 5);
        debug('Camera created');
        
        // Create the renderer
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        debug('Renderer created');
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);
        debug('Lights added');
        
        // Create a test cube to verify rendering
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        testCube.position.set(0, 0, -5);
        scene.add(testCube);
        debug('Test cube created');
        
        // Render the test cube to verify rendering is working
        renderer.render(scene, camera);
        debug('Initial render completed');
        
        // Setup Pointer Lock Controls
        setupPointerLockControls();
        
        // Initialize floor
        initFloor();
        
        // Initialize player Numberblock
        initPlayerNumberblock();
        
        // Initialize networking
        initNetworkingSystem();
        
        // Event listeners
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        // Start the animation loop
        debug('Starting animation loop');
        animate();
    } catch (error) {
        debug(`Initialization error: ${error.message}`, true);
        console.error(error);
        emergencyRender();
    }
}

// Setup Pointer Lock Controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        controls = new THREE.PointerLockControls(camera, document.body);
        scene.add(controls.getObject());
        
        const onPointerLockChange = function() {
            if (document.pointerLockElement === document.body) {
                debug('Pointer Lock enabled');
                controls.enabled = true;
            } else {
                debug('Pointer Lock disabled');
                controls.enabled = false;
            }
        };
        
        // Add event listeners for pointer lock
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('pointerlockerror', () => {
            debug('Pointer Lock error');
        });
        
        // Click to enable pointer lock
        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                controls.lock();
            }
        });
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Initialize the floor
function initFloor() {
    debug('Creating floor');
    
    try {
        // Create a larger green floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100); // Extended size (was 20, 20)
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x33aa33,  // Green color
            roughness: 0.8, 
            metalness: 0.2 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        
        // Rotate and position the floor
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Add a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
        scene.add(gridHelper);
        
        // Add some decorative objects
        addDecorativeObjects();
        
        // Add static Numberblocks
        addStaticNumberblocks();
        
        debug('Floor and environment created');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

// Add decorative objects to the scene
function addDecorativeObjects() {
    debug('Adding decorative objects');
    
    try {
        // Add some trees
        const treePositions = [
            { x: 10, z: 10 },
            { x: -15, z: 5 },
            { x: 7, z: -12 },
            { x: -8, z: -10 },
            { x: 20, z: -15 }
        ];
        
        treePositions.forEach(pos => {
            // Create tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x885522 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(pos.x, 2.5, pos.z);
            scene.add(trunk);
            
            // Create tree top
            const topGeometry = new THREE.ConeGeometry(2, 4, 8);
            const topMaterial = new THREE.MeshStandardMaterial({ color: 0x005500 });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(pos.x, 6, pos.z);
            scene.add(top);
        });
        
        // Add some rocks
        const rockPositions = [
            { x: 5, z: -5, scale: 1.5 },
            { x: -10, z: 12, scale: 1 },
            { x: 15, z: 8, scale: 2 },
            { x: -7, z: -15, scale: 0.8 }
        ];
        
        rockPositions.forEach(pos => {
            const rockGeometry = new THREE.DodecahedronGeometry(pos.scale, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                roughness: 0.9
            });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(pos.x, pos.scale, pos.z);
            scene.add(rock);
        });
        
        // Add some colorful cubes
        const cubePositions = [
            { x: 0, z: 15, color: 0xff0000 },
            { x: -18, z: -3, color: 0x00ff00 },
            { x: 12, z: -18, color: 0x0000ff }
        ];
        
        cubePositions.forEach(pos => {
            const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
            const cubeMaterial = new THREE.MeshStandardMaterial({ color: pos.color });
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.set(pos.x, 1, pos.z);
            scene.add(cube);
        });
        
        debug('Decorative objects added');
    } catch (error) {
        debug(`Error adding decorative objects: ${error.message}`, true);
    }
}

// Add static Numberblocks of various values
function addStaticNumberblocks() {
    debug('Adding static Numberblocks');
    
    try {
        // Define positions and values for static Numberblocks
        const numberblockData = [
            { value: 2, x: 8, z: 3 },
            { value: 3, x: -5, z: 8 },
            { value: 4, x: 15, z: -5 },
            { value: 5, x: -12, z: -8 },
            { value: 6, x: 5, z: -15 },
            { value: 7, x: -15, z: 12 },
            { value: 8, x: 18, z: 10 },
            { value: 9, x: -18, z: -14 },
            { value: 10, x: 10, z: -20 }
        ];
        
        // Create each Numberblock
        numberblockData.forEach(data => {
            try {
                const numberblock = new Numberblock(data.value);
                scene.add(numberblock.mesh);
                
                // Fix positioning: Set Y to half the value so bottom is at ground level (y=0)
                // For a block of value 5, the height is 5, so y=2.5 puts the bottom at ground level
                numberblock.mesh.position.set(data.x, data.value / 2, data.z);
                
                // Rotate randomly for variety
                numberblock.mesh.rotation.y = Math.random() * Math.PI * 2;
                
                // Add a small bounce animation
                const initialY = numberblock.mesh.position.y;
                const bounceSpeed = 0.5 + Math.random() * 0.5;
                const bounceHeight = 0.15;
                
                // Store animation data on the mesh for use in animate loop
                numberblock.mesh.userData = {
                    initialY: initialY,
                    bounceSpeed: bounceSpeed,
                    bounceHeight: bounceHeight,
                    bounceOffset: Math.random() * Math.PI * 2 // Random offset for varied motion
                };
            } catch (error) {
                debug(`Error creating static Numberblock: ${error.message}`, true);
            }
        });
        
        debug('Static Numberblocks added');
    } catch (error) {
        debug(`Error adding static Numberblocks: ${error.message}`, true);
    }
}

// Create a static numberblock visual from server data
function createStaticNumberblockVisual(id, blockData) {
    try {
        debug(`Creating static numberblock visual for ID: ${id} with value ${blockData.value}`);
        
        // Create a new numberblock with the value from server
        const blockMesh = new window.Numberblock(blockData.value);
        
        // Calculate the correct Y position (ground level + half height for proper alignment)
        const yPos = 0;
        
        // Set position based on server data with adjusted y position
        blockMesh.mesh.position.set(blockData.x, yPos, blockData.z);
        
        // Store the initial Y for bounce animation
        blockMesh.mesh.userData.initialY = yPos;
        
        // Add varying bounce parameters for visual interest
        blockMesh.mesh.userData.bounceOffset = Math.random() * Math.PI;
        blockMesh.mesh.userData.bounceSpeed = 0.8 + Math.random() * 0.4;
        blockMesh.mesh.userData.bounceHeight = 0.1 + Math.random() * 0.1;
        
        // Add to scene
        scene.add(blockMesh.mesh);
        
        // Store reference to the visual object
        staticNumberblocksVisuals[id] = blockMesh;
        
        return blockMesh;
    } catch (error) {
        debug(`Error creating static numberblock visual: ${error.message}`, true);
        return null;
    }
}

// Initialize the player's Numberblock
function initPlayerNumberblock() {
    debug('Creating player Numberblock');
    
    try {
        playerNumberblock = new Numberblock(playerValue);
        scene.add(playerNumberblock.mesh);
        playerNumberblock.mesh.position.set(0, 0, 0);
        debug('Player Numberblock created');
        
        // Update HUD
        updateHUD();
    } catch (error) {
        debug(`Error creating player Numberblock: ${error.message}`, true);
    }
}

// Initialize networking for multiplayer
function initNetworkingSystem() {
    debug('Initializing networking system');
    
    try {
        // Check if initNetworking is defined in network.js
        if (typeof window.initNetworking === 'function') {
            debug('Found networking module, attempting to connect...');
            window.initNetworking()
                .then(() => {
                    debug('Networking initialized successfully');
                })
                .catch(error => {
                    debug(`Networking error: ${error.message}`, true);
                });
        } else {
            debug('Networking module not detected, continuing in local mode');
        }
    } catch (error) {
        debug(`Error initializing networking: ${error.message}`, true);
    }
}

// Emergency render function - displays a simple scene if initialization fails
function emergencyRender() {
    debug('Attempting emergency render', true);
    
    try {
        // Create a very basic scene
        const emergencyScene = new THREE.Scene();
        emergencyScene.background = new THREE.Color(0x333333);
        
        const emergencyCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
        emergencyCamera.position.z = 2;
        
        const emergencyGeometry = new THREE.BoxGeometry(1, 1, 1);
        const emergencyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const emergencyCube = new THREE.Mesh(emergencyGeometry, emergencyMaterial);
        emergencyScene.add(emergencyCube);
        
        // Add text to indicate error
        const textDiv = document.createElement('div');
        textDiv.style.position = 'absolute';
        textDiv.style.top = '10px';
        textDiv.style.left = '10px';
        textDiv.style.color = 'white';
        textDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        textDiv.style.padding = '10px';
        textDiv.style.fontFamily = 'monospace';
        textDiv.textContent = 'Initialization Error! Check console for details.';
        document.body.appendChild(textDiv);
        
        // Render the emergency scene
        renderer.render(emergencyScene, emergencyCamera);
        debug('Emergency render complete');
    } catch (error) {
        debug(`Emergency render failed: ${error.message}`, true);
        alert('Critical rendering error: ' + error.message);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle keyboard input
function onKeyDown(event) {
    try {
        if (document.activeElement !== document.body) return; // Skip if focused on input
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                if (canJump) {
                    velocity.y = 5.0;
                    canJump = false;
                }
                break;
            case 'KeyV':
                // Toggle between first and third person view
                toggleCameraView();
                break;
            case 'KeyQ':
                // Turn left
                turnLeft = true;
                if (window.isFirstPerson) {
                    // Use quaternion rotation around world up axis (y-axis)
                    rotationAxis.copy(worldUp);
                    const rotationAngle = 0.05; // Same amount as before
                    rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                    
                    // Apply to the camera object - this matches how PointerLockControls works
                    controls.getObject().quaternion.premultiply(rotationQuaternion);
                }
                break;
            case 'KeyE':
                // Turn right
                turnRight = true;
                if (window.isFirstPerson) {
                    // Use quaternion rotation around world up axis (y-axis)
                    rotationAxis.copy(worldUp);
                    const rotationAngle = -0.05; // Negative for right turn
                    rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                    
                    // Apply to the camera object - this matches how PointerLockControls works
                    controls.getObject().quaternion.premultiply(rotationQuaternion);
                }
                break;
        }
    } catch (error) {
        debug(`KeyDown error: ${error.message}`, true);
    }
}

function onKeyUp(event) {
    try {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
            case 'KeyQ':
                turnLeft = false;
                break;
            case 'KeyE':
                turnRight = false;
                break;
        }
    } catch (error) {
        debug(`KeyUp error: ${error.message}`, true);
    }
}

// Handle animation frame - bounce effect for static blocks
function animateStaticNumberblocks(deltaTime) {
    try {
        // Process all static numberblocks with bounce animation
        Object.entries(staticNumberblocksVisuals).forEach(([id, blockMesh]) => {
            if (blockMesh && blockMesh.mesh) {
                // Apply bounce effect
                const time = performance.now() / 1000;
                const offset = blockMesh.mesh.userData.bounceOffset || 0;
                const speed = blockMesh.mesh.userData.bounceSpeed || 1;
                const height = blockMesh.mesh.userData.bounceHeight || 0.15;
                const initialY = blockMesh.mesh.userData.initialY || blockMesh.mesh.position.y;
                
                // Apply bounce animation - only move upward from initial position
                blockMesh.mesh.position.y = initialY + Math.abs(Math.sin(time * speed + offset) * height);
                
                // Slow rotation for visual interest
                blockMesh.mesh.rotation.y += 0.005;
            }
        });
    } catch (error) {
        debug(`Error in animateStaticNumberblocks: ${error.message}`, true);
    }
}

// Animation loop
function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Update player position based on view mode
        if (window.isFirstPerson) {
            updatePlayerPosition();
        } else {
            updatePlayerPositionThirdPerson();
            updateThirdPersonCamera();
        }
        
        // Animate static Numberblocks (bounce effect)
        const deltaTime = 1/60; // Approximate frame time
        animateStaticNumberblocks(deltaTime);
        
        // Update operators
        updateOperators();
        
        // Render the scene
        renderer.render(scene, camera);
    } catch (error) {
        debug(`Animation error: ${error.message}`, true);
    }
}

// Update and rotate all operators to face the player
function updateOperators() {
    try {
        // Check if enough time has passed to spawn a new operator
        const currentTime = performance.now();
        if (currentTime - lastOperatorSpawn > 10000 && operators.length < 10) { // 10 seconds, max 10 operators
            // Create a new operator
            const operatorType = Math.random() > 0.5 ? '+' : '-';
            const operatorGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const operatorMaterial = new THREE.MeshStandardMaterial({
                color: operatorType === '+' ? 0x00ff00 : 0xff0000,
                transparent: true,
                opacity: 0.8,
                emissive: operatorType === '+' ? 0x00ff00 : 0xff0000,
                emissiveIntensity: 0.5
            });
            
            const operator = new THREE.Mesh(operatorGeometry, operatorMaterial);
            
            // Random position on the map
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            operator.position.set(x, 1.5, z);
            
            // Tag with type for collision detection
            operator.userData = { 
                type: 'operator',
                operatorType: operatorType 
            };
            
            // Add to scene and track
            scene.add(operator);
            operators.push(operator);
            lastOperatorSpawn = currentTime;
            
            debug(`Spawned ${operatorType} operator`);
        }
        
        // Update existing operators
        if (playerNumberblock && operators.length > 0) {
            // Get player position
            const playerPosition = window.isFirstPerson ? 
                controls.getObject().position.clone() : 
                playerNumberblock.mesh.position.clone();
            
            // Update each operator
            for (let i = operators.length - 1; i >= 0; i--) {
                const operator = operators[i];
                
                // Make operator face the player
                operator.lookAt(playerPosition);
                
                // Make operator float
                const time = performance.now() / 1000;
                operator.position.y = 1.5 + Math.sin(time * 2) * 0.2;
                
                // Check for pickup
                if (operator.position.distanceTo(playerPosition) < 2) {
                    // Pickup this operator
                    heldOperator = operator.userData.operatorType;
                    scene.remove(operator);
                    operators.splice(i, 1);
                    
                    // Show in HUD
                    const hudElement = document.getElementById('hud');
                    if (hudElement) {
                        hudElement.innerHTML = `Holding: ${heldOperator}`;
                        hudElement.style.color = heldOperator === '+' ? 'green' : 'red';
                    } else {
                        // Create HUD if it doesn't exist
                        const newHud = document.createElement('div');
                        newHud.id = 'hud';
                        newHud.style.position = 'absolute';
                        newHud.style.bottom = '20px';
                        newHud.style.right = '20px';
                        newHud.style.padding = '10px';
                        newHud.style.backgroundColor = 'rgba(0,0,0,0.5)';
                        newHud.style.color = heldOperator === '+' ? 'green' : 'red';
                        newHud.style.fontWeight = 'bold';
                        newHud.style.fontSize = '20px';
                        newHud.innerHTML = `Holding: ${heldOperator}`;
                        document.body.appendChild(newHud);
                    }
                    
                    debug(`Picked up ${heldOperator} operator`);
                }
            }
            
            // If holding an operator, check for numberblock collisions
            if (heldOperator) {
                // Check all scene objects for numberblocks
                scene.children.forEach(child => {
                    if (child !== playerNumberblock.mesh && 
                        child.userData && 
                        child.userData.initialY !== undefined) { // Identify numberblocks by userData.initialY
                        
                        // If close enough to this numberblock
                        if (child.position.distanceTo(playerPosition) < 2) {
                            // Extract the value from its position (height = value)
                            const targetValue = Math.round(child.position.y * 2);
                            
                            // Apply operator
                            let newValue = playerValue;
                            if (heldOperator === '+') {
                                newValue += targetValue;
                            } else if (heldOperator === '-') {
                                newValue -= targetValue;
                                if (newValue < 1) newValue = 1; // Minimum value is 1
                            }
                            
                            // Update player value
                            updatePlayerValue(newValue);
                            
                            // Clear held operator
                            heldOperator = null;
                            
                            // Update HUD
                            const hudElement = document.getElementById('hud');
                            if (hudElement) {
                                hudElement.innerHTML = '';
                            }
                            
                            debug(`Used operator on numberblock with value ${targetValue}, new player value: ${newValue}`);
                        }
                    }
                });
            }
        }
    } catch (error) {
        debug(`Error in updateOperators: ${error.message}`, true);
    }
}

// Update player position in third-person mode
function updatePlayerPositionThirdPerson() {
    try {
        if (!playerNumberblock || !controls) return;
        
        const time = performance.now();
        
        if (!prevTime) {
            prevTime = time;
            return;
        }
        
        const delta = (time - prevTime) / 1000;
        const moveSpeed = 5.0; // Movement speed as specified in memory
        const rotationSpeed = 2.0; // Rotation speed for Q/E keys
        
        // Get camera's current direction vectors, using proper forward/right orientation
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        // Project to horizontal plane by zeroing Y and normalizing
        const forward = cameraDirection.clone().setY(0).normalize();
        const right = cameraRight.clone().setY(0).normalize();
        
        // Calculate desired movement direction from keyboard input
        const movement = new THREE.Vector3();
        if (moveForward) movement.add(forward);
        if (moveBackward) movement.sub(forward);
        if (moveLeft) movement.sub(right);
        if (moveRight) movement.add(right);
        
        // Apply gravity
        velocity.y -= 9.8 * delta;
        
        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(moveSpeed * delta);
            
            // Update player position
            playerNumberblock.mesh.position.add(movement);
            
            // Rotate player to face movement direction if moving (and no manual rotation with Q/E)
            if (!turnLeft && !turnRight) {
                const targetAngle = Math.atan2(movement.x, movement.z);
                playerNumberblock.mesh.rotation.y = targetAngle;
            }
        }
        
        // Update vertical position with gravity
        playerNumberblock.mesh.position.y += velocity.y * delta;
        
        // Check for floor collision
        if (playerNumberblock.mesh.position.y < 0.5) {
            velocity.y = 0;
            playerNumberblock.mesh.position.y = 0.5;
            canJump = true;
        }
        
        // Rotate player using Q/E keys
        if (turnLeft) playerNumberblock.mesh.rotation.y += rotationSpeed * delta;
        if (turnRight) playerNumberblock.mesh.rotation.y -= rotationSpeed * delta;
        
        // Send position to server for multiplayer
        if (typeof window.room !== 'undefined' && window.room) {
            window.room.send("updatePosition", {
                x: playerNumberblock.mesh.position.x,
                y: playerNumberblock.mesh.position.y,
                z: playerNumberblock.mesh.position.z,
                rotation: playerNumberblock.mesh.rotation.y
            });
        }
        
        prevTime = time;
    } catch (error) {
        debug(`Error in updatePlayerPositionThirdPerson: ${error.message}`, true);
    }
}

// Update third-person camera position
function updateThirdPersonCamera() {
    try {
        if (!playerNumberblock || !playerNumberblock.mesh) return;
        
        const distance = 12;      // Camera distance behind the player
        const heightOffset = 8;   // Height offset above the player
        const smoothing = 0.1;    // Smooth camera motion factor
        const rotationSpeed = 0.05;
        
        // Initialize the angle if not set
        if (typeof window.thirdPersonCameraAngle === 'undefined') {
            window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
        }
        
        // Adjust camera angle with Q/E keys
        if (turnLeft) window.thirdPersonCameraAngle += rotationSpeed;
        if (turnRight) window.thirdPersonCameraAngle -= rotationSpeed;
        
        // Calculate desired camera position explicitly without cumulative interpolation errors
        const playerPos = playerNumberblock.mesh.position.clone();
        const targetX = playerPos.x - Math.sin(window.thirdPersonCameraAngle) * distance;
        const targetZ = playerPos.z - Math.cos(window.thirdPersonCameraAngle) * distance;
        
        // Ensure camera Y position is always exactly at height offset plus player's midpoint height
        const targetY = playerNumberblock.mesh.position.y + heightOffset;
        
        // Set camera position explicitly without smoothing vertically to prevent drift
        camera.position.set(
            THREE.MathUtils.lerp(camera.position.x, targetX, 0.1),
            targetY, // No vertical smoothing
            THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1)
        );
        
        // Always look at the player's midpoint height directly
        const heightAdjustment = playerNumberblock.getHeight ? playerNumberblock.getHeight() / 2 : 1;
        camera.lookAt(
            playerNumberblock.mesh.position.x,
            targetY - (heightOffset / 2),
            playerNumberblock.mesh.position.z
        );
    } catch (error) {
        debug(`Error in updateThirdPersonCamera: ${error.message}`, true);
    }
}

// Update player position based on controls (first-person mode)
function updatePlayerPosition() {
    const time = performance.now();
    
    if (!prevTime) {
        prevTime = time;
        return;
    }
    
    const delta = (time - prevTime) / 1000;
    
    // Apply movement damping
    velocity.x -= velocity.x * 5.0 * delta; 
    velocity.z -= velocity.z * 5.0 * delta;
    
    // Apply gravity (9.8 as specified in memory)
    velocity.y -= 9.8 * delta;
    
    // Calculate movement direction based on input
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Ensure consistent movement regardless of direction
    
    // Apply movement force (scaled to achieve 5.0 units/sec)
    if (moveForward || moveBackward) velocity.z -= direction.z * 5.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 5.0 * delta;
    
    // Apply velocity to controls for movement
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Apply jump physics
    controls.getObject().position.y += velocity.y * delta;
    
    // Check for floor collision
    if (controls.getObject().position.y < 1.0) { // Player height is 2.0 units
        velocity.y = 0;
        controls.getObject().position.y = 1.0;
        canJump = true;
    }
    
    // Update position of player's Numberblock to match camera in first-person view
    if (playerNumberblock) {
        // Copy position with an adjustment for height
        const controlsPosition = controls.getObject().position.clone();
        playerNumberblock.mesh.position.set(
            controlsPosition.x,
            controlsPosition.y - 1.0, // Position below camera
            controlsPosition.z
        );
        
        // Make Numberblock rotation exactly match camera rotation
        const euler = new THREE.Euler().setFromQuaternion(controls.getObject().quaternion, 'YXZ');
        playerNumberblock.mesh.rotation.y = euler.y; // Only use Y rotation
    }
    
    // Send position to server for multiplayer
    if (typeof window.room !== 'undefined' && window.room) {
        window.room.send("updatePosition", {
            x: playerNumberblock.mesh.position.x,
            y: playerNumberblock.mesh.position.y,
            z: playerNumberblock.mesh.position.z,
            rotation: controls.getObject().rotation.y
        });
    }
    
    prevTime = time;
}

// Check for collisions with operators and other Numberblocks
function checkCollisions() {
    // Will be implemented with proper collision detection
}

// Update player's Numberblock value
function updatePlayerValue(newValue) {
    try {
        playerValue = newValue;
        
        // Update the Numberblock
        if (playerNumberblock) {
            scene.remove(playerNumberblock.mesh);
            playerNumberblock = new Numberblock(playerValue);
            scene.add(playerNumberblock.mesh);
            
            // Position it correctly based on camera/controls
            if (window.isFirstPerson) {
                playerNumberblock.mesh.position.copy(controls.getObject().position);
                playerNumberblock.mesh.position.y -= 1.0; // Position below camera
                playerNumberblock.mesh.rotation.y = controls.getObject().rotation.y;
            }
        }
        
        // Update HUD
        updateHUD();
        
        debug(`Player value updated to ${playerValue}`);
    } catch (error) {
        debug(`Error updating player value: ${error.message}`, true);
    }
}

// Update the HUD display
function updateHUD() {
    if (gameHUD) {
        gameHUD.innerHTML = `<div class="hud-value">Number: ${playerValue}</div>`;
    }
}

// For Numberblock prototype to enable getHeight() method
if (typeof window.Numberblock === 'undefined') {
    window.Numberblock = function() {};
    window.Numberblock.prototype.getHeight = function() {
        // Default height if not available
        return 2;
    };
}
