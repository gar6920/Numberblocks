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

// Add global variable for tracking view mode
window.isFirstPerson = true;

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

// Toggle between first and third person views
function toggleCameraView() {
    window.isFirstPerson = !window.isFirstPerson;

    if (window.isFirstPerson) {
        switchToFirstPersonView();
    } else {
        switchToThirdPersonView();
    }
}

// First-person setup
function switchToFirstPersonView() {
    camera.position.set(0, window.playerHeight, 0);  // Adjust height appropriately
    camera.lookAt(new THREE.Vector3(0, window.playerHeight, -1));
    controls.getObject().position.copy(playerNumberblock.mesh.position);
    controls.getObject().rotation.set(0, playerNumberblock.mesh.rotation.y, 0);
}

// Third-person setup
function switchToThirdPersonView() {
    const offset = new THREE.Vector3(0, window.playerHeight + 2, window.thirdPersonCameraDistance);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerNumberblock.mesh.rotation.y);
    camera.position.copy(playerNumberblock.mesh.position).add(offset);
    camera.lookAt(playerNumberblock.mesh.position);
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
        
        // Prepare for static numberblocks
        addStaticNumberblocks();
        
        // Initialize networking for multiplayer
        initNetworkingSystem();
        
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
        // Create controls
        controls = window.initControls(camera, renderer.domElement);
        
        // Use the existing instructions element from HTML
        let instructions = document.getElementById('lock-instructions');
        
        // Create instructions if it doesn't exist
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
        
        // Function to handle pointer lock change
        function onPointerLockChange() {
            if (document.pointerLockElement === document.body || 
                document.mozPointerLockElement === document.body ||
                document.webkitPointerLockElement === document.body) {
                
                debug('Pointer is now locked');
                if (instructions) {
                    instructions.style.display = 'none';
                }
                
                // Set document focused state
                document.body.classList.add('controls-enabled');
                
                // Set physics flag
                window.canJump = true;
                
                // Set control movement flags
                window.isControlsEnabled = true;
                
                // Start the game loop if not already running
                if (!window.isAnimating) {
                    window.isAnimating = true;
                    animate();
                }
            } else {
                // Only show instructions if we're not in preview mode
                if (!window.previewControlsMode && instructions) {
                    instructions.style.display = 'block';
                }
                debug('Pointer is unlocked');
            }
        }
        
        // Event handler click to lock
        if (instructions) {
            instructions.addEventListener('click', function() {
                controls.lock();
            }, false);
        }
        
        // Add pointer lock events
        document.addEventListener('pointerlockchange', onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
        
        // Add error handler
        document.addEventListener('pointerlockerror', function() {
            debug('Pointer lock error', true);
        }, false);
        
        // Add controls to scene
        scene.add(controls.getObject());
        
        // Set first/third person flag
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

    window.updateControls(controls, delta);  // ADD THIS EXPLICITLY

    if (window.room && window.room.state && window.room.state.players) {
        const player = window.room.state.players.get(window.room.sessionId);
        if (player && playerNumberblock && playerNumberblock.mesh) {
            playerNumberblock.mesh.position.lerp(new THREE.Vector3(player.x, player.y, player.z), 0.2);
            playerNumberblock.mesh.rotation.y = player.rotationY;

            if (window.isFirstPerson && controls) {
                controls.getObject().position.set(player.x, player.y + window.playerHeight, player.z);
                controls.getObject().rotation.set(0, player.rotationY, 0);
                camera.rotation.x = player.pitch;
                playerNumberblock.mesh.visible = false;
            } else {
                const offset = new THREE.Vector3(0, window.playerHeight + 2, window.thirdPersonCameraDistance);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
                const desiredPos = new THREE.Vector3(player.x, player.y, player.z).add(offset);
                camera.position.lerp(desiredPos, 0.1);
                camera.lookAt(playerNumberblock.mesh.position);
                playerNumberblock.mesh.visible = true;
            }
        }
    }

    renderer.render(scene, camera);
}





