# 3D AI Game Platform - Architecture

## Overview
3D AI Game is a modular 3D web-based game platform built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable characters and interact with a colorful 3D environment. The platform is designed to support various game implementations.

## Core Components

### 1. Server (server/core/server.js)
**Technology:** Built with Node.js and Colyseus.

**Responsibilities:**
- Manages game rooms and player connections/disconnections
- Maintains the authoritative game state
- Processes player inputs (e.g., movement, collisions)
- Broadcasts state updates to all connected clients
- Handles entity spawning and lifecycle management
- Supports dynamic implementation selection via command-line arguments or environment variables
- Validates and manages structure placement in the building system

**Key Features:**
- Room-based multiplayer with session persistence
- State synchronization using Colyseus schema
- Server-authoritative position tracking
- Dynamic entity spawning system
- Runtime implementation switching based on user selection
- Server-validated building placement system

### 2. Client Core Platform (/client/js/core)
The core platform provides foundational functionality that all game implementations can leverage.

**Key components:**
- **main.js:**
  - Entry point for client-side code
  - Loads core modules and initializes the game engine
  - Sets up default player factory

- **controls.js:**
  - Handles player movement and camera controls
  - Supports first-person, third person, and free roam view modes
  - Manages input handling for keyboard and mouse
  - Implements quaternion-based rotation for smooth camera movement

- **game-engine.js:**
  - Initializes the Three.js scene, renderer, and camera
  - Sets up player controls and world objects
  - Manages the animation loop for continuous rendering
  - Implements four distinct camera systems:
    - First-person view: Camera attached to player's head position
    - Third-person view: Camera follows behind player with intelligent rotation alignment
    - Free camera mode: Independent camera with WASD/QE movement and mouse look functionality
    - RTS view mode: Top-down strategic view with:
      - WASD for camera panning
      - Q/E for camera height adjustment
      - Click-and-drag box selection
      - Right-click movement commands
      - Visual selection rings and move markers
      - Custom cursor system
  - Handles smooth camera transitions between view modes
  - Maintains proper camera orientation with Euler angles to prevent unwanted roll
  - Implements RTS-specific features:
    - Selection system with single-click and box selection
    - Unit movement commands
    - Visual feedback (selection rings, move markers)
    - Custom cursor management
    - View-specific input handling

- **network-core.js:**
  - Establishes and maintains WebSocket connection to the server via Colyseus
  - Sends player actions to the server
  - Processes state updates from the server
  - Handles player joining/leaving events

- **Entity.js:**
  - Base class for all game entities
  - Provides core entity functionality (position, rotation, scale)
  - Defines interface for entity behaviors
  - Handles common entity lifecycle events

- **Player.js:**
  - Extends Entity for player-specific functionality
  - Manages player state and input handling
  - Provides interface for implementation-specific player behaviors

- **NPC.js:**
  - Extends Entity for non-player characters
  - Implements basic AI behaviors
  - Provides interface for implementation-specific NPC behaviors

- **EntityFactory.js:**
  - Factory pattern for creating entities
  - Registers entity types and their constructors
  - Used by both core platform and game implementations

- **collision.js:**
  - Handles collision detection and resolution
  - Provides interfaces for implementation-specific collision behaviors

- **player-ui.js:**
  - Manages common UI elements for player information
  - Provides hooks for implementation-specific UI components

### 3. Game Implementations (/client/js/implementations and /server/implementations)
Each game implementation extends the core platform with specific gameplay mechanics and visuals.

**Implementation Structure:**
- Client-side implementation code in /client/js/implementations/
- Server-side implementation code in /server/implementations/
- Each implementation folder contains its own set of entities, rooms, and behaviors

**Future Implementations:**
- Will follow similar patterns, extending the core components
- Each implementation will be contained in its own directory
- Will register custom entity factories and behaviors

### 4. Main Engine (game-engine.js)
- Initializes the Three.js scene, renderer, and camera
- Sets up player controls and world objects
- Loads the appropriate game implementation based on configuration
- Manages view modes (first-person, third person, free roam)
- Updates visual components based on server state

### 5. Networking Architecture
**Technology:** Colyseus for WebSocket-based real-time multiplayer.

**Implementation:**
- Server maintains authoritative game state using Colyseus Schema
- Client sends player actions to the server at regular intervals
- Server validates actions, updates game state, and broadcasts to all clients
- Efficient state synchronization with delta updates
- Robust player synchronization with proper sessionId handling
- Smooth interpolation of remote player movements using lerping

**Key Features:**
- Session persistence with reconnection support
- Room-based multiplayer with shared state
- Message-based communication for game events
- Schema-based state synchronization with type annotations
- Player list UI showing all connected players
- Automatic remote player creation and cleanup
- Smooth remote player movement interpolation
- Proper handling of player value updates and mesh recreation
- Resilient error handling for network disconnections
- Automatic cleanup of stale player instances

