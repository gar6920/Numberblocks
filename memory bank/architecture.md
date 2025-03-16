# Numberblocks Game - Architecture

## Overview
The Numberblocks game is a 3D web-based educational game built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable Numberblock characters that can interact with mathematical operators and other Numberblocks in a colorful 3D environment.

## Core Components

### 1. Server (server.js)
**Technology:** Built with Node.js and Colyseus.

**Responsibilities:**
- Manages game rooms and player connections/disconnections
- Maintains the authoritative game state, including player positions, Numberblock values, and static Numberblocks
- Processes player inputs (e.g., movement, operator collection, Numberblock collisions)
- Broadcasts state updates to all connected clients
- Handles operator spawning and lifecycle management

**Key Features:**
- Room-based multiplayer with session persistence
- State synchronization using Colyseus schema
- Server-authoritative position tracking
- Dynamic operator spawning system

### 2. Client (/client)
The client is responsible for rendering the game, handling user inputs, and communicating with the server.

**Key files:**
- **main-fixed.js:**
  - Initializes the Three.js scene, renderer, and camera
  - Sets up player controls and world objects
  - Manages view modes (first-person and third-person)
  - Updates visual components based on server state

- **network.js:**
  - Establishes and maintains WebSocket connection to the server via Colyseus
  - Sends player actions to the server (movement, operator collection, collisions)
  - Processes state updates from the server
  - Handles player joining/leaving events

- **numberblock.js:**
  - Defines the Numberblock class for rendering player characters
  - Creates dynamic block stacks based on numeric value
  - Manages visual elements (face, arms, feet, colors)
  - Handles value-based visual updates

- **operator.js:**
  - Manages mathematical operators (addition, subtraction)
  - Handles visual representation and animation
  - Provides collision detection support

- **collision.js:**
  - Implements collision detection between game entities
  - Supports player-operator and player-numberblock interactions

### 3. Networking Architecture
**Technology:** Colyseus for WebSocket-based real-time multiplayer.

**Implementation:**
- Server maintains authoritative game state using Colyseus Schema
- Client sends player actions to the server at regular intervals
- Server validates actions, updates game state, and broadcasts to all clients
- Efficient state synchronization with delta updates

**Key Features:**
- Session persistence with reconnection support
- Room-based multiplayer with shared state
- Message-based communication for game events

## File Structure
```
/
├── client/                  # Client-side code and assets
│   ├── index.html           # Main HTML entry point
│   ├── css/
│   │   └── styles.css       # Game styling
│   └── js/
│       ├── main-fixed.js    # Core game logic and rendering
│       ├── network.js       # Networking and state synchronization
│       ├── numberblock.js   # Numberblock entity implementation
│       ├── operator.js      # Mathematical operator implementation
│       └── collision.js     # Collision detection system
├── server.js                # Server implementation with Colyseus
├── package.json             # Project dependencies
└── memory bank/             # Project documentation
    ├── architecture.md      # This file
    └── progress.md          # Development progress
```

## Communication Flow
1. **Initialization:**
   - Server starts and creates a game room
   - Client connects to server and joins the room
   - Server assigns a session ID and initializes player state

2. **Gameplay Loop:**
   - Client captures user inputs (movement, view changes)
   - Client sends inputs to server at regular intervals
   - Server validates and processes inputs
   - Server updates game state (player positions, operator spawning, etc.)
   - Server broadcasts updated state to all clients
   - Each client renders the updated game state

3. **Interactions:**
   - Client detects local collisions (player-operator, player-numberblock)
   - Client sends interaction events to server
   - Server validates interaction and updates game state accordingly
   - Server broadcasts the updated state to all clients

## Key Features
- **Dual View Modes:** First-person and third-person camera options
- **Dynamic Numberblocks:** Visual representation changes based on numeric value
- **Mathematical Interactions:** Addition and subtraction operators affect Numberblock values
- **Multiplayer Support:** Multiple players can join the same game world
- **Persistence:** Session reconnection support

## Future Enhancements
- Advanced operator types (multiplication, division)
- Cooperative puzzle challenges
- Enhanced visual effects and animations
- Mobile device support
- User accounts and progression tracking
