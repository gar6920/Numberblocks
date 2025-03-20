const { Schema, type, defineTypes } = require("@colyseus/schema");
const { BaseEntity } = require("../../schemas/BaseEntity");
const { Player } = require("../../schemas/Player");

/**
 * Numberblock player schema - extends the Player schema
 * Adds Numberblock-specific properties
 */
class NumberblockPlayer extends Player {
    constructor() {
        super();
        this.implementationType = "numberblocks";
        this.operator = ""; // "plus" or "minus"
    }
}

// Register schema types
type("string")(NumberblockPlayer.prototype, "operator");

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
 * Static Numberblock entity schema - extends BaseEntity
 * Represents static numberblocks in the game that don't move
 */
class StaticNumberblock extends BaseEntity {
    constructor() {
        super();
        this.type = "staticNumberblock";
        this.isStatic = true;     // Flag indicating this is a static entity
        this.isInteractable = true; // Whether this block can be interacted with
    }
}

// Register only the new properties that aren't already in BaseEntity
type("boolean")(StaticNumberblock.prototype, "isStatic");
type("boolean")(StaticNumberblock.prototype, "isInteractable");

module.exports = {
    NumberblockPlayer,
    Operator,
    StaticNumberblock
}; 