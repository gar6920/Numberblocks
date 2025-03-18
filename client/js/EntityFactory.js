import { Numberblock } from './numberblock.js';
import { updatePlayerListUI } from './player-sync.js';

// Numberblocks game - Entity Factory for creating game entities

class EntityFactory {
    constructor() {
        // Registry of visual types
        this.visualRegistry = {
            'players': {
                'numberblock': window.Numberblock,
                // Future types: 'letterblock', etc.
            },
            'npcs': {
                'numberblock': window.Numberblock,
                'operator': window.OperatorsVisual,
                // Future types: 'letterblock', etc.
            }
        };
        
        // Global tracking objects for entity instances
        this.entities = {
            players: {},
            npcs: {},
            staticNumberblocks: {}
        };
    }
    
    // Create an entity from schema data
    createEntity(entityData, entityCategory, options = {}) {
        // Normalize data from schema to entity constructor format
        const params = {
            id: entityData.id || options.id,
            name: entityData.name,
            value: entityData.value,
            color: entityData.color,
            x: entityData.x,
            y: entityData.y,
            z: entityData.z,
            rotationY: entityData.rotationY,
            type: options.type || 'numberblock', // Default visual type
            ...options // Any additional options
        };
        
        let entity;
        
        // Create the appropriate entity type
        switch (entityCategory) {
            case 'players':
                entity = new window.Player(params);
                break;
                
            case 'operators':
                // Handle operators as NPCs with operator type
                params.type = 'operator';
                entity = new window.NPC(params);
                break;
                
            case 'staticNumberblocks':
                // Static numberblocks are NPCs with isStatic=true
                params.isStatic = true;
                entity = new window.NPC(params);
                break;
                
            default:
                // Default to NPC for unknown types
                entity = new window.NPC(params);
                break;
        }
        
        // Store in tracking object
        this.trackEntity(entity, entityCategory, entityData.id || options.id);
        
        return entity;
    }
    
    // Track an entity in the appropriate collection
    trackEntity(entity, category, id) {
        // Determine which collection to use based on category
        let collection;
        
        if (category === 'players') {
            collection = this.entities.players;
        } else if (category === 'operators') {
            collection = this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            collection = this.entities.staticNumberblocks;
        } else {
            console.warn(`Unknown entity category: ${category}`);
            return;
        }
        
        // Store the entity
        collection[id] = entity;
    }
    
    // Remove an entity from tracking
    removeEntity(category, id) {
        // Determine which collection to use
        let collection;
        
        if (category === 'players') {
            collection = this.entities.players;
        } else if (category === 'operators') {
            collection = this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            collection = this.entities.staticNumberblocks;
        } else {
            console.warn(`Unknown entity category: ${category}`);
            return;
        }
        
        // Get the entity
        const entity = collection[id];
        
        // If entity exists, destroy it
        if (entity) {
            entity.destroy();
            delete collection[id];
        }
    }
    
    // Get an entity by category and ID
    getEntity(category, id) {
        // Determine which collection to use
        let collection;
        
        if (category === 'players') {
            collection = this.entities.players;
        } else if (category === 'operators') {
            collection = this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            collection = this.entities.staticNumberblocks;
        } else {
            console.warn(`Unknown entity category: ${category}`);
            return null;
        }
        
        return collection[id] || null;
    }
    
    // Get all entities of a category
    getAllEntities(category) {
        if (category === 'players') {
            return this.entities.players;
        } else if (category === 'operators') {
            return this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            return this.entities.staticNumberblocks;
        } else {
            console.warn(`Unknown entity category: ${category}`);
            return {};
        }
    }
    
    // Remove an entity from tracking
    removeEntity(category, id) {
        // Determine which collection to use
        let collection;
        
        if (category === 'players') {
            collection = this.entities.players;
        } else if (category === 'operators') {
            collection = this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            collection = this.entities.staticNumberblocks;
        } else {
            console.warn(`Unknown entity category: ${category}`);
            return;
        }
        
        // If the entity exists in the collection
        if (collection[id]) {
            // Clean up if it has a mesh
            if (collection[id].mesh && window.scene) {
                window.scene.remove(collection[id].mesh);
            }
            
            // Remove from tracking
            delete collection[id];
            return true;
        }
        
        return false;
    }
    