**Schema Implementation:**
- Proper MapSchema collections for players, operators, and static objects
- Type annotations for all schema properties
- Structured synchronization patterns for consistent state updates
- Robust sessionId tracking for player identification
- Proper player state management with value updates

**Player Synchronization:**
- Automatic creation of remote player instances with proper sessionId tracking
- Smooth position interpolation using Three.js lerping
- Proper cleanup of disconnected player instances
- Value-based mesh updates
- Efficient player collection management using Set data structure
- Proper separation of local and remote player handling
- Resilient error handling for edge cases

### 6. Building System
**Technology:** Three.js for rendering, Colyseus for server-side validation and synchronization.

**Implementation:**
- Server-authoritative structure placement system 
- Client-side preview with real-time validation feedback
- Built on Colyseus Schema for synchronized structure collections
- Toggle between game and building modes with keystroke (B key)
- Grid-based placement with 15° rotation increments (Q/E keys)
- Seamless operation across all camera modes

**Client Components:**
- Building mode UI overlay with structure selection menu
- Structure preview mesh with valid/invalid placement indicators
- Click-to-place functionality with server authorization
- Structure rotation controls (Q/E for 15° increments)
- Cross-camera mode compatibility (first-person, third-person, RTS)
- Interactive grid system for structure placement

**Server Components:**
- Structure schema extending BaseEntity
- Structure collection in GameState
- Server-side collision detection and validation
- Server broadcasting of structure changes to all clients
- Authoritative structure placement confirmation

**Structure Types:**
- Buildings: Base structures with customizable dimensions
- Walls: Thin structures with height/width customization
- Additional types can be added by extending the Structure schema

**Networking Flow:**
1. Client enters building mode and selects structure type
2. Client shows preview mesh at mouse pointer location
3. Client validates placement and shows green/red indicator
4. Client sends placement request to server on valid click
5. Server validates placement and checks for collisions
6. Server creates structure and broadcasts to all clients
7. All clients render the confirmed structure

**Key Features:**
- Complete cross-client synchronization of structures
- Real-time placement validation with visual feedback
- Seamless integration with all camera modes
- Full server authority for all structure placement
- Interactive preview system with structural rotation
- Grid-based placement with customizable sizing

**File Components:**
```
├── server/
│   ├── core/
│   │   ├── BaseRoom.js      # Structure placement handling
│   │   └── schemas/
│   │       ├── Structure.js # Structure schema definition
│   │       └── GameState.js # Structure collection
├── client/
│   └── index.html           # Building UI and client logic
```

## File Structure
```
/
├── package.json            # Node.js dependencies
├── client/                 # Client-side code
│   ├── index.html          # Main HTML file
│   ├── css/                # Stylesheets
│   └── js/                 # JavaScript files
│       ├── core/           # Core platform code
│       │   ├── main.js     # Entry point and module loader
│       │   ├── game-engine.js # Main game engine and rendering
│       │   ├── Entity.js   # Base entity class
│       │   ├── Player.js   # Base player class
│       │   ├── NPC.js      # Base NPC class
│       │   ├── controls.js # Camera and movement controls
│       │   ├── network-core.js # Networking functionality
│       │   ├── collision.js    # Collision detection
│       │   ├── EntityFactory.js # Entity creation factory
│       │   └── player-ui.js    # UI components
│       └── implementations/ # Game-specific client implementations
│           └── default/     # Default implementation
│               └── DefaultPlayer.js # Simple box player
├── server/                 # Server-side code
│   ├── core/               # Core server components
│   │   ├── server.js       # Main server entry point
│   │   ├── index.js        # Core server initialization
│   │   ├── BaseRoom.js     # Base room implementation
│   │   └── schemas/        # All schema definitions
│   │       ├── BaseEntity.js # Base entity schema
│   │       ├── DefaultRoom.js # Default room implementation
│   │       ├── GameState.js  # Game state schema
│   │       ├── Player.js     # Player schema
│   │       ├── InputState.js # Input state schema
│   │       └── GameConfigSchema.js # Game configuration schema
│   └── implementations/    # Server-side implementations
│       └── default/        # Default implementation
│           └── index.js    # Default implementation entry point
├── four_player_setup.html  # HTML for 4-player split-screen setup
├── open_4player_direct.bat # Batch script to launch 4-player mode
└── memory bank/            # Documentation and reference materials
```

## Communication Flow
1. **Initialization:**
   - Server starts and creates a game room
   - Client connects to server and joins the room
   - Server assigns a session ID and initializes player state
   - Client loads the appropriate game implementation

