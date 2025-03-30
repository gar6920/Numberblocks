// Default Implementation - Player class
// Loads a static GLB model

class DefaultPlayer extends Player {
    constructor(params = {}) {
        super(params); // Pass params up to parent Player class
        
        // Ensure scene is passed
        if (!params || !params.scene) {
            console.error("[DefaultPlayer] requires 'scene' in params!");
            return;
        }
        this.scene = params.scene;
        
        // Use color from params, gameConfig, or fallback to default blue
        this.color = params.color || 
                     (window.gameConfig && window.gameConfig.playerSettings.playerColor) || 
                     new THREE.Color(0x007bff); // Fallback color

        this.modelLoaded = false;

        // Animation properties
        this.mixer = null;
        this.animations = new Map(); // Store animations by name
        this.activeAction = null;

        // Create initial placeholder mesh synchronously
        this.mesh = this.createMesh(); 

        // Call async method to load the actual model
        this.loadModelAsync(); // Start loading the actual model asynchronously
        console.log(`[DefaultPlayer ${this.id}] Constructor finished. Placeholder mesh created. Starting async model load.`);
    }
    
    // Create an invisible placeholder mesh (Group)
    createMesh() {
        console.log(`[DefaultPlayer ${this.id}] createMesh called. Creating invisible placeholder.`);
        const placeholder = new THREE.Group(); // Use a Group as a container
        placeholder.userData.entity = this; // Link mesh back to entity
        if (this.position) { // Ensure position exists (from Entity constructor)
            placeholder.position.copy(this.position); // Set initial position
        } else {
            console.warn("[DefaultPlayer] this.position not set when creating placeholder!");
        }
        placeholder.visible = false; // Make it invisible initially
        return placeholder;
    }

