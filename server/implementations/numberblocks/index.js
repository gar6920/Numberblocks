/**
 * Numberblocks Implementation Index
 * Exports all components of the Numberblocks implementation
 */

const { ImplementationPlayer, Operator, StaticValueEntity } = require('./schemas');
const { NumberblocksRoom } = require('./NumberblocksRoom');

module.exports = {
    // Schemas
    ImplementationPlayer,
    Operator,
    StaticValueEntity,
    
    // Room
    NumberblocksRoom,
    
    // Implementation information
    implementation: {
        name: "numberblocks",
        description: "Mathematical building blocks game",
        version: "1.0.0",
        roomType: "numberblocks"
    }
}; 