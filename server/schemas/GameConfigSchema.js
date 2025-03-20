const { Schema, type } = require("@colyseus/schema");

/**
 * Game configuration schema
 * Replaces the generic object type with a properly typed schema
 */
class GameConfigSchema extends Schema {
    constructor() {
        super();
        this.implementation = "numberblocks"; // Default implementation
        this.mode = "standard";               // Game mode
        this.maxPlayers = 10;                 // Maximum number of players
        this.mapSize = 40;                    // Size of the map
    }
}

// Register schema types
type("string")(GameConfigSchema.prototype, "implementation");
type("string")(GameConfigSchema.prototype, "mode");
type("number")(GameConfigSchema.prototype, "maxPlayers");
type("number")(GameConfigSchema.prototype, "mapSize");

module.exports = { GameConfigSchema }; 