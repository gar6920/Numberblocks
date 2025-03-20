const { Schema, MapSchema, type } = require("@colyseus/schema");
const { Player } = require("./Player");
const { GameConfigSchema } = require("./GameConfigSchema");

/**
 * Game state schema for the entire game
 * Contains collections of all entities in the game
 */
class GameState extends Schema {
    constructor() {
        super();
        // All players in the game
        this.players = new MapSchema();
        
        // All entities in the game - can be implementation-specific
        this.entities = new MapSchema();
        
        // Game configuration and state - using schema instead of plain object
        this.gameConfig = new GameConfigSchema();
    }
}

// Register schema types
type({ map: Player })(GameState.prototype, "players");
type({ map: Schema })(GameState.prototype, "entities");
type(GameConfigSchema)(GameState.prototype, "gameConfig");

module.exports = { GameState }; 