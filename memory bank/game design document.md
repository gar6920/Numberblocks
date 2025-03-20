# Game Design Document
## Introduction
The Numberblocks game is a 3D web-based game built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable  characters and interact with a colorful 3D environment.  One application is numberblocks but it can be extended to other applications.

## Overview
In this game, players navigate a colorful 3D world as Numberblocks, each representing a number. By collecting floating plus (+) and minus (-) operators and bumping into other players, they can add or subtract the other player's number from their own, altering their value. The game offers various modes, such as reaching a target number or eliminating opponents by reducing them to zero.

## Core Mechanics
Player Movement
Players move in a first-person, third person, or free roam camera only perspective with standard gaming controls.

Game World
Visual Style
The environment is bright, colorful, with typical outdoor landscape.  

Features include platforms, ramps, hiding spots, and open areas for player interaction.

Maps encourage exploration and strategic positioning.

Interactive Elements
Some areas may require a specific criteria to access.

Can interact in objects in various ways determined by the game.

Player Characters
Appearance
Players are Numberblocks, with a block count matching their current number.  Their shape may be straight up, or rows of several blocks, or even arms and legs as the numbers get bigger.  But they are always made of blocks and their number is always visible.

The model dynamically adjusts as the number changes (e.g., growing from 1 block to 10 blocks).

Size and Speed (Optional)
Larger Numbers: Slower movement speed, harder to push.

Smaller Numbers: Faster movement, easier to displace.

This adds a layer of strategy to growing or shrinking.

Operators
Spawning
Operators appear at random intervals and locations on the map.

Spawn rates are balanced to ensure availability without overwhelming players.

Collection
Players collect an operator by touching it.

Collecting a new operator replaces the current one if the player is already holding one.

Usage
Operators activate automatically upon bumping into another player.

After use, the operator is consumed.

Game Objectives
The game supports multiple modes:
1. Target Number Mode
Objective: Reach a specific number (e.g., 100) by adding to your value.

The first player to hit the target wins.

2. Elimination Mode
Objective: Reduce other players to zero or below using the minus operator.

Players at zero or negative are eliminated; the last one standing wins.

3. Score-Based Mode
Objective: Earn points for each operation performed (e.g., +1 point per addition/subtraction).

The player with the most points at the end wins, tracked via a leaderboard.

Multiplayer Features

The Numberblocks game features a comprehensive multiplayer system with support for both local split-screen and online networked play, allowing for flexible and varied play experiences.

### Core Multiplayer Architecture

- **Client-Server Model**: Uses Colyseus for WebSocket communication, providing a server-authoritative game state
- **Room-Based Gameplay**: Players join game rooms with unique session IDs and synchronized state
- **Cross-Platform Support**: Play on various devices and browsers with consistent experience

### Local Split-Screen Multiplayer

- **Player Count**: Supports 2-4 players on a single device
- **Screen Division**:
  - 2 players: Horizontal split (top/bottom) or vertical split (left/right)
  - 3-4 players: Quadrant-based division with each player assigned a section of the screen
- **Input Management**:
  - Primary player: WASD movement, mouse look, spacebar jump
  - Secondary player(s): Arrow key movement, numpad look, enter jump
  - Gamepad support for all players with standard mapping
- **Visual Distinction**:
  - Unique colors/patterns for each player's Numberblock
  - Player names or icons displayed in their viewport
  - HUD customization per viewport showing player-specific info

### Online Multiplayer

- **Player Connection**: Connect to game servers via unique room codes or matchmaking
- **Persistence**: Session reconnection support if temporarily disconnected
- **Latency Management**:
  - Client-side prediction for responsive gameplay
  - Server reconciliation to maintain game state integrity
  - Position interpolation for smooth movement of other players
- **Player Limit**: Up to 10 players per online game room
- **Social Features**:
  - Player names and optional customization
  - Simple chat system or emoji-based communication
  - Friend invites and private rooms

### Hybrid Multiplayer

