import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Block } from './block.js';
import { Transaction } from './transaction.js';
import { sha256 } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'ledger.json');

export class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 2;
    this.allowedDepartments = ['CIFV', 'SROPS', 'ADMIN'];
    this.init();
  }

  init() {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.chain = data.chain || [];
        this.pendingTransactions = data.pendingTransactions || [];
        if (this.chain.length > 0) return;
      } catch (err) {
        console.error('Error loading ledger, re-creating genesis block:', err);
      }
    }
    this.createGenesisBlock();
    this.save();
  }

  createGenesisBlock() {
    const genesisTx = new Transaction({
      id: 'TX_GENESIS_001',
      type: 'CONSORTIUM_INITIALIZATION',
      payload: {
        network: 'State Organ & Tissue Transplant Blockchain (MediChain)',
        authorizedNodes: ['CIFV_NODE_01', 'SROPS_NODE_02', 'CTORB_ADMIN_NODE_03'],
        governance: 'Multi-Signature 2-of-3 Mandatory Signoff Protocol',
        initiatedAt: new Date().toISOString()
      },
      senderDepartment: 'CTORB_ADMIN',
      submittedBy: 'SYSTEM_ROOT'
    });

    const genesisBlock = new Block(0, '0'.repeat(64), [genesisTx], 'GENESIS_CONSORTIUM_ROOT');
    genesisBlock.mineBlock(this.difficulty);
    this.chain = [genesisBlock];
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    this.pendingTransactions.push(transaction);
    this.save();
    return transaction;
  }

  minePendingTransactions(validatorNode = 'CONSORTIUM_VALIDATOR_PRIMARY') {
    if (this.pendingTransactions.length === 0) {
      return null;
    }

    const newBlock = new Block(
      this.chain.length,
      this.getLatestBlock().hash,
      [...this.pendingTransactions],
      validatorNode
    );

    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.pendingTransactions = [];
    this.save();
    return newBlock;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      const recalculatedHash = sha256({
        index: current.index,
        timestamp: current.timestamp,
        previousHash: current.previousHash,
        merkleRoot: current.merkleRoot,
        validatorNode: current.validatorNode,
        nonce: current.nonce
      });

      if (current.hash !== recalculatedHash) {
        return {
          valid: false,
          error: `Block #${current.index} hash mismatch. Expected ${recalculatedHash}, got ${current.hash}`
        };
      }

      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          error: `Block #${current.index} previousHash mismatch with Block #${previous.index}`
        };
      }
    }
    return { valid: true, blockHeight: this.chain.length };
  }

  checkConsortiumAccess(role) {
    if (!role) return false;
    const normalized = role.toUpperCase();
    if (normalized === 'EXTERNAL' || normalized === 'EXTERNAL_HOSPITAL' || normalized === 'RTCN') {
      return false; // Strictly restricted!
    }
    return this.allowedDepartments.includes(normalized);
  }

  save() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      chain: this.chain,
      pendingTransactions: this.pendingTransactions,
      lastUpdated: new Date().toISOString()
    }, null, 2));
  }
}

export const ledger = new Blockchain();