// Send input state to the server
function sendInputUpdate() {
    try {
        if (!window.room || !window.room.connection || window.room.connection.readyState !== WebSocket.OPEN || !window.inputState) return;

        window.room.send("input", {
            version: 2,
            keys: window.inputState.keys,
            mouseDelta: window.inputState.mouseDelta
            // NO viewMode sent to server anymore
        });

        window.inputState.mouseDelta.x = 0;
        window.inputState.mouseDelta.y = 0;
    } catch (error) {
        console.error("Error sending input update:", error);
    }
}
function toggleCameraView() {
    window.isFirstPerson = !window.isFirstPerson;
    
    if (window.isFirstPerson) {
        switchToFirstPersonView();
    } else {
        switchToThirdPersonView();
    }
    // No need to notify server about this!
}


// Send regular position updates to the server for multiplayer synchronization
function sendRegularPositionUpdate() {
    try {
        // Ensure the WebSocket connection is open before sending
        if (!window.room || !window.room.connection || window.room.connection.readyState !== WebSocket.OPEN) {
            if (window.DEBUG) {
                console.warn("WebSocket not connected, skipping position update");
            }
            return;
        }

        let currentPos, currentRot, currentPitch;

        if (window.isFirstPerson && controls) {
            currentPos = controls.getObject().position;
            currentRot = controls.getObject().rotation.y;
            currentPitch = camera.rotation.x;
        } else if (playerNumberblock && playerNumberblock.mesh) {
            currentPos = playerNumberblock.mesh.position;
            currentRot = playerNumberblock.mesh.rotation.y;
            currentPitch = 0; // No pitch in third-person
        } else {
            if (window.DEBUG) {
                console.warn("No valid position or controls available, skipping update");
            }
            return; // No valid position to send
        }

        // Send update using the corrected method in network-core.js
        window.sendPlayerUpdate(currentPos, currentRot, currentPitch, playerValue);

        if (window.DEBUG) {
            console.log(`Position update sent: X=${currentPos.x.toFixed(2)}, Y=${currentPos.y.toFixed(2)}, Z=${currentPos.z.toFixed(2)}`);
        }
    } catch (error) {
        console.error("Error sending regular position update:", error);
    }
}



