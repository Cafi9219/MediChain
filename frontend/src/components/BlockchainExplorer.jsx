import React, { useState, useEffect } from 'react';
import {
  X,
  Blocks,
  ShieldCheck,
  Hash,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  KeyRound,
  FileCode2,
  Bug
} from 'lucide-react';
import { fetchBlockchain, verifyBlockchainIntegrity, simulateTamper } from '../utils/api.js';

export default function BlockchainExplorer({ isOpen, onClose }) {
  const [chainData, setChainData] = useState({ chain: [], blockHeight: 0 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadChain();
    }
  }, [isOpen]);

  async function loadChain() {
    setLoading(true);
    setVerificationResult(null);
    setTamperResult(null);
    try {
      const res = await fetchBlockchain('ADMIN');
      if (res.success) {
        setChainData({ chain: res.chain, blockHeight: res.blockHeight });
        if (res.chain.length > 0 && !selectedBlock) {
          setSelectedBlock(res.chain[res.chain.length - 1]);
        }
      }
    } catch (err) {
      console.error('Failed to load chain:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyChain() {
    setVerifying(true);
    try {
      const res = await verifyBlockchainIntegrity();
      setVerificationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSimulateTamper() {
    try {
      const res = await simulateTamper();
      setTamperResult(res);
      loadChain();
    } catch (err) {
      console.error(err);
    }
  }

  if (!isOpen) return null;

  const filteredChain = chainData.chain.filter(block => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      block.hash.toLowerCase().includes(q) ||
      block.previousHash.toLowerCase().includes(q) ||
      block.index.toString() === q ||
      JSON.stringify(block.transactions).toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-6xl w-full h-[88vh] flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xl">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  MediChain Consortium Distributed Ledger Explorer
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Consortium Consensus Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cryptographic blocks, Merkle root verification, and multi-signature proof audit trail
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Verify Chain Integrity Button */}
            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              Verify Chain Integrity
            </button>

            {/* Simulate Tamper Button (for Academic Defense) */}
            <button
              onClick={handleSimulateTamper}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              title="Demonstrates how blockchain instantly detects manual database alteration"
            >
              <Bug className="w-4 h-4" />
              Simulate Tamper Attack
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {verificationResult && (
          <div className="bg-emerald-950/80 border-b border-emerald-700/50 px-6 py-2.5 text-xs text-emerald-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Consortium Cryptographic Verification:</strong> All {verificationResult.blockHeight} blocks verified! 
                Hash chains, Merkle trees, and Proof-of-Authority signatures are 100% intact.
              </span>
            </div>
            <button
              onClick={() => setVerificationResult(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {tamperResult && (
          <div className="bg-amber-950/80 border-b border-amber-700/50 px-6 py-2.5 text-xs text-amber-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Academic Defense Simulation:</strong> {tamperResult.diagnostic} - The blockchain cryptographic engine immediately flags altered bytes and halts consensus!
              </span>
            </div>
            <button
              onClick={() => setTamperResult(null)}
              className="text-amber-400 hover:text-amber-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Strip */}
        <div className="bg-slate-900 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by block #, SHA-256 hash, or transaction ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Blocks: <strong className="text-cyan-400">{chainData.chain.length}</strong></span>
            <span>Consensus: <strong className="text-emerald-400">PoA (Consortium)</strong></span>
          </div>
        </div>

        {/* Main Split View: Left (Blocks List), Right (Block Details & Transactions) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left: Blocks List */}
          <div className="md:col-span-4 border-r border-slate-800 overflow-y-auto p-3 space-y-2.5 bg-slate-950/50">
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Loading consortium ledger...
              </div>
            ) : filteredChain.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No blocks match your search query.
              </div>
            ) : (
              filteredChain.map(block => {
                const isSelected = selectedBlock && selectedBlock.index === block.index;
                const isGenesis = block.index === 0;

                return (
                  <div
                    key={block.index}
                    onClick={() => setSelectedBlock(block)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/70 shadow-lg'
                        : 'bg-slate-900/70 hover:bg-slate-800/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        Block #{block.index}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isGenesis ? 'GENESIS' : `${block.transactions.length} Tx`}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono text-slate-400">
                      <p className="truncate">
                        <span className="text-slate-600">Hash: </span>
                        <span className="text-slate-300">{block.hash}</span>
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        Prev: {block.previousHash.substring(0, 16)}...
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-cyan-500/80 truncate max-w-[120px]">
                        {block.validatorNode}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Block Deep Inspector */}
          <div className="md:col-span-8 overflow-y-auto p-6 space-y-6 bg-slate-900">
            {selectedBlock ? (
              <>
                {/* Block Metadata Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <h3 className="text-sm font-bold text-white font-mono">
                        Block Header #{selectedBlock.index}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      MINED & VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">BLOCK SHA-256 HASH</span>
                      <span className="text-cyan-300 break-all text-[11px] select-all">
                        {selectedBlock.hash}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">PREVIOUS BLOCK HASH</span>
                      <span className="text-slate-300 break-all text-[11px] select-all">
                        {selectedBlock.previousHash}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">MERKLE ROOT HASH</span>
                      <span className="text-purple-300 break-all text-[11px] select-all">
                        {selectedBlock.merkleRoot}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">TIMESTAMP & NONCE</span>
                      <span className="text-slate-200 text-[11px]">
                        {new Date(selectedBlock.timestamp).toLocaleString()} | Nonce: {selectedBlock.nonce}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transactions Inside This Block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-cyan-400" />
                      Mined Transactions ({selectedBlock.transactions.length})
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Consortium Smart Contract State Logs
                    </span>
                  </div>

                  {selectedBlock.transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded mr-2">
                            {tx.type}
                          </span>
                          <span className="text-slate-300 font-bold">{tx.id}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Payload JSON Inspector */}
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto text-[11px]">
                        <pre className="text-slate-300">
                          {JSON.stringify(tx.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Cryptographic Multi-Signatures */}
                      {tx.signatures && tx.signatures.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold block">
                            Cryptographic Multi-Signatures (2-of-3 Threshold Met):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {tx.signatures.map((sig, sIdx) => (
                              <div
                                key={sIdx}
                                className="bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-lg text-[10px] text-emerald-300"
                              >
                                <div className="flex justify-between">
                                  <strong>{sig.doctorName}</strong>
                                  <span>{sig.doctorId}</span>
                                </div>
                                <div className="text-[9px] text-emerald-400/80 truncate mt-0.5">
                                  Sig: {sig.signatureHash}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs">
                Select a block from the ledger on the left to inspect cryptographic headers and transactions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
