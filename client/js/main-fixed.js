// Numberblocks game - Main game logic

// Debug support
const DEBUG = true;

function debug(message, isError = false) {
    if (!DEBUG) return;
    
    // Log to console only when debug is enabled
    if (isError) {
        console.error(`[ERROR] ${message}`);
    } else {
        console.log(`[DEBUG] ${message}`);
    }
}

// Game variables
let scene, camera, renderer, controls;
let playerNumberblock;
let operatorManager;
let playerValue = 1;

// Add operator tracking without redeclaring variables
let heldOperator = null;
let lastOperatorSpawn = 0;

// Rotation variables for Q/E keys
let rotationQuaternion = new THREE.Quaternion();
let worldUp = new THREE.Vector3(0, 1, 0);
let rotationAxis = new THREE.Vector3();

// Global view mode tracking
window.isFirstPerson = true;  // Start in first-person view
window.isFreeCameraMode = false; // Not in free camera mode initially
window.playerPosition = null; // Store player position for returning from free camera mode

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Global variables and UI elements
let viewToggleBtn = null; // Global reference for the view toggle button

// Initialize networking variables
let lastSentPosition = new THREE.Vector3();
let lastSentRotation = 0;
let positionUpdateInterval = 100; // ms between position updates
let lastPositionUpdate = 0;
let inputUpdateInterval = 1000 / 30; // 30Hz input updates
let lastInputUpdate = 0;

// Initialize physics variables and flags
function initPhysics() {
    try {
        debug('Initializing physics');
        
        // Basic physics setup
        window.velocity = new THREE.Vector3(0, 0, 0);
        window.direction = new THREE.Vector3(0, 0, 0);
        window.canJump = false;
        
        // Setup movement flags
        window.moveForward = false;
        window.moveBackward = false;
        window.moveLeft = false;
        window.moveRight = false;
        window.turnLeft = false;
        window.turnRight = false;
        
        // Setup rotation utilities
        window.worldUp = new THREE.Vector3(0, 1, 0);
        window.rotationAxis = new THREE.Vector3();
        window.rotationQuaternion = new THREE.Quaternion();
        
        debug('Physics initialized successfully');
    } catch (error) {
        debug(`Error initializing physics: ${error.message}`, true);
    }
}

// Initialize the floor
function initFloor() {
    try {
        debug('Creating floor');
        
        // Create a larger green floor with darker color
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x114411,
            roughness: 0.8, 
            metalness: 0.2 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        
        // Rotate and position the floor
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Add a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
        scene.add(gridHelper);
        
        debug('Floor created successfully');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

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

// Toggle between first-person and third-person view
function toggleCameraView() {
    if (window.isFirstPerson && !window.isFreeCameraMode) {
        // Switch from first-person to third-person
        window.isFirstPerson = false;
        window.isFreeCameraMode = false;
        switchToThirdPersonView();
        debug("Switched to third-person view");
    } else if (!window.isFirstPerson && !window.isFreeCameraMode) {
        // Switch from third-person to free camera
        window.isFirstPerson = false;
        window.isFreeCameraMode = true;
        
        // Store player position for later
        if (window.room && window.room.state.players) {
            const playerState = window.room.state.players.get(window.room.sessionId);
            if (playerState) {
                window.playerPosition = {
                    x: playerState.x,
                    y: playerState.y,
                    z: playerState.z,
                    rotationY: playerState.rotationY,
                    pitch: playerState.pitch
                };
            }
        }
        
        switchToFreeCameraView();
        debug("Switched to free camera view");
    } else {
        // Switch from free camera back to first-person
        window.isFirstPerson = true;
        window.isFreeCameraMode = false;
        switchToFirstPersonView();
        debug("Switched back to first-person view");
    }
}

// First-person setup
function switchToFirstPersonView() {
    // Restore player visibility
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = false;
    }
    
    // Reset free camera variables
    window.freeCameraYaw = 0;
    window.freeCameraPitch = 0;
    
    if (controls && window.room && window.room.state.players) {
        // Position camera at player's head
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            camera.position.set(
                playerState.x,
                playerState.y + window.playerHeight,
                playerState.z
            );
            
            // Set camera rotation using quaternions to prevent gimbal lock
            camera.quaternion.setFromEuler(new THREE.Euler(
                playerState.pitch,
                playerState.rotationY + Math.PI,
                0,
                'YXZ'  // Important for proper FPS controls
            ));
            
            // Update controls position
            controls.getObject().position.copy(camera.position);
        }
    }
    
    // If we were in free camera mode, tell the server we're back
    if (window.isFreeCameraMode) {
        // Send an immediate input update to refresh server state
        window.isFreeCameraMode = false;
        sendInputUpdate();
    }
    
    // Update mouse sensitivity
    updateMouseSensitivity();
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Mouse to look<br>Press V to switch to third-person view";
    }
}

