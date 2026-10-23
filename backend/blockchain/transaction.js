import { sha256 } from './cryptoUtils.js';

export class Transaction {
  constructor({ id, type, payload, senderDepartment, submittedBy, signatures = [] }) {
    this.id = id || 'TX_' + Date.now().toString(16) + '_' + Math.random().toString(36).substring(2, 7);
    this.type = type; // 'CADAVER_INTAKE', 'CADAVER_VERIFIED', 'ORGAN_HARVEST', 'ORGAN_CERTIFIED'
    this.payload = payload;
    this.senderDepartment = senderDepartment;
    this.submittedBy = submittedBy;
    this.signatures = signatures;
    this.timestamp = new Date().toISOString();
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return sha256({
      id: this.id,
      type: this.type,
      payload: this.payload,
      senderDepartment: this.senderDepartment,
      submittedBy: this.submittedBy,
      signatures: this.signatures,
      timestamp: this.timestamp
    });
  }

  addSignature(sigObj) {
    if (this.signatures.some(s => s.doctorId === sigObj.doctorId)) {
      throw new Error(`Doctor ${sigObj.doctorName} (${sigObj.doctorId}) has already signed.`);
    }
    this.signatures.push(sigObj);
    this.hash = this.calculateHash();
  }
}