// Update player position in third-person mode
function updatePlayerPositionThirdPerson(time, delta) {
    try {
        if (!playerNumberblock || !controls) return;
        
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
        if (window.moveForward) movement.add(forward);
        if (window.moveBackward) movement.sub(forward);
        if (window.moveLeft) movement.sub(right);
        if (window.moveRight) movement.add(right);
        
        // Apply gravity
        window.velocity.y -= 9.8 * delta;
        
        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(moveSpeed * delta);
            
            // Update player position
            playerNumberblock.mesh.position.add(movement);
            
            // Rotate player to face movement direction if moving (and no manual rotation with Q/E)
            if (!window.turnLeft && !window.turnRight) {
                const targetAngle = Math.atan2(movement.x, movement.z);
                playerNumberblock.mesh.rotation.y = targetAngle;
            }
        }
        
        // Update vertical position with gravity
        playerNumberblock.mesh.position.y += window.velocity.y * delta;
        
        // Check for floor collision
        if (playerNumberblock.mesh.position.y < 0.5) {
            window.velocity.y = 0;
            playerNumberblock.mesh.position.y = 0.5;
            window.canJump = true;
        }
        
        // Rotate player using Q/E keys
        if (window.turnLeft) playerNumberblock.mesh.rotation.y += rotationSpeed * delta;
        if (window.turnRight) playerNumberblock.mesh.rotation.y -= rotationSpeed * delta;
        
        // Send position to server for multiplayer
        if (typeof window.room !== 'undefined' && window.room) {
            window.sendPlayerUpdate(
                playerNumberblock.mesh.position, 
                playerNumberblock.mesh.rotation.y,
                0, // pitch not used in third-person
                playerValue
            );
        }
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
        if (window.turnLeft) window.thirdPersonCameraAngle += rotationSpeed;
        if (window.turnRight) window.thirdPersonCameraAngle -= rotationSpeed;
        
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

// Update operators (animate them)
function updateOperators() {
    try {
        // First, update operators managed by the OperatorManager
        if (window.operatorManager) {
            window.operatorManager.update(1/60); // Pass approximate deltaTime
        }
        
        // For backwards compatibility, also check for visuals.operators
        if (window.visuals && window.visuals.operators) {
            // Get all operator visuals
            const operators = window.visuals.operators;
            
            // Calculate deltaTime (approximate)
            const deltaTime = 1/60;
            
            // Animate each operator
            for (const operatorId in operators) {
                const operator = operators[operatorId];
                if (operator && typeof operator.animate === 'function') {
                    operator.animate(deltaTime);
                }
            }
        }
    } catch (error) {
        debug(`Error updating operators: ${error.message}`, true);
    }
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
    console.log("Creating temporary Numberblock class");
    window.Numberblock = function(value, color) {
        this.value = value || 1;
        this.color = color || "#FFFF00";
        
        // Create a basic mesh for the numberblock
        const geometry = new THREE.BoxGeometry(1, this.value, 1);
        const material = new THREE.MeshStandardMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    };
    
    window.Numberblock.prototype.getHeight = function() {
        return this.value; // Actual height is the value
    };
    
    window.Numberblock.prototype.createNumberblock = function() {
        // Method already called in constructor, but added for compatibility
        return this.mesh;
    };
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// Add static Numberblocks of various values
function addStaticNumberblocks() {
    debug('Static Numberblocks function - disabled client-side instantiation');
    
    try {
        // COMMENTED OUT: Client-side static Numberblock creation
        /*
        // Define positions and values for static Numberblocks
        const numberblockData = [
            { value: 2, x: 8, z: 3 },
            { value: 3, x: -5, z: 8 },
            { value: 4, x: 15, z: -5 },
            { value: 5, x: -12, z: -8 },
            { value: 6, x: 5, z: -15 }
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
        */
        
        debug('Static Numberblocks: Waiting for server-driven creation');
    } catch (error) {
        debug(`Error in static Numberblocks function: ${error.message}`, true);
    }
}

// Initialize the player's Numberblock
function initPlayerNumberblock() {
    debug('Initializing Player Numberblock (client-side instantiation)');
    
    try {
        playerNumberblock = new Numberblock(playerValue || 1);
        playerNumberblock.mesh.position.set(0, 1, 0); // Set to initial spawn position
        scene.add(playerNumberblock.mesh);
        
        window.playerNumberblock = playerNumberblock;  // ensure globally available
        
        debug('Player Numberblock successfully initialized client-side');
        
        // Update HUD
        updateHUD();
    } catch (error) {
        debug(`Error initializing player Numberblock: ${error.message}`, true);
    }
}


// Initialize networking for multiplayer
function initNetworkingSystem() {
    debug('Initializing networking system');
    
    if (typeof window.initNetworking === 'function') {
        debug('Found networking module, attempting to connect...');
        window.initNetworking()
            .then((roomInstance) => {
                window.gameRoom = roomInstance;
                window.room = roomInstance;

                // setupRoomEventHandlers(roomInstance); // THIS LINE REMOVED COMPLETELY

                createDebugOverlay();

                setInterval(sendInputUpdate, 1000 / 30);
                setInterval(sendRegularPositionUpdate, 100);

                debug('Networking initialized successfully and input/position intervals set.');
            })
            .catch(error => {
                debug(`Networking error: ${error.message}`, true);
            });
    } else {
        debug('Networking module not detected, continuing in local mode');
    }
}


// Create debug overlay for development
function createDebugOverlay() {
    // Only create if DEBUG is true
    window.DEBUG = false; // Set to true during development
    
    // Create debug overlay element
    const debugOverlay = document.createElement('div');
    debugOverlay.id = 'debug-overlay';
    debugOverlay.style.position = 'absolute';
    debugOverlay.style.top = '10px';
    debugOverlay.style.left = '10px';
    debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    debugOverlay.style.color = 'white';
    debugOverlay.style.padding = '10px';
    debugOverlay.style.fontFamily = 'monospace';
    debugOverlay.style.fontSize = '12px';
    debugOverlay.style.display = 'none';
    debugOverlay.style.zIndex = '1000';
    document.body.appendChild(debugOverlay);
    
    // Debug logging function
    window.debugLog = function(...args) {
        if (window.DEBUG) console.log(...args);
    };
    
    // Update debug overlay
    window.updateDebugOverlay = function() {
        if (!window.DEBUG) {
            debugOverlay.style.display = 'none';
            return;
        }
        
        debugOverlay.style.display = 'block';
        
        let content = '';
        
        // Add player position info
        if (window.room && window.room.state && window.room.state.players) {
            const player = window.room.state.players.get(window.room.sessionId);
            if (player && window.playerNumberblock) {
                const clientPos = window.playerNumberblock.mesh.position;
                content += `Position:<br>`;
                content += `Client: x=${clientPos.x.toFixed(2)}, y=${clientPos.y.toFixed(2)}, z=${clientPos.z.toFixed(2)}<br>`;
                content += `Server: x=${player.x.toFixed(2)}, y=${player.y.toFixed(2)}, z=${player.z.toFixed(2)}<br>`;
                content += `<br>Rotation:<br>`;
                content += `Y: ${player.rotationY.toFixed(2)}<br>`;
                content += `Pitch: ${player.pitch.toFixed(2)}<br>`;
            }
        }
        
        // Add input state info
        if (window.inputState) {
            content += `<br>Input:<br>`;
            content += `W: ${window.inputState.keys.w}, `;
            content += `A: ${window.inputState.keys.a}, `;
            content += `S: ${window.inputState.keys.s}, `;
            content += `D: ${window.inputState.keys.d}<br>`;
            content += `Space: ${window.inputState.keys.space}, `;
            content += `Q: ${window.inputState.keys.q}, `;
            content += `E: ${window.inputState.keys.e}<br>`;
            content += `Mouse: x=${window.inputState.mouseDelta.x.toFixed(0)}, y=${window.inputState.mouseDelta.y.toFixed(0)}`;
        }
        
        debugOverlay.innerHTML = content;
    };
    
    // Toggle debug mode with F1 key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            window.DEBUG = !window.DEBUG;
            console.log("Debug mode:", window.DEBUG ? "ON" : "OFF");
        }
    });
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

