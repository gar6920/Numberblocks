const { Schema, MapSchema, type } = require("@colyseus/schema");
const { Player } = require("./Player");

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
        
        // Game configuration and state
        this.gameConfig = {
            implementation: "numberblocks", // Default implementation
            mode: "standard",               // Game mode
            maxPlayers: 10,                 // Maximum number of players
            mapSize: 40                     // Size of the map
        };
    }
}

// Register schema types
type({ map: Player })(GameState.prototype, "players");
type({ map: Schema })(GameState.prototype, "entities");
type("object")(GameState.prototype, "gameConfig");

module.exports = { GameState }; 