// Third-person setup
function switchToThirdPersonView() {
    // Position camera behind player, use thirdPersonDistance as the distance
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = true;
    }
    
    // Initialize orbit angles to position camera behind the player
    if (window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Set the horizontal orbit angle to match the player's rotation
            // Adding PI places it directly behind the player
            window.thirdPersonCameraOrbitX = playerState.rotationY + Math.PI;
            
            // Set vertical orbit angle to be slightly elevated (positive value)
            window.thirdPersonCameraOrbitY = 0.4; // Slightly elevated position
        }
    } else {
        // Fallback if player state is unavailable
        window.thirdPersonCameraOrbitX = Math.PI; // Behind player
        window.thirdPersonCameraOrbitY = 0.4;     // Slightly elevated
    }
    
    // Update camera position based on orbit angles
    updateThirdPersonCameraPosition();
    
    // Update mouse sensitivity
    updateMouseSensitivity();
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Right-click + Mouse to orbit camera<br>Press V to switch to free camera view";
    }
}

// Position camera behind player for third-person view
function positionCameraBehindPlayer(playerState) {
    if (!playerState) return;
    
    // Calculate camera position based on orbit angles
    // Start with a position vector at the desired distance
    const distance = window.thirdPersonCameraDistance;
    
    // Calculate horizontal position using orbit X angle
    const horizontalX = Math.sin(window.thirdPersonCameraOrbitX) * distance;
    const horizontalZ = Math.cos(window.thirdPersonCameraOrbitX) * distance;
    
    // Apply vertical orbit angle for height
    const verticalFactor = Math.sin(window.thirdPersonCameraOrbitY) * distance;
    const distanceFactor = Math.cos(window.thirdPersonCameraOrbitY);
    
    // Calculate final camera position
    const cameraPosition = new THREE.Vector3(
        playerState.x + horizontalX * distanceFactor,
        playerState.y + window.playerHeight + verticalFactor,
        playerState.z + horizontalZ * distanceFactor
    );
    
    // Set camera position
    camera.position.copy(cameraPosition);
    
    // Calculate look direction (from camera to player)
    const lookDirection = new THREE.Vector3();
    lookDirection.subVectors(new THREE.Vector3(playerState.x, playerState.y + window.playerHeight * 0.6, playerState.z), camera.position).normalize();
    
    // Calculate the correct up vector (always world up)
    const up = new THREE.Vector3(0, 1, 0);
    
    // Create quaternion from lookAt matrix
    const quaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4().lookAt(
        camera.position,
        new THREE.Vector3(playerState.x, playerState.y + window.playerHeight * 0.6, playerState.z),
        up
    );
    quaternion.setFromRotationMatrix(lookAtMatrix);
    camera.quaternion.copy(quaternion);
}

// Function to fix camera orientation in third-person view
function setThirdPersonCameraOrientation(camera, targetPos, playerPos) {
    // Calculate look at position (upper part of the player)
    const lookAtPosition = new THREE.Vector3(
        playerPos.x,
        playerPos.y + window.playerHeight * 0.6, // Look at upper body
        playerPos.z
    );
    
    // Calculate the correct up vector (always world up)
    const worldUp = new THREE.Vector3(0, 1, 0);
    
    // Create a matrix for the camera to look at the player
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(camera.position, lookAtPosition, worldUp);
    
    // Set quaternion from the matrix
    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(lookAtMatrix);
    camera.quaternion.copy(quaternion);
}