    // Asynchronously load the GLB model and replace the placeholder
    async loadModelAsync() {
        if (this.modelLoaded) return; // Don't load if already loaded

        console.log(`[DefaultPlayer ${this.id}] Loading model for player: ${this.id}...`);
        console.log(`[DefaultPlayer ${this.id}] Calling loadModelAsync...`);

        // Ensure GLTFLoader is available
        if (!THREE.GLTFLoader) {
            console.error("[DefaultPlayer] THREE.GLTFLoader is not loaded. Make sure it's included in index.html.");
            return;
        }

        if (!this.scene) {
            console.error("[DefaultPlayer] Scene not available for loading model.");
            return;
        }
        
        const loader = new THREE.GLTFLoader(); // Use GLTFLoader
        const modelPath = window.gameConfig?.playerSettings?.playerModelPath;
        
        if (!modelPath) {
            console.error("[DefaultPlayer] Player model path not defined in gameConfig.playerSettings.playerModelPath");
            return;
        } else {
            console.log(`[DefaultPlayer ${this.id}] Model path configured: ${modelPath}`);
        }

        try {
            console.log(`[DefaultPlayer ${this.id}] Attempting to load model via GLTFLoader...`);
            const gltf = await loader.loadAsync(modelPath);
            console.log(`[DefaultPlayer ${this.id}] GLTFLoader.loadAsync successful. Loaded GLTF object:`, gltf);

            // The main mesh/model is in gltf.scene
            const newMesh = gltf.scene;
            newMesh.userData.entity = this; // Link entity back

            // Configure the loaded model (scale, shadows, etc.)
            // ** Adjust scale as needed ** - GLB might need different scaling
            newMesh.scale.set(1.0, 1.0, 1.0); // Adjust scale if needed for GLB
            newMesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    console.log(`[DefaultPlayer ${this.id}] Enabled shadows for child mesh:`, child.name);
                }
            });

            // Set initial position and rotation based on entity state
            newMesh.position.copy(this.position);
            newMesh.rotation.set(0, this.rotationY, 0); // Assuming Y is the vertical axis

            // --- Animation Setup ---
            console.log(`[DefaultPlayer ${this.id}] --- Entering Animation Setup ---`); 
            // Animations are directly available in gltf.animations
            if (gltf.animations && gltf.animations.length > 0) {
                console.log(`[DefaultPlayer ${this.id}] Animation array exists and has length: ${gltf.animations.length}`); 
                console.log(`[DefaultPlayer ${this.id}] Found ${gltf.animations.length} animations. Names:`); 
                this.mixer = new THREE.AnimationMixer(newMesh); // Mixer uses the scene graph root

                gltf.animations.forEach(clip => {
                    console.log(`  - Name: ${clip.name}`); 
                    const action = this.mixer.clipAction(clip);
                    this.animations.set(clip.name, action); 
                    console.log(`[DefaultPlayer ${this.id}] Storing animation clip: ${clip.name}`);
                });

                // Attempt to play a default animation (e.g., 'Idle')
                // Make sure your GLB export has an animation named 'Idle' or adjust this
                const defaultAnimationName = 'Idle'; // Or 'idle', check the GLB export
                console.log(`[DefaultPlayer ${this.id}] Attempting to play default animation: ${defaultAnimationName}`); 
                if (this.animations.has(defaultAnimationName)) {
                    this.playAnimation(defaultAnimationName);
                } else if (gltf.animations.length > 0) {
                    // Fallback to the first animation if 'Idle' is not found
                    const fallbackAnimName = gltf.animations[0].name;
                    console.warn(`[DefaultPlayer ${this.id}] Default animation '${defaultAnimationName}' not found. Falling back to first animation: '${fallbackAnimName}'`);
                    this.playAnimation(fallbackAnimName);
                } else {
                    console.warn(`[DefaultPlayer ${this.id}] Could not determine default animation name and no animations found.`);
                }

            } else {
                console.log(`[DefaultPlayer ${this.id}] Animation array condition failed. Animations:`, gltf.animations); 
                console.log(`[DefaultPlayer ${this.id}] No animations found in the loaded model.`);
            }
            console.log(`[DefaultPlayer ${this.id}] --- Exiting Animation Setup ---`); 
            // --- End Animation Setup ---

            // --- Swap Mesh in Scene --- 
            // Remove placeholder if it exists and is in the scene
            if (this.mesh && this.scene && this.scene.getObjectById(this.mesh.id)) {
                this.scene.remove(this.mesh);
                console.log(`[DefaultPlayer ${this.id}] Removed placeholder mesh for player: ${this.id}`);
            }

            // Add the loaded model to the scene
            if (this.scene) {
                this.scene.add(newMesh);
                console.log(`[DefaultPlayer ${this.id}] Loaded model added to scene.`);
            } else {
                console.error(`[DefaultPlayer ${this.id}] Scene object not available when adding model for player: ${this.id}`);
            }
            // --- End Swap Mesh --- 

            // Update the entity's mesh reference *after* adding new mesh
            this.mesh = newMesh;
            this.modelLoaded = true;

            // Set visibility based on player type and view mode
            this.updateVisibility();
            console.log(`[DefaultPlayer ${this.id}] Visibility updated. Current mesh visibility: ${this.mesh.visible}`);
            console.log(`[DefaultPlayer ${this.id}] Model setup complete for player: ${this.id}`);

        } catch (error) {
            console.error(`[DefaultPlayer ${this.id}] Error during GLTFLoader.loadAsync or processing:`, error);
            // Ensure placeholder is still added if loading fails, but keep it invisible
            if (this.mesh && this.scene && !this.scene.getObjectById(this.mesh.id)) {
                this.scene.add(this.mesh); // Add the invisible placeholder
                console.log(`[DefaultPlayer ${this.id}] Added invisible placeholder mesh due to load error for player: ${this.id}`);
            }
        }
    }

    // Function to play a specific animation
    playAnimation(name) {
        console.log(`[DefaultPlayer ${this.id}] Attempting to play animation: ${name}`);
        const newAction = this.animations.get(name);
        if (!newAction) {
            console.warn(`[DefaultPlayer ${this.id}] Animation '${name}' not found.`);
            return;
        }

        if (this.activeAction === newAction) {
            console.log(`[DefaultPlayer ${this.id}] Animation '${name}' is already active.`);
            return; // Don't restart if already playing
        }

        if (this.activeAction) {
            this.activeAction.fadeOut(0.5); // Smoothly fade out the old action
        }

        newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.5).play();
        this.activeAction = newAction;
        console.log(`[DefaultPlayer ${this.id}] Started playing animation: ${name}`);
    }

    // Override update to include mixer update
    update(deltaTime) {
        super.update(deltaTime); // Call base update if needed

        // Update the animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
            // console.log(`[DefaultPlayer ${this.id}] Mixer updated with deltaTime: ${deltaTime}`); // DEBUG - uncomment if needed
        }
    }

    // Override update function for any player-specific logic
    // update(deltaTime) {
    //     // Any default player-specific update logic goes here
    //     // (Animations would be updated here later)
        
    //     // Always call the parent update function
    //     // This handles position updates based on this.position, this.rotationY etc.
    //     super.update(deltaTime);
    // }

    updateVisibility() {
        // Make sure mesh exists before trying to set visibility
        if (!this.mesh) return;

        // Important: If this is the local player in first-person view,
        // make the mesh invisible.
        if (this.isLocalPlayer && window.viewMode === 'firstPerson') {
            console.log("[DefaultPlayer] Setting mesh invisible for local player in first-person view.")
            this.mesh.visible = false;
        } else {
            // Otherwise, ensure it's visible (for remote players or non-first-person views)
            this.mesh.visible = true;
        }
    }
}

// Register this class with the entity factory if available
if (window.entityFactory) {
    window.entityFactory.registerType('defaultPlayer', DefaultPlayer);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DefaultPlayer = DefaultPlayer;
}

if (typeof module !== 'undefined') {
    module.exports = { DefaultPlayer };
}