    // Get all entities of a specific category
    getAllEntities(category) {
        if (category === 'players') {
            return this.entities.players;
        } else if (category === 'operators') {
            return this.entities.npcs;
        } else if (category === 'staticNumberblocks') {
            return this.entities.staticNumberblocks;
        }
        
        return {};
    }
    
    // Get a specific entity
    getEntity(category, id) {
        const entities = this.getAllEntities(category);
        return entities[id];
    }
    
    // Force refresh all entities from current room state
    refreshAllEntities(state) {
        console.log("Refreshing all entities from current state");
        
        if (!state) {
            console.error("No state provided for entity refresh");
            return;
        }
        
        // Refresh players
        if (state.players) {
            try {
                // Try different methods to iterate through players
                if (typeof state.players.forEach === 'function') {
                    state.players.forEach((player, id) => {
                        this._refreshPlayerEntity(player, id);
                    });
                } else if (typeof state.players.entries === 'function') {
                    for (const [id, player] of state.players.entries()) {
                        this._refreshPlayerEntity(player, id);
                    }
                } else {
                    const playersObj = state.players.toJSON ? state.players.toJSON() : state.players;
                    for (const id in playersObj) {
                        if (playersObj.hasOwnProperty(id)) {
                            this._refreshPlayerEntity(playersObj[id], id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error refreshing players:", error);
            }
        }
        
        // Refresh operators
        if (state.operators) {
            try {
                // Similar pattern for operators
                if (typeof state.operators.forEach === 'function') {
                    state.operators.forEach((operator, id) => {
                        this._refreshOperatorEntity(operator, id);
                    });
                } else if (typeof state.operators.entries === 'function') {
                    for (const [id, operator] of state.operators.entries()) {
                        this._refreshOperatorEntity(operator, id);
                    }
                } else {
                    const operatorsObj = state.operators.toJSON ? state.operators.toJSON() : state.operators;
                    for (const id in operatorsObj) {
                        if (operatorsObj.hasOwnProperty(id)) {
                            this._refreshOperatorEntity(operatorsObj[id], id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error refreshing operators:", error);
            }
        }
        
        // Update player list UI as well
        if (window.updatePlayerListUI) {
            window.updatePlayerListUI();
        }
    }
    
    // Helper method to refresh a player entity
    _refreshPlayerEntity(player, id) {
        // Skip local player
        if (window.room && id === window.room.sessionId) {
            return;
        }
        
        const entity = this.getEntity('players', id);
        if (entity) {
            // Update existing entity
            entity.updatePosition({
                x: player.x,
                y: player.y,
                z: player.z,
                rotationY: player.rotationY
            });
            entity.updateValue(player.value);
            entity.updateColor(player.color);
        } else {
            // Create new entity if it doesn't exist
            console.log(`Creating entity for player ${id} during refresh`);
            const entityOptions = { id: id, type: 'numberblock' };
            const newEntity = this.createEntity(player, 'players', entityOptions);
            
            // Add to scene
            if (newEntity && newEntity.mesh && window.scene) {
                window.scene.add(newEntity.mesh);
            }
        }
    }
    
    // Helper method to refresh an operator entity
    _refreshOperatorEntity(operator, id) {
        const entity = this.getEntity('operators', id);
        if (entity) {
            // Update existing entity
            entity.updatePosition({
                x: operator.x,
                y: operator.y,
                z: operator.z,
                rotationY: operator.rotationY
            });
        } else {
            // Create new entity if it doesn't exist
            console.log(`Creating entity for operator ${id} during refresh`);
            const entityOptions = { 
                id: id, 
                type: 'operator',
                value: operator.type 
            };
            const newEntity = this.createEntity(operator, 'operators', entityOptions);
            
            // Add to scene
            if (newEntity && newEntity.mesh && window.scene) {
                window.scene.add(newEntity.mesh);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EntityFactory = EntityFactory;
    // Initialize global entity factory
    window.entityFactory = new EntityFactory();
}

if (typeof module !== 'undefined') {
    module.exports = { EntityFactory };
}
