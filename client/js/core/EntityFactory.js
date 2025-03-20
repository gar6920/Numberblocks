// 3D AI Game Platform - Entity Factory for creating game entities

class EntityFactory {
    constructor() {
        // Registry for entity types and their constructors
        this.registry = {
            // Base types
            entity: Entity,
            player: Player,
            npc: NPC
        };
        
        // Implementation-specific registry - will be populated by implementations
        this.implementationRegistry = {};
    }
    
    // Register a new entity type
    registerType(type, constructor) {
        if (this.registry[type] || this.implementationRegistry[type]) {
            console.warn(`Entity type '${type}' is already registered. Overwriting.`);
        }
        
        // Determine if this is a core type or implementation-specific
        if (constructor.prototype instanceof Entity ||
            constructor === Entity ||
            constructor.prototype instanceof Player ||
            constructor === Player ||
            constructor.prototype instanceof NPC ||
            constructor === NPC) {
            this.registry[type] = constructor;
        } else {
            this.implementationRegistry[type] = constructor;
        }
    }
    
    // Register implementation-specific entity types
    registerImplementation(implementationName, entityTypes) {
        for (const [type, constructor] of Object.entries(entityTypes)) {
            const fullType = `${implementationName}.${type}`;
            this.registerType(fullType, constructor);
        }
    }
    
    // Create an entity based on type and parameters
    createEntity(type, params) {
        // Check if this is an implementation-specific type
        if (type.includes('.')) {
            const [implementationName, specificType] = type.split('.');
            const constructor = this.implementationRegistry[type];
            
            if (constructor) {
                return new constructor(params);
            } else {
                console.error(`Implementation-specific entity type '${type}' not found.`);
                return null;
            }
        }
        
        // Check core registry
        const Constructor = this.registry[type];
        if (Constructor) {
            return new Constructor(params);
        }
        
        // If no match found, log error and return null
        console.error(`Entity type '${type}' not found in registry.`);
        return null;
    }
    
    // Create a player entity
    createPlayer(params) {
        const type = params.type || 'player';
        params.isPlayer = true;
        
        return this.createEntity(type, params);
    }
    
    // Create an NPC entity
    createNPC(params) {
        const type = params.type || 'npc';
        
        return this.createEntity(type, params);
    }
}

// Create and export a singleton instance
const entityFactory = new EntityFactory();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EntityFactory = EntityFactory;
    window.entityFactory = entityFactory;
}

if (typeof module !== 'undefined') {
    module.exports = { EntityFactory, entityFactory };
} 