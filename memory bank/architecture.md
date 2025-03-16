Root
├── index.html
├── package.json
├── README.md
├── assets
│   ├── images
│   ├── models
│   └── sounds
├── css
│   └── styles.css
├── js
│   ├── main.js
│   ├── controls.js
│   ├── numberblock.js
│   ├── player.js
│   ├── operators.js
│   ├── network.js
│   ├── hud.js
│   ├── gameModes.js
│   └── operator.js
└── lib
    └── three.min.js

    Explanation of the Structure
Root: The top-level directory containing essential project files:
index.html: The main HTML file that serves as the entry point for your application or game.

package.json: (Optional) A file for managing project dependencies if you're using Node.js or a package manager like npm.

README.md: A Markdown file for project documentation, instructions, and notes.

assets/: A folder for all static resources:
images/: Stores image files like textures, icons, or sprites.

models/: Holds 3D model files (if applicable, e.g., for a 3D game).

sounds/: Contains audio files such as sound effects or background music.

css/: A folder for styling:
styles.css: The primary CSS file for styling your UI, HUD, or other visual elements.

js/: A folder for all JavaScript files, each serving a specific purpose:
main.js: The core script that initializes the project (e.g., sets up the scene or game loop).

controls.js: Handles user input and controls (e.g., keyboard or mouse events). Features:
  - Robust fallback mechanisms for browser API compatibility
  - First-person camera controls with parent-child hierarchy for proper rotation
  - Separated yaw and pitch rotations for natural camera movement
  - Mouse locking within the game window with proper cursor disengagement
  - Event handler management for clean switching between locked/unlocked states
  - Support for WASD/Arrow keys movement and spacebar jumping

numberblock.js: Implements the Numberblock class for creating and managing Numberblock entities. Features:
  - Dynamic creation of block stacks based on numeric value
  - Face rendering with eyes and mouth on the top block
  - Arms with hands on the sides of blocks
  - Feet on the bottom block
  - Number tag display on top of the stack
  - Color mapping based on Numberblocks TV show aesthetics
  - HTML/CSS overlay for number display
  - Methods for updating and animating Numberblocks

player.js: Manages player-related logic (e.g., movement, health).

operators.js: Contains logic for operators or game entities (e.g., enemies, NPCs).

network.js: Implements networking features (e.g., multiplayer via WebSockets).

hud.js: Updates the heads-up display (e.g., score, health bar).

gameModes.js: Defines different game modes or rules.

operator.js: Manages operator-related logic (e.g., spawning, lifecycle).

lib/: A folder for external libraries:
three.min.js: The minified Three.js library for 3D rendering (you can add other libraries here as needed).

memory bank/: A folder for documentation and development notes:
implementation plan: Detailed steps for implementing the game features.
progress.md: Tracks completed steps and progress notes.
RULES.md: Contains development guidelines and best practices.
architecture.md: 
# Numberblocks Game Architecture

## Core Components

### 1. Scene Management (main.js)
- Scene initialization and setup
- Camera configuration
- Lighting setup
- Animation loop
- Asset loading
- Proper initialization order:
  1. Scene, camera, renderer setup
  2. Ground and environment
  3. Player Numberblock creation
  4. Operator system initialization
  5. Controls initialization

### 2. Controls System (controls.js)
- First-person camera controls using PointerLockControls
- Third-person camera controls with configurable distance and height
- Toggle between first-person and third-person views (V key)
- Movement handling (WASD/Arrow keys)
  - W = Forward movement
  - S = Backward movement
  - A = Strafe left
  - D = Strafe right
- Rotation controls (Q/E keys)
  - Q = Turn left (counter-clockwise)
  - E = Turn right (clockwise)
- Jump mechanics (Spacebar)
- Gravity and ground collision
- Fallback controls for environments without Pointer Lock
- Delta time-based smooth movement
- Debug logging for control states

### 3. Numberblock System (numberblock.js)
#### Visual Components
- Stacked blocks based on numeric value
- Color-coded blocks following Numberblocks scheme
- Face on top block with eyes and mouth
- Arms on middle or second block
- Feet on bottom block
- No number display (shown in HUD instead)

#### Positioning System
- Base Y-position calculated from block size
- Consistent ground-level placement
- Proper collision boundaries
- Random placement with spawn area restrictions

### 4. Operator System (operator.js)
#### Visual Design
- Floating semi-transparent spheres
- Clear plus/minus symbols
- Color-coded feedback (green/red)
- Soft glow effect for visibility

#### Behavior
- Face camera for constant visibility
- Gentle floating animation
- Spawn randomly in valid areas
- Limited to maximum count
- Clear pickup and application feedback

## HUD System
The game features a minimalist HUD with two key elements:
1. Number Display (Top-Left)
   - Shows current Numberblock value
   - Color changes to match Numberblock color scheme
   - Uses semi-transparent background for visibility
   - Updates in real-time with player changes

2. Operator Display (Top-Right)
   - Shows current held operator ("+ Add" or "- Subtract")
   - Green for addition, red for subtraction
   - Shows "No operator" when none held
   - Semi-transparent background for visibility

## World System
- Large 200x200 unit ground plane
- Distributed landscape elements (120 decorative objects)
- Strategic landmarks with 40 trees for navigation
- Safe spawn area with buffer zone
- Ample exploration space for mathematical discoveries

## File Structure
```
/
├── index.html          # Main HTML file
├── js/
│   ├── main.js        # Main game logic
│   ├── controls.js    # Movement and camera controls
│   ├── numberblock.js # Numberblock implementation
│   └── operator.js    # Operator system
├── css/
│   └── style.css      # Game styles
└── memory bank/
    ├── progress.md    # Implementation progress
    └── architecture.md # This file
```

## Initialization Flow
1. Load Three.js and custom scripts
2. Initialize WebGL renderer
3. Create scene and setup lighting
4. Create ground and environment
5. Initialize player Numberblock
6. Setup operator system
7. Initialize controls
8. Start animation loop

## Control Flow
1. User input captured via event listeners
2. Movement state updated
3. Controls updated in animation loop
4. Player position updated based on active view mode:
   - First-person: Player follows camera position
   - Third-person: Camera follows player with configurable offset
5. Numberblock follows player position
6. Scene rendered
7. Collision detection checks performed
8. Operator interactions processed
9. HUD information updated to reflect current state
10. Camera position dynamically adjusted based on Numberblock size

## Implemented Components
- Collision system for detecting Numberblock-to-Numberblock collisions
- Operator application mechanics for mathematical operations
- Operator pickup and attachment to Numberblock's hand
- Number operations via bumping interaction (plus/minus)
- Visual number updating with dynamic reconstruction
- Heads-up display (HUD) showing current player number
- Dynamic camera positioning system that adjusts based on Numberblock height
- Transparent materials for better visual presentation

## Future Components
- UI system
- Score tracking
- Game state management
- Multiple interactive Numberblocks
- More complex mathematical operations
