# 3D AI Game Platform - Restructuring Plan

## Overview
This document outlines the steps needed to restructure the existing codebase to align with our modular architecture design. The goal is to separate core platform functionality from game-specific implementations, making it easier to create new game types while reusing common infrastructure.

## Current Structure Issues
1. Lack of clear separation between core platform and Numberblocks-specific code
2. Unclear responsibilities between Entity.js, Player.js, NPC.js, and EntityFactory.js
3. No established pattern for creating new game implementations
4. Monolithic main-fixed.js file handling too many responsibilities

## Restructuring Steps

### 1. Directory Structure
Create a more organized directory structure:
```
/client/js/
  ├── core/                 # Core platform code
  │   ├── Entity.js
  │   ├── Player.js
  │   ├── NPC.js
  │   ├── controls.js
  │   ├── network-core.js
  │   ├── collision.js
  │   ├── EntityFactory.js
  │   └── player-ui.js
  ├── implementations/      # Game-specific implementations
  │   └── numberblocks/     # Numberblocks implementation
  │       ├── numberblock.js
  │       ├── operator.js
  │       └── assets/
  ├── lib/                  # Third-party libraries
  └── main-fixed.js         # Main initialization and game loop
```

### 2. Entity System Refactoring
1. **Entity.js**
   - Make Entity a base class with common entity properties and methods
   - Define clear interfaces for implementation-specific behavior
   - Move Numberblocks-specific code to numberblock.js

2. **Player.js**
   - Make Player extend Entity with player-specific functionality
   - Focus on input handling and player state management
   - Define interfaces for implementation-specific player behavior

3. **NPC.js**
   - Make NPC extend Entity with non-player character functionality
   - Implement basic AI and state machine patterns
   - Provide hooks for implementation-specific NPC behavior

4. **EntityFactory.js**
   - Implement proper factory pattern for entity creation
   - Create registration system for implementation-specific entity types
   - Separate core factory logic from implementation-specific entity creation

### 3. Implementation Isolation
1. Move Numberblocks-specific code to /implementations/numberblocks/
   - Identify and extract all Numberblocks-specific logic
   - Create NumberBlock class that extends Player
   - Move operator-related code to operator.js

2. Create clear interfaces between core and implementation
   - Define required methods for implementation-specific classes
   - Document extension points and hooks for customization

### 4. Main Engine Refactoring
1. Break down main-fixed.js into smaller, more focused modules
   - Extract scene setup into a separate module
   - Create a game loop manager
   - Implement a configuration system for loading different implementations

2. Add implementation loading mechanism
   - Create a simple way to specify which game implementation to load
   - Implement dynamic loading of implementation-specific code
   - Add configuration options for implementation-specific settings

### 5. Server-Side Changes
1. Make server.js implementation-agnostic
   - Extract Numberblocks-specific logic to separate modules
   - Create a plugin system for implementation-specific server logic
   - Define clear interfaces for server-side implementation code

2. Update Colyseus schema definitions
   - Make schemas more generic to support different implementations
   - Create extension points for implementation-specific state

## Implementation Plan

### Phase 1: Preparation
1. Create the new directory structure
2. Document core interfaces and extension points
3. Identify core vs. implementation-specific code

### Phase 2: Core Platform Refactoring
1. Refactor Entity, Player, and NPC classes
2. Implement the EntityFactory pattern
3. Update network-core.js and controls.js for modularity

### Phase 3: Numberblocks Implementation
1. Create the numberblocks implementation directory
2. Move Numberblocks-specific code to this directory
3. Create NumberBlock class extending Player
4. Move operator functionality to operator.js

### Phase 4: Main Engine and Server Updates
1. Refactor main-fixed.js for modularity
2. Implement implementation loading mechanism
3. Update server.js for implementation-agnostic operation
4. Create server-side plugin system

### Phase 5: Testing and Documentation
1. Test the restructured code with the Numberblocks implementation
2. Document the modular architecture and extension points
3. Create a template for new game implementations
4. Update all documentation to reflect the new structure

## Future Considerations
1. Asset management system for efficient resource loading
2. More sophisticated plugin system
3. Implementation-specific configuration UI
4. Runtime switching between implementations 