// Free camera view setup
function switchToFreeCameraView() {
    // Make sure player is visible
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = true;
    }
    
    // Unlock camera from pointer controls to allow free movement
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    
    // Initialize free camera orientation from player's current orientation
    if (window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            window.freeCameraYaw = playerState.rotationY;
            window.freeCameraPitch = playerState.pitch;
        }
    }
    
    // Position camera at a slight offset from the player
    if (window.playerPosition) {
        camera.position.set(
            window.playerPosition.x + 5,
            window.playerPosition.y + 5,
            window.playerPosition.z + 5
        );
        
        // Set initial camera orientation using quaternions
        camera.quaternion.setFromEuler(new THREE.Euler(
            window.freeCameraPitch,
            window.freeCameraYaw,
            0,
            'YXZ'  // Important for proper FPS controls
        ));
    }
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Mouse to look, Space/Shift for up/down<br>Press V to return to first-person view";
    }
}

function initPlayerNumberblock() {
    debug('Initializing Player Numberblock (client-side instantiation)');
    
    try {
        playerNumberblock = new Numberblock(window.playerValue || 1);
        playerNumberblock.mesh.position.set(0, 1, 0); // Adjust initial spawn position explicitly
        scene.add(playerNumberblock.mesh);
        
        window.playerNumberblock = playerNumberblock;  // Explicitly make globally available
        
        debug('Player Numberblock successfully initialized client-side');
        
        // Update HUD explicitly if needed
        // updateHUD();
    } catch (error) {
        debug(`Error initializing player Numberblock: ${error.message}`, true);
    }
}


// Main initialization function
function init() {
    try {
        debug('Initializing game');
        
        // Create the scene first
        initScene();
        
        // Initialize physics variables and flags
        initPhysics();
        
        // Create the camera
        debug('Creating camera');
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 5); // Start a bit back to see the player
        window.camera = camera; // Make globally available
        
        // Setup renderer
        debug('Setting up renderer');
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.gammaFactor = 2.2;
        
        // Add renderer to document
        document.body.appendChild(renderer.domElement);
        window.renderer = renderer;
        
        // Initialize the floor
        initFloor();

        // Explicitly set camera mode before initializing controls
        window.isFirstPerson = true;  

        // Setup controls for player movement
        setupPointerLockControls();
        
        // Initialize the player
        initPlayerNumberblock();
       
        // Initialize networking for multiplayer
        window.initNetworking().then((roomInstance) => {
            window.gameRoom = roomInstance;
            window.room = roomInstance;
        
            setInterval(sendInputUpdate, 1000 / 30);
                        
            animate(); // Explicitly start animation here if needed
        }).catch((error) => {
            debug(`Networking error: ${error.message}`, true);
        });
                
        // Add resize event listener
        window.addEventListener('resize', onWindowResize, false);
        
        // Make key handlers available for player movement
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
        
        // Make sure global variables are properly declared
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        window.controls = controls;
        window.playerNumberblock = playerNumberblock;
        window.playerValue = playerValue;
        
        // Start the animation loop
        requestAnimationFrame(animate);
        
        debug('Game successfully initialized');
    } catch (error) {
        debug(`Full initialization error: ${error.message}`, true);
        console.error('Full initialization error:', error);
    }
}


// Initialize the scene
function initScene() {
    try {
        debug('Creating scene');
        
        // Create the scene
        scene = new THREE.Scene();
        
        // Make scene globally available
        window.scene = scene;
        
        // Set background color
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Add fog for depth perception - COMMENTED OUT client-side terrain setting
        // scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
        // Add proper lighting with reduced intensity
        // Ambient light - provides overall illumination to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced from 0.8
        scene.add(ambientLight);
        
        // Directional light - mimics sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Reduced from 1.0
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Hemisphere light - for natural outdoor lighting (sky/ground gradient)
        const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x3e2200, 0.4); // Reduced from 0.7
        scene.add(hemisphereLight);
        
        // Initialize operator manager and make it globally available
        operatorManager = new OperatorManager(scene);
        window.operatorManager = operatorManager;
        
        debug('Scene created successfully');
    } catch (error) {
        debug(`Error creating scene: ${error.message}`, true);
    }
}

