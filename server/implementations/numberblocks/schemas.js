const { Schema, type, defineTypes } = require("@colyseus/schema");
const { BaseEntity } = require("../../core/schemas/BaseEntity");
const { Player } = require("../../core/schemas/Player");

/**
 * Implementation player schema - extends the Player schema
 * Adds implementation-specific properties
 */
class ImplementationPlayer extends Player {
    constructor() {
        super();
        this.implementationType = "numberblocks"; // Keep this one reference to the implementation
        this.operator = ""; // "plus" or "minus"
    }
}

// Register schema types
type("string")(ImplementationPlayer.prototype, "operator");

/**
 * Operator entity schema - extends BaseEntity
 * Represents mathematical operators in the game
 */
class Operator extends BaseEntity {
    constructor() {
        super();
        this.type = "operator";
        this.operatorType = ""; // "plus" or "minus"
    }
}

// Register schema types
type("string")(Operator.prototype, "operatorType");

/**
 * Static entity schema - extends BaseEntity
 * Represents static objects in the game that don't move
 */
class StaticValueEntity extends BaseEntity {
    constructor() {
        super();
        this.type = "staticValueEntity";
        this.isStatic = true;     // Flag indicating this is a static entity
        this.isInteractable = true; // Whether this block can be interacted with
    }
}

// Register only the new properties that aren't already in BaseEntity
type("boolean")(StaticValueEntity.prototype, "isStatic");
type("boolean")(StaticValueEntity.prototype, "isInteractable");

module.exports = {
    ImplementationPlayer,
    Operator,
    StaticValueEntity
}; 