/**
 * 3D AI Game Platform - AABB Collision System
 * Uses Axis-Aligned Bounding Boxes for efficient collision detection
 */

class CollisionSystem {
    constructor() {
        // Collection of collidable objects
        this.collidableObjects = [];
        this.debugMode = false; // Set to true to see debug logging
    }

    // Initialize collision system and collect collidable objects from the scene
    init(scene) {
        console.log("Initializing collision system...");
        this.collidableObjects = [];
        
        // Traverse the scene to find all collidable objects
        scene.traverse((object) => {
            if (object.isMesh && object.userData && object.userData.collidable === true) {
                this.collidableObjects.push(object);
                if (this.debugMode) console.log(`Added collidable object: ${object.name || 'unnamed object'}`);
            }
        });
        
        console.log(`Collision system initialized with ${this.collidableObjects.length} collidable objects`);
        return this.collidableObjects.length;
    }

    // Add a single object to the collidable objects list
    addCollidableObject(object) {
        if (!object || !(object.isMesh || object.isGroup)) return;
        
        // Mark the object as collidable
        object.userData = object.userData || {};
        object.userData.collidable = true;
        
        // Add a name if it doesn't have one for easier debugging
        if (!object.name) {
            object.name = `collidable_${this.collidableObjects.length}`;
        }
        
        // Only add if not already in the list
        if (!this.collidableObjects.includes(object)) {
            this.collidableObjects.push(object);
            if (this.debugMode) console.log(`Added collidable object: ${object.name}`);
            
            // If it's a group, also make all children collidable
            if (object.isGroup && object.children) {
                object.children.forEach(child => {
                    if (child.isMesh) {
                        child.userData = child.userData || {};
                        child.userData.collidable = true;
                        this.collidableObjects.push(child);
                        if (this.debugMode) console.log(`Added child collidable object: ${child.name || 'unnamed child'}`);
                    }
                });
            }
        }
    }

    // Create or update a bounding box for a mesh
    updateAABB(mesh) {
        if (!mesh) return null;
        
        // Use Three.js Box3 to create a bounding box from the mesh
        const box = new THREE.Box3().setFromObject(mesh);
        return box;
    }

    // Check if two bounding boxes intersect
    checkCollision(boxA, boxB) {
        if (!boxA || !boxB) return false;
        return boxA.intersectsBox(boxB);
    }

    // Get the minimum translation vector to resolve a collision
    getCollisionResponse(boxA, boxB) {
        // Create a box that represents the intersection
        const intersection = new THREE.Box3();
        intersection.copy(boxA).intersect(boxB);
        
        // Get the size of the intersection
        const size = intersection.getSize(new THREE.Vector3());
        
        // Find the minimum penetration axis (x, y, or z)
        let axis, minSize;
        
        if (size.x <= size.y && size.x <= size.z) {
            axis = 'x';
            minSize = size.x;
        } else if (size.y <= size.x && size.y <= size.z) {
            axis = 'y';
            minSize = size.y;
        } else {
            axis = 'z';
            minSize = size.z;
        }
        
        // Return the direction and amount to move
        const response = {
            axis: axis,
            depth: minSize,
            direction: new THREE.Vector3()
        };
        
        // Calculate the direction to move (away from the obstacle)
        const centerA = boxA.getCenter(new THREE.Vector3());
        const centerB = boxB.getCenter(new THREE.Vector3());
        
        if (axis === 'x') {
            response.direction.x = centerA.x < centerB.x ? -1 : 1;
        } else if (axis === 'y') {
            response.direction.y = centerA.y < centerB.y ? -1 : 1;
        } else {
            response.direction.z = centerA.z < centerB.z ? -1 : 1;
        }
        
        return response;
    }

    // Check collisions for the player against all collidable objects
    checkPlayerCollisions(playerMesh, controlsObject) {
        if (!playerMesh || !controlsObject || this.collidableObjects.length === 0) {
            return { collision: false, grounded: false };
        }
        
        // Update player bounding box
        const playerBox = this.updateAABB(playerMesh);
        let hasCollision = false;
        let isGrounded = false;
        
        // Check against all collidable objects
        for (const obstacle of this.collidableObjects) {
            // Skip player's own mesh
            if (obstacle === playerMesh) continue;
            
            const obstacleBox = this.updateAABB(obstacle);
            if (this.checkCollision(playerBox, obstacleBox)) {
                hasCollision = true;
                if (this.debugMode) console.log(`Collision detected with ${obstacle.name || 'unnamed object'}`);
                
                // Handle the collision and check if we're standing on something
                const collisionResult = this.handleCollision(playerBox, obstacleBox, controlsObject);
                if (collisionResult.landedOnTop) {
                    isGrounded = true;
                }
            }
        }
        
        return { collision: hasCollision, grounded: isGrounded };
    }

    // Apply collision response and return collision info
    handleCollision(playerBox, obstacleBox, controlsObject) {
        const response = this.getCollisionResponse(playerBox, obstacleBox);
        
        // Apply a small buffer to prevent getting stuck
        const buffer = 0.1;
        let landedOnTop = false;
        
        // Apply the collision response to the controls object
        if (response.axis === 'x') {
            controlsObject.position.x += (response.depth + buffer) * response.direction.x;
        } else if (response.axis === 'y') {
            // For Y-axis collisions, we need to determine if we landed on top
            if (response.direction.y > 0) {
                // We hit the bottom of something
                controlsObject.position.y += (response.depth + buffer) * response.direction.y;
            } else {
                // We landed on top of something
                controlsObject.position.y += (response.depth + buffer) * response.direction.y;
                landedOnTop = true;
                
                // Stop any downward velocity if we're using physics
                if (controlsObject.userData && controlsObject.userData.velocity) {
                    controlsObject.userData.velocity.y = 0;
                }
            }
        } else {
            controlsObject.position.z += (response.depth + buffer) * response.direction.z;
        }
        
        return { landedOnTop };
    }

    // Mark objects in the scene as collidable
    markAllObjectsAsCollidable(scene) {
        scene.traverse(object => {
            // Skip the player, camera, lights, and ground
            if (object.name === 'ground' || 
                object.name === 'player' || 
                object.isLight || 
                object.isCamera) {
                return;
            }
            
            // Mark all meshes that aren't the player, lights, or ground as collidable
            if (object.isMesh) {
                object.userData = object.userData || {};
                object.userData.collidable = true;
                
                // Add it to our collidable objects array if not already there
                if (!this.collidableObjects.includes(object)) {
                    this.collidableObjects.push(object);
                    if (this.debugMode) console.log(`Auto-marked as collidable: ${object.name || 'unnamed mesh'}`);
                }
            }
        });
        
        console.log(`Total collidable objects after auto-marking: ${this.collidableObjects.length}`);
    }

    // Set debug mode
    setDebugMode(debug) {
        this.debugMode = debug;
    }
}

// Create and export a singleton instance
const collisionSystem = new CollisionSystem();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
    window.collisionSystem = collisionSystem;
}

if (typeof module !== 'undefined') {
    module.exports = { CollisionSystem, collisionSystem };
} 