2. **Gameplay Loop:**
   - Client captures user inputs and sends movements that affect player character to server (movements, actions, etc.)
   - Server validates and processes inputs
   - Server updates game state
   - Server broadcasts updated state to all clients
   - Each client renders the updated game state based on its implementation

3. **Interactions:**
   - Client detects local collisions and sends interaction events to server
   - Server validates interaction and updates game state accordingly
   - Server broadcasts the updated state to all clients
   - Each client renders the interaction effects based on its implementation

## Modular Design Approach
The platform is designed with modularity in mind, allowing for different game implementations to share core functionality:

1. **Base Classes:**
   - Core Entity, Player, and NPC classes define common behavior
   - Implementation-specific classes extend these base classes

2. **Factory Pattern:**
   - EntityFactory creates appropriate entity instances based on entity type
   - New implementations register their entity types with the factory

3. **Dependency Injection:**
   - Core components are injected into implementation-specific classes
   - Allows implementations to focus on behavior rather than infrastructure

4. **Interface-Based Design:**
   - Clear interfaces define what implementations must provide
   - Core platform handles common functionality and lifecycle management

## Key Features
- **Triple View Modes:** 
  - First-person view with player model hidden
  - Third-person view with camera following player and aligning with player's facing direction
  - Free roam camera with independent movement and rotation, maintaining proper orientation
- **Camera Controls:**
  - Mouse wheel zoom for third-person view
  - Mouse-based rotation with proper Euler angle handling to prevent camera roll
  - View-specific movement and interaction behaviors
  - Seamless transitions between camera modes
- **Multiplayer Support:** Multiple players can join the same game world
- **Multi-Player Setup:** Supports a 4-player split-screen mode for local multiplayer gameplay
- **Persistence:** Session reconnection support
- **Browser Tab Synchronization:** Automatically updates game state when inactive tabs become active
- **Entity Component System:** Flexible architecture for game entity management
- **Modular Implementation System:** Support for various game types and mechanics
- **RTS View Mode:** Top-down strategic view with:
  - WASD for camera panning
  - Q/E for camera height adjustment
  - Click-and-drag box selection
  - Right-click movement commands
  - Visual selection rings and move markers
  - Custom cursor system
- **Advanced Unit Selection:** Single-click and box selection
- **Unit Movement Commands:** WASD for panning
- **Visual Feedback:** Selection rings, move markers
- **Custom Cursor:** Custom cursor system
- **Mode-Specific Input Handling:** View-specific input handling and UI elements

## Multi-Player Local Setup
The platform supports flexible local multiplayer configurations through a dynamic split-screen system:

### Screen Layout Configurations
1. **Single Player:**
   - Full screen display
   - Utilizes entire window space

2. **Two Players:**
   - Vertical split (top-bottom)
   - Equal screen space allocation
   - Clean separation with minimal gap

3. **Three Players:**
   - Top row split horizontally (left and right)
   - Bottom row left occupied, right empty
   - Maintains visual balance with empty fourth quadrant

4. **Four Players:**
   - 2x2 grid layout
   - Equal quadrants for all players
   - Minimal gaps between screens

### Implementation Details
- **Dynamic Layout System:**
  - CSS Grid-based layout management
  - Responsive to window resizing
  - Automatic adjustment based on player count
  - Clean separation between viewports

- **Technical Components:**
  ```html
  four_player_setup.html   # Handles multi-player screen layouts
  ```
  - Dynamically creates required number of game instances
  - Manages viewport organization
  - Handles implementation selection display
  - Maintains proper aspect ratios

- **Launch System:**
  ```batch
  start_game.bat          # Unified game launcher
  ```
  - Manages server startup
  - Handles implementation selection
  - Controls player count configuration
  - Launches appropriate screen layout

### Key Features
- **Flexible Configuration:** Supports 1-4 players
- **Clean Interface:** Minimal gaps between viewports
- **Implementation Awareness:** Displays current game implementation
- **Dynamic Resizing:** Maintains proper ratios on window resize
- **Efficient Resource Usage:** Only creates needed game instances
- **Seamless Integration:** Works with all game implementations

## Implementation Selection System
The platform is designed to support multiple game implementations, but currently only has the default implementation:

1. **Selection Process:**
   - Server loads the default implementation
   - Implementation identifier is displayed in the game UI

2. **Technical Components:**
   ```javascript
   // server/core/index.js
   const serverConfig = {
     // Use default implementation
     activeImplementation: "default",
     port: process.env.PORT || 3000
   };
   ```

3. **Available Implementations:**
   - **default:** Simple box-based characters and environment

4. **Implementation Registry:**
   - Central registry in server/core/index.js maps implementation names to their module exports
   - New implementations can be added by extending this registry