// Add decorative objects to the scene
function addDecorativeObjects() {
    debug('Decorative objects function - disabled client-side instantiation');
    
    try {
        // COMMENTED OUT: Client-side decorative object creation
        /*
        debug('Adding decorative objects');
        
        // Add multiple trees scattered around
        for (let i = 0; i < 20; i++) {
            // Randomize positions but keep away from center
            const distance = 15 + Math.random() * 30;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create tree
            createTree(x, 0, z);
        }
        
        // Add some rocks
        for (let i = 0; i < 15; i++) {
            // Randomize positions
            const distance = 10 + Math.random() * 40;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create rock
            createRock(x, 0, z);
        }
        */
        
        debug('Decorative objects: Waiting for server-driven creation');
    } catch (error) {
        debug(`Error in decorative objects function: ${error.message}`, true);
    }
}

// Helper function to create a tree
function createTree(x, y, z) {
    // Function kept for server-driven object creation
    // But not called directly from client-side initialization
    
    // Create tree trunk (cylinder)
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 2.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    // Create tree top (cone for evergreen tree)
    const topGeometry = new THREE.ConeGeometry(2, 6, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228822 }); // Green
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(x, y + 6, z);
    top.castShadow = true;
    top.receiveShadow = true;
    scene.add(top);
}

// Helper function to create a rock
function createRock(x, y, z) {
    // Function kept for server-driven object creation
    // But not called directly from client-side initialization
    // Randomly scale the rock
    const scale = 0.5 + Math.random() * 1.5;
    
    // Create irregular rock shape using a scaled sphere
    const rockGeometry = new THREE.SphereGeometry(1, 6, 4);
    
    // Randomly deform vertices to make it look more like a rock
    const vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const y = vertices.getY(i);
        const z = vertices.getZ(i);
        
        // Apply random offset to vertex
        vertices.setX(i, x + (Math.random() - 0.5) * 0.3);
        vertices.setY(i, y + (Math.random() - 0.5) * 0.3);
        vertices.setZ(i, z + (Math.random() - 0.5) * 0.3);
    }
    
    // Update normals after vertex modification
    rockGeometry.computeVertexNormals();
    
    // Create rock material with random gray shade
    const grayShade = 0.4 + Math.random() * 0.3;
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(grayShade, grayShade, grayShade),
        roughness: 0.9,
        metalness: 0.1
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.scale.set(scale, scale * 0.7, scale);
    rock.position.set(x, y + (scale * 0.35), z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}
