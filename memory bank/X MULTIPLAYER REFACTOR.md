Revised Implementation Plan to Ensure Server Authority and Enable Server-Coordinated Player Movement

# PRIMARY GOAL: GET A WORKING PROTOTYPE WHERE PLAYERS CAN RUN AROUND AND SEE OTHER PLAYERS

## Overview
The goal is to ensure the server (via Colyseus) has full authority over all player positions, and the client only sends inputs and renders based on server state. We'll focus on implementing this core functionality first to create a minimal viable prototype where players can move around and see each other.

## Implementation Steps (Prioritized for Working Prototype)

### Step 1: Implement Input State Handling in Client
Goal: Convert client movement from direct position updates to input state transmission.

Files to Modify:
- client/js/controls.js
- client/js/main-fixed.js

Implementation:
1. In controls.js, create an input state object that tracks key presses and mouse movements:
```javascript
// In controls.js - Add at the top of the file
window.inputState = {
  keys: { w: false, a: false, s: false, d: false, space: false },
  mouseDelta: { x: 0, y: 0 }
};

// Update key handlers to set inputState
function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      window.inputState.keys.w = true;
      window.moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      window.inputState.keys.a = true;
      window.moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      window.inputState.keys.s = true;
      window.moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      window.inputState.keys.d = true;
      window.moveRight = true;
      break;
    case 'Space':
      window.inputState.keys.space = true;
      if (window.canJump) {
        window.velocity.y = Math.sqrt(window.jumpHeight * 2 * 9.8);
        window.canJump = false;
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      window.inputState.keys.w = false;
      window.moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      window.inputState.keys.a = false;
      window.moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      window.inputState.keys.s = false;
      window.moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      window.inputState.keys.d = false;
      window.moveRight = false;
      break;
    case 'Space':
      window.inputState.keys.space = false;
      break;
  }
}

// Add mouse movement tracking
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement) {
    window.inputState.mouseDelta.x += event.movementX;
    window.inputState.mouseDelta.y += event.movementY;
  }
});
```

2. In main-fixed.js, add code to send input state to the server periodically:
```javascript
// In main-fixed.js - Add within the init() function after networking is initialized
function sendInputUpdates() {
  if (window.room && window.inputState) {
    window.room.send("input", window.inputState);
    
    // Reset mouse delta after sending
    window.inputState.mouseDelta.x = 0;
    window.inputState.mouseDelta.y = 0;
  }
}

// Set up input sending interval (30Hz)
setInterval(sendInputUpdates, 1000 / 30);
```

### Step 2: Update Server to Process Input States
Goal: Make the server calculate player positions based on input states.

File to Modify:
- server.js

Implementation:
1. Add input state handling to the server:
```javascript
// In server.js - Add to Player schema
class Player extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 1;
    this.z = 5;
    this.value = 1;
    this.rotationY = 0;
    this.pitch = 0;
    this.operator = null;
    this.color = "#FFFFFF";
    this.name = "";
    this.velocityY = 0;
    this.input = null;
  }
}

// Register input as a schema type
type("*")(Player.prototype, "input");  // Using * type for the complex object

// In onCreate method, add input message handler
this.onMessage("input", (client, input) => {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    player.input = input;
  }
});
```

2. Process inputs in the update method:
```javascript
// In server.js - Update the update() method
update() {
  // Calculate delta time (assuming 30fps if not available)
  const deltaTime = 1/30;
  const speed = 5.0 * deltaTime;
  
  // Process player inputs
  this.state.players.forEach((player, sessionId) => {
    if (player.input) {
      // Handle rotation from mouse movement
      const sensitivity = 0.002;
      player.rotationY += (player.input.mouseDelta?.x || 0) * sensitivity;
      player.pitch += (player.input.mouseDelta?.y || 0) * sensitivity;
      player.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.pitch));
      
      // Handle movement
      let dx = 0, dz = 0;
      if (player.input.keys.w) {
        dx += Math.sin(player.rotationY) * speed;
        dz += Math.cos(player.rotationY) * speed;
      }
      if (player.input.keys.s) {
        dx -= Math.sin(player.rotationY) * speed;
        dz -= Math.cos(player.rotationY) * speed;
      }
      if (player.input.keys.a) {
        dx += Math.sin(player.rotationY - Math.PI/2) * speed;
        dz += Math.cos(player.rotationY - Math.PI/2) * speed;
      }
      if (player.input.keys.d) {
        dx += Math.sin(player.rotationY + Math.PI/2) * speed;
        dz += Math.cos(player.rotationY + Math.PI/2) * speed;
      }
      
      // Apply movement
      player.x += dx;
      player.z += dz;
      
      // Handle jumping
      if (player.input.keys.space && player.y === 1) {
        player.velocityY = 0.2; // Jump velocity
      }
      
      // Apply gravity
      player.velocityY += -0.01; // Simple gravity
      player.y += player.velocityY;
      
      // Floor collision
      if (player.y < 1) {
        player.y = 1;
        player.velocityY = 0;
      }
    }
  });
  
  // Continue with existing operator spawning code
  this.spawnTimer += deltaTime;
  if (this.spawnTimer >= this.spawnInterval && Object.keys(this.state.operators).length < this.maxOperators) {
    this.spawnOperator();
    this.spawnTimer = 0;
    this.spawnInterval = this.getRandomSpawnInterval();
  }
}
```

