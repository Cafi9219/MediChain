import { sha256, computeMerkleRoot } from './cryptoUtils.js';

export class Block {
  constructor(index, previousHash, transactions, validatorNode = 'CONSORTIUM_VALIDATOR_1') {
    this.index = index;
    this.timestamp = new Date().toISOString();
    this.previousHash = previousHash;
    this.transactions = transactions;
    this.validatorNode = validatorNode;
    this.merkleRoot = computeMerkleRoot(transactions);
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return sha256({
      index: this.index,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      validatorNode: this.validatorNode,
      nonce: this.nonce
    });
  }

  mineBlock(difficulty = 2) {
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    return this.hash;
  }
}