// Setup PointerLock controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        controls = window.initControls(camera, renderer.domElement);
        
        let instructions = document.getElementById('lock-instructions');
        
        if (!instructions) {
            console.warn('Lock instructions element not found, creating one');
            instructions = document.createElement('div');
            instructions.id = 'lock-instructions';
            instructions.style.position = 'absolute';
            instructions.style.width = '100%';
            instructions.style.height = '100%';
            instructions.style.top = '0';
            instructions.style.left = '0';
            instructions.style.display = 'flex';
            instructions.style.flexDirection = 'column';
            instructions.style.justifyContent = 'center';
            instructions.style.alignItems = 'center';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
            instructions.style.cursor = 'pointer';
            instructions.style.zIndex = '1000';
            instructions.innerHTML = '<p>Click to enable controls</p>';
            document.body.appendChild(instructions);
        }

        // Add click event to the entire document
        document.addEventListener('click', () => {
            controls.lock();
        }, false);

        // Handle pointer lock change explicitly
        function onPointerLockChange() {
            if (document.pointerLockElement === renderer.domElement || 
                document.mozPointerLockElement === renderer.domElement ||
                document.webkitPointerLockElement === renderer.domElement) {
                
                debug('Pointer is now locked');
                instructions.style.display = 'none';
                document.body.classList.add('controls-enabled');
                window.canJump = true;
                window.isControlsEnabled = true;

                if (!window.isAnimating) {
                    window.isAnimating = true;
                    animate();
                }
            } else {
                instructions.style.display = 'block';
                debug('Pointer is unlocked');
            }
        }

        // Attach pointer lock event listeners clearly to the document
        document.addEventListener('pointerlockchange', onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

        scene.add(controls.getObject());
        window.isFirstPerson = true;

        debug('PointerLock controls setup complete');
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Update player movement physics
function updatePlayerPhysics(delta) {
    if (!controls || !scene || !controls.isLocked) return;
    
    const controlsObject = controls.getObject();
    let playerMoved = false;
    
    // Get current player state from server if available
    if (window.room && window.room.state && window.room.state.players) {
        const player = window.room.state.players.get(window.room.sessionId);
        if (player) {
            // Update the player's position based on the server position
            // This ensures server authority while allowing client-side prediction
            const lerpFactor = 0.2; // Lower value = smoother but more latent transition
            
            // Smoothly interpolate to the server position
            controlsObject.position.x = THREE.MathUtils.lerp(
                controlsObject.position.x, 
                player.x, 
                lerpFactor
            );
            
            controlsObject.position.z = THREE.MathUtils.lerp(
                controlsObject.position.z, 
                player.z, 
                lerpFactor
            );
            
            // Only use server Y position if it's significantly different
            if (Math.abs(controlsObject.position.y - player.y) > 0.5) {
                controlsObject.position.y = player.y;
            }
            
            // If there's a significant desync, instantly correct position
            const distanceSquared = 
                Math.pow(controlsObject.position.x - player.x, 2) + 
                Math.pow(controlsObject.position.z - player.z, 2);
                
            if (distanceSquared > 25) { // More than 5 units away
                controlsObject.position.x = player.x;
                controlsObject.position.z = player.z;
                controlsObject.position.y = player.y;
                console.log("Significant position correction applied");
            }
            
            // Update the player's velocity
            velocity.y = player.velocityY;
            
            // Update Numberblock position and scale to match player value
            updatePlayerNumberblock(player.value);
        }
    }
    
    // Also update UI if the player was observed
    if (playerMoved) {
        // Update game UI elements
        updateGameUI();
    }
}

// initialize your global visuals safely if not done already
window.visuals = window.visuals || { players: {}, operators: {}, staticNumberblocks: {} };

// animate loop (exactly like this)
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - window.prevTime) / 1000;
    window.prevTime = currentTime;

    // Only update local controls if we have pointer lock
    if (controls && controls.isLocked) {
        window.updateControls(controls, delta);
    }

    // Check if we have our player state from the server
    if (window.myPlayer && window.myPlayer.mesh && window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Always update player mesh position based on server state
            window.myPlayer.mesh.position.set(playerState.x, playerState.y, playerState.z);
            window.myPlayer.mesh.rotation.y = playerState.rotationY;

            // Handle view-specific camera updates
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                // First-person: Directly update camera with player state
                const playerState = window.room.state.players.get(window.room.sessionId);
                
                if (playerState) {
                    // Position the camera at the player's head height
                    camera.position.set(
                        playerState.x,
                        playerState.y + window.playerHeight,
                        playerState.z
                    );
                    
                    // Use quaternion to set camera rotation (prevents gimbal lock)
                    camera.quaternion.setFromEuler(new THREE.Euler(
                        playerState.pitch,
                        playerState.rotationY + Math.PI,
                        0,
                        'YXZ' // Important for proper FPS controls
                    ));
                    
                    // Hide player mesh in first-person
                    window.myPlayer.mesh.visible = false;
                }
            } else if (window.isFreeCameraMode) {
                // Free camera: Do nothing, camera is controlled independently
            } else {
                // Third-person: Position camera behind player with smooth follow
                
                // Calculate ideal camera position based on orbit angles
                const theta = window.thirdPersonCameraOrbitX;
                const phi = window.thirdPersonCameraOrbitY;
                
                // Calculate camera position based on spherical coordinates
                const distance = window.thirdPersonCameraDistance;
                const offsetX = distance * Math.sin(theta) * Math.cos(phi);
                const offsetY = distance * Math.sin(phi);
                const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
                
                // Target position (slightly above player's head)
                const lookAtPosition = new THREE.Vector3(
                    playerState.x,
                    playerState.y + window.playerHeight * 0.7, // Look at player's upper body
                    playerState.z
                );
                
                // Set camera position
                const targetCameraPos = new THREE.Vector3(
                    playerState.x + offsetX,
                    playerState.y + offsetY + window.playerHeight * 0.5,
                    playerState.z + offsetZ
                );
                
                // Smooth camera movement
                camera.position.lerp(targetCameraPos, 0.2);
                
                // Fix camera orientation
                setThirdPersonCameraOrientation(camera, lookAtPosition, playerState);
                
                // Show player mesh in third-person
                window.myPlayer.mesh.visible = true;
                
                // Add subtle rotation smoothing for player mesh
                const currentRot = window.myPlayer.mesh.rotation.y;
                const targetRot = playerState.rotationY;
                
                // Ensure we rotate the shortest way around (handling -π to π transition)
                let rotDiff = targetRot - currentRot;
                if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                
                // Apply smooth rotation
                window.myPlayer.mesh.rotation.y += rotDiff * 0.1;
            }
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function sendInputUpdate() {
    // Don't send updates if we're in free camera mode
    if (window.isFreeCameraMode) {
        return;
    }

    if (window.room) {
        window.room.send("input", {
            keys: window.inputState.keys,
            mouseDelta: {
                x: window.isFirstPerson ? window.inputState.mouseDelta.x : 0,
                y: window.isFirstPerson ? window.inputState.mouseDelta.y : 0
            },
            viewMode: window.isFirstPerson ? "first-person" : "third-person",
            thirdPersonCameraAngle: window.thirdPersonCameraOrbitX
        });
        
        // Reset accumulated mouse movement after sending to server
        window.inputState.mouseDelta.x = 0;
        window.inputState.mouseDelta.y = 0;
    }
}

setInterval(sendInputUpdate, 1000 / 30);

window.thirdPersonCameraDistance = 5;
window.thirdPersonCameraOrbitX = 0;
window.thirdPersonCameraOrbitY = 0;

// Update third-person camera position based on orbit angles
function updateThirdPersonCameraPosition() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Get camera reference
    const camera = window.camera;
    
    // Calculate theta (horizontal orbit angle) and phi (vertical orbit angle)
    const theta = window.thirdPersonCameraOrbitX;
    const phi = window.thirdPersonCameraOrbitY;
    
    // Calculate camera position based on spherical coordinates
    const distance = window.thirdPersonCameraDistance;
    const offsetX = distance * Math.sin(theta) * Math.cos(phi);
    const offsetY = distance * Math.sin(phi);
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
    
    // Calculate camera position relative to player
    const cameraPosition = new THREE.Vector3(
        playerState.x + offsetX,
        playerState.y + window.playerHeight / 2 + offsetY,
        playerState.z + offsetZ
    );
    
    // Set camera position
    camera.position.copy(cameraPosition);
    
    // Use our helper function to fix orientation
    setThirdPersonCameraOrientation(
        camera,
        cameraPosition,
        new THREE.Vector3(playerState.x, playerState.y, playerState.z)
    );
}
