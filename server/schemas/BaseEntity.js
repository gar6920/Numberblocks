const { Schema, type } = require("@colyseus/schema");

/**
 * Base entity schema for all game entities
 * This class provides common properties and methods for all entities
 */
class BaseEntity extends Schema {
    constructor() {
        super();
        this.id = "";             // Unique identifier
        this.type = "";           // Entity type (e.g., "player", "npc", "static")
        this.x = 0;               // Position X
        this.y = 0;               // Position Y 
        this.z = 0;               // Position Z
        this.rotationY = 0;       // Rotation around Y axis (yaw)
        this.value = 1;           // Generic value - meaning depends on implementation
        this.color = "#FFFFFF";   // Color in hex format
    }
}

// Register schema types
type("string")(BaseEntity.prototype, "id");
type("string")(BaseEntity.prototype, "type");
type("number")(BaseEntity.prototype, "x");
type("number")(BaseEntity.prototype, "y");
type("number")(BaseEntity.prototype, "z");
type("number")(BaseEntity.prototype, "rotationY");
type("number")(BaseEntity.prototype, "value");
type("string")(BaseEntity.prototype, "color");

module.exports = { BaseEntity }; 