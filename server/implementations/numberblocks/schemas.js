const { Schema, type } = require("@colyseus/schema");
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
    }
}

module.exports = {
    NumberblockPlayer,
    Operator,
    StaticNumberblock
}; 