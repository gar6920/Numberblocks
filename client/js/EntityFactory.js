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