- **Local + Online**: Combine local split-screen with online play
  - Example: Two players on one device can join an online room with other remote players
- **Scaling**:
  - Game difficulty and operator spawning adjusts based on player count
  - Maps expand or contract to maintain optimal player density
- **Fairness**:
  - Equal operator distribution across the map
  - Spawn protection to prevent immediate targeting of new players
  - Optional balancing mechanics for teams with uneven player counts

### Gameplay Modes

- **Free-for-All**: Every player competes individually
- **Team Play**:
  - Form teams of 2-3 players
  - Combined team score or cooperative objectives
  - Team-based visual identity (color schemes)
- **Specialized Modes**:
  - Capture the Flag: Teams attempt to capture numbered flags
  - King of the Hill: Control zones to accumulate points
  - Math Race: Race through checkpoints solving math problems

### Player Interaction

- **Core Bumping Mechanics**: Apply operators to other players through collision
- **Cooperative Actions**:
  - Stand close to allies to combine numbers temporarily
  - Form "number trains" for enhanced movement or special abilities
  - Share operators with teammates
- **Competitive Actions**:
  - Block opponents from reaching operators
  - Strategic positioning to access high-value areas
  - Tactical operator usage to manipulate opponent numbers

### Networking Considerations

- **Bandwidth Optimization**:
  - Efficient state synchronization with delta updates
  - Interest management to prioritize nearby players
- **Cross-Device Performance**:
  - Adaptive rendering quality based on device capabilities
  - Optional graphic settings to maintain performance
- **Connection Quality**:
  - Visual indicators for network status
  - Graceful handling of high-latency situations

### Split-Screen Technical Implementation

- **Renderer Management**: Multiple Three.js renderers for each viewport
- **Camera Control**: Independent camera instances for each local player
- **Resource Sharing**: Optimized asset sharing for memory efficiency
- **Performance Considerations**:
  - Simplified lighting in multi-viewport mode
  - Reduced draw distance for split-screen to maintain frame rate
  - Level of detail adjustments based on viewport size

This comprehensive multiplayer system ensures the Numberblocks game is enjoyable whether playing with friends on the same device or connecting with players around the world.

Handling Edge Cases
Zero or Negative Numbers
If a player's number reaches zero or below:
Respawn Option: They are out for 10 seconds, then return as 1.

Elimination Option: They are removed from the round (used in Elimination Mode).

Maximum Number Limit
A cap (e.g., 100) prevents excessive growth.

Optional: Larger numbers face rarer plus operators to slow their progress.

User Interface (UI)
Heads-Up Display (HUD)
Shows:
Player's current number.

Held operator (if any).

Optional: Score or mini-map.

Menus
Main Menu: Choose game mode, map, and settings.

Lobby: Join or create multiplayer matches.

Controls
Movement: WASD or arrow keys.

Look: Mouse.

Jump: Spacebar (if implemented).

Interact: Automatic via bumping.

Audio
Background Music: Upbeat, Numberblocks-inspired tunes.

Sound Effects:
Operator collection (e.g., a cheerful "ding").

Bumping (e.g., a soft "thud").

Number change (e.g., a growing/shrinking sound).

Technical Considerations
Platform
Browser-based, using WebGL for 3D rendering (e.g., Three.js).

Networking
Real-time multiplayer requires server-side syncing of:
Player positions. 

Numbers.

Operator states and spawns.

Optimization
Must run smoothly on various devices/browsers.

Efficient collision detection is key for bumping mechanics.

Future Features
Power-Ups: Shields (block operators) or speed boosts.

Advanced Operators: Multiplication/division for complexity (optional).

Customization: Unlockable colors or accessories for Numberblocks.

Educational Mode: Single-player math puzzles for kids.

Conclusion
This game combines the playful, educational charm of Numberblocks with dynamic FPS gameplay. Its simple mechanics make it accessible to children, while strategic depth and multiplayer fun appeal to all ages. With proper balancing and optimization, it can become an entertaining and educational browser-based experience.
