const { Schema, type } = require("@colyseus/schema");
const { BaseEntity } = require("./BaseEntity");

/**
 * Structure schema for buildings and constructions
 * Extends BaseEntity with building-specific properties
 */
class Structure extends BaseEntity {
    constructor() {
        super();
        this.type = "structure";       // Entity type
        this.structureType = "";       // Specific structure type (e.g., "building", "wall")
        this.width = 1;                // Width of structure
        this.height = 1;               // Height of structure
        this.depth = 1;                // Depth of structure
        this.health = 100;             // Health points
        this.maxHealth = 100;          // Maximum health points
        this.ownerId = "";             // ID of player who built this
    }
}

// Register schema types
type("string")(Structure.prototype, "structureType");
type("number")(Structure.prototype, "width");
type("number")(Structure.prototype, "height");
type("number")(Structure.prototype, "depth");
type("number")(Structure.prototype, "health");
type("number")(Structure.prototype, "maxHealth");
type("string")(Structure.prototype, "ownerId");

module.exports = { Structure }; 