### Step 3: Update Client Rendering Based on Server State
Goal: Render player positions from server data only.

File to Modify:
- client/js/main-fixed.js

Implementation:
```javascript
// In main-fixed.js - Modify the animate function
function animate() {
  requestAnimationFrame(animate);
  
  // Get current player state from server
  if (window.room && window.room.state && window.room.state.players) {
    const player = window.room.state.players.get(window.room.sessionId);
    
    if (player && playerNumberblock && playerNumberblock.mesh) {
      // Update local player position and rotation based on server state
      playerNumberblock.mesh.position.lerp(new THREE.Vector3(player.x, player.y, player.z), 0.3);
      playerNumberblock.mesh.rotation.y = player.rotationY;
      
      // Update camera based on view mode
      if (window.isFirstPerson) {
        camera.position.set(player.x, player.y + 1.6, player.z);
        camera.rotation.x = player.pitch;
        camera.rotation.y = player.rotationY;
        playerNumberblock.mesh.visible = false;
      } else {
        // Third-person camera
        const offset = new THREE.Vector3(0, 2, 5)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
        camera.position.set(player.x + offset.x, player.y + offset.y, player.z + offset.z);
        camera.lookAt(player.x, player.y, player.z);
        playerNumberblock.mesh.visible = true;
      }
      
      // Update player value if needed
      if (player.value !== playerNumberblock.value) {
        playerNumberblock.setValue(player.value);
      }
    }
  }
  
  // Render scene
  renderer.render(scene, camera);
}
```

### Step 4: Add Basic Debug Tools (Optional - Only if problems arise)
Goal: Implement minimal debug tools to help with troubleshooting.

File to Create:
- client/js/debug.js

Implementation:
```javascript
// Debug flag - set to true during development, false in production
window.DEBUG = false;

// Debug logging function
window.debugLog = function(...args) {
  if (window.DEBUG) console.log(...args);
};

// Toggle debug mode with F1 key
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') {
    window.DEBUG = !window.DEBUG;
    console.log("Debug mode:", window.DEBUG ? "ON" : "OFF");
  }
});

// Create debug overlay
const debugOverlay = document.createElement('div');
debugOverlay.style.position = 'absolute';
debugOverlay.style.top = '10px';
debugOverlay.style.left = '10px';
debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
debugOverlay.style.color = 'white';
debugOverlay.style.padding = '10px';
debugOverlay.style.fontFamily = 'monospace';
debugOverlay.style.fontSize = '12px';
debugOverlay.style.display = 'none';
document.body.appendChild(debugOverlay);

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
    content += `Mouse: x=${window.inputState.mouseDelta.x.toFixed(0)}, y=${window.inputState.mouseDelta.y.toFixed(0)}`;
  }
  
  debugOverlay.innerHTML = content;
};

// Call updateDebugOverlay in the animation loop
```

## Progress Tracking

### Completed Items
✅ Updated implementation plan to focus on minimal viable prototype
✅ Outlined critical steps needed for server authority
✅ Removed redundant network.js references
✅ Prepared code snippets for immediate implementation

### Next Steps
🔲 Implement input state handling in client (controls.js, main-fixed.js)
🔲 Update server to process inputs and calculate positions
🔲 Modify client rendering to use server state
🔲 Test multiplayer movement with multiple browsers
🔲 Add debug tools if problems arise during testing

### Testing Checklist
🔲 Single player can move around with server-calculated position
🔲 Multiple players can see each other moving
🔲 Camera works in both first-person and third-person views
🔲 Player position stays synchronized across clients
🔲 Rotations and jumping work correctly
