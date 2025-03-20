# Numberblocks Game - Architecture

## Overview
The Numberblocks game is a 3D web-based game built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable  characters and interact with a colorful 3D environment.  One application is numberblocks but it can be extended to other applications.

## Core Components

### 1. Server (server.js)
**Technology:** Built with Node.js and Colyseus.

**Responsibilities:**
- Manages game rooms and player connections/disconnections
- Maintains the authoritative game state
- Processes player inputs (e.g., movement, collisions)
- Broadcasts state updates to all connected clients
- Handles entity spawning and lifecycle management

**Key Features:**
- Room-based multiplayer with session persistence
- State synchronization using Colyseus schema
- Server-authoritative position tracking
- Dynamic entity spawning system

### 2. Client (/client)
The client is responsible for rendering the game, handling user inputs, and communicating with the server.

**Key files:**
- **main-fixed.js:**
  - Initializes the Three.js scene, renderer, and camera
  - Sets up player controls and world objects
  - Manages view modes (first-person, third person, free roam)
  - Updates visual components based on server state

- **network-core.js:**
  - Establishes and maintains WebSocket connection to the server via Colyseus
  - Sends player actions to the server
  - Processes state updates from the server
  - Handles player joining/leaving events

- **numberblock.js:**
  - Defines all classes specific to the numberblock implementation of the gamethe Numberblock class for rendering player characters
  - Creates dynamic block stacks based on numeric value
  - Manages visual elements (face, arms, feet, colors)
  

- **controls.js:**
  - Handles player movement and camera controls
  - Supports first-person, third person, and free roam view modes
  - Manages input handling for keyboard and mouse
  - Implements quaternion-based rotation for smooth camera movement

- **Entity.js, Player.js, NPC.js, EntityFactory.js:**
  - UNCLEAR TO ME THE SEPARATION OF RESPONSIBILITY HERE

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
- Schema-based state synchronization with type annotations
- Player list UI showing all connected players

**Schema Implementation:**
- Proper MapSchema collections for players, operators, and static objects
- Type annotations for all schema properties
- Structured synchronization patterns for consistent state updates


## File Structure


## Communication Flow
1. **Initialization:**
   - Server starts and creates a game room
   - Client connects to server and joins the room
   - Server assigns a session ID and initializes player state

2. **Gameplay Loop:**
   - Client captures user inputs and sends movements that affect player character to server (movements, actions, etc.)   - Server validates and processes inputs
   - Server updates game state
   - Server broadcasts updated state to all clients
   - Each client renders the updated game state

3. **Interactions:**
   - Client detects local collisions (player-operator, player-numberblock) and sends interaction events to server
   - Server validates interaction and updates game state accordingly
   - Server broadcasts the updated state to all clients

## Key Features
- **Triple View Modes:** First-person, third-person, and free roam
- **Multiplayer Support:** Multiple players can join the same game world
- **Persistence:** Session reconnection support
- **Browser Tab Synchronization:** Automatically updates game state when inactive tabs become active
- **Entity Component System:** Flexible architecture for game entity management
- **Dynamic Numberblocks:** Visual representation changes based on numeric value
- **Mathematical Interactions:** Addition and subtraction operators affect Numberblock values

## Future Enhancements
- Advanced operator types (multiplication, division)
- Cooperative puzzle challenges
- Enhanced visual effects and animations
- Mobile device support
- User accounts and progression tracking