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

    window.updateControls(controls, delta);

    if (window.myPlayer && window.myPlayer.mesh && window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            window.myPlayer.mesh.position.set(playerState.x, playerState.y, playerState.z);
            window.myPlayer.mesh.rotation.y = playerState.rotationY;

            if (window.isFirstPerson) {
                controls.getObject().position.set(playerState.x, playerState.y + window.playerHeight, playerState.z);
                camera.rotation.x = playerState.pitch;
                controls.getObject().rotation.y = playerState.rotationY;
                window.myPlayer.mesh.visible = false;
            } else {
                const offset = new THREE.Vector3(0, window.playerHeight + 2, window.thirdPersonCameraDistance);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerState.rotationY);
                const desiredPos = new THREE.Vector3(playerState.x, playerState.y, playerState.z).add(offset);
                camera.position.lerp(desiredPos, 0.1);
                camera.lookAt(window.myPlayer.mesh.position);
                window.myPlayer.mesh.visible = true;
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
    if (window.room && window.inputState) {
        window.room.send('input', {
            keys: window.inputState.keys,
            mouseDelta: window.inputState.mouseDelta,
            viewMode: window.isFirstPerson ? "first-person" : "third-person"
        });

        window.inputState.mouseDelta.x = 0;
        window.inputState.mouseDelta.y = 0;
    }
}

setInterval(sendInputUpdate, 1000 / 30);
