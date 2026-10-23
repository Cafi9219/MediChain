import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  X,
  Blocks,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileCode2,
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ListOrdered
} from 'lucide-react';
import { fetchBlockchain, verifyBlockchainIntegrity, simulateTamper } from '../utils/api.js';
import TermTooltip from './TermTooltip.jsx';

function summarizeTransactionPlainLanguage(tx) {
  const p = tx.payload || {};
  switch (tx.type) {
    case 'CONSORTIUM_INITIALIZATION':
      return {
        badge: 'Network Genesis',
        title: 'MediChain Consortium Ledger Initialized',
        detail: `Authorized departments: ${(p.authorizedNodes || []).join(', ') || 'CIFV, SROPS, CTORB Admin'}. Rule: 2 required approvals out of 3 specialists.`
      };
    case 'CADAVER_INTAKE_DRAFT':
      return {
        badge: 'Donor Intake Logged',
        title: `Donor Registered: ${p.patientName || 'Donor'} (${p.hexId || 'ID'})`,
        detail: `Blood Group: ${p.bloodGroup || 'N/A'} • Cause: ${p.causeOfDeath || 'Recorded'} • Status: Awaiting 2 required approvals out of 3 specialists.`
      };
    case 'CADAVER_VERIFIED_BLOCK':
      return {
        badge: 'Donor Approved for Surgery',
        title: `Donor Cleared: ${p.patientName || 'Donor'} (${p.hexId || 'ID'})`,
        detail: `Blood Group: ${p.bloodGroup || 'N/A'} • Approved by ${(p.signingDoctors || []).join(', ') || '2 of 3 CIFV specialists'}.`
      };
    case 'ORGAN_EXTRACTION_RECORDED':
      return {
        badge: 'Organ Recovery Logged',
        title: `Recovery Report ${p.reportId || ''} (Donor ${p.cadaverHexId || ''})`,
        detail: `Organs logged: ${(p.organsHarvested || []).map(o => `${o.name} (${o.id})`).join(', ') || 'Recorded'} • Awaiting 2 required approvals out of 3 specialists.`
      };
    case 'ORGAN_HARVEST_CERTIFIED_BLOCK':
      return {
        badge: 'Organs Certified & Sealed',
        title: `${p.organsExtractedCount || (p.organTokens || []).length || ''} Organ(s) Certified (Donor ${p.cadaverHexId || ''})`,
        detail: `Tokens: ${(p.organTokens || []).join(', ')} • Signed by ${(p.signingSurgeons || []).join(', ')}.`
      };
    case 'ETA_RECORDED':
      return {
        badge: 'Transit ETA Logged',
        title: `Transit ETA for Organ ${p.organId || ''}`,
        detail: `Route: ${p.origin || 'Origin'} → ${p.destination || 'Recipient Center'} • ETA: ${
          p.etaSeconds ? `${Math.round(p.etaSeconds / 60)} mins` : 'Recorded'
        }.`
      };
    case 'ESCALATION':
    case 'LATE_EVENT':
      return {
        badge: tx.type === 'ESCALATION' ? 'Deadline Escalation' : 'Late Window Alert',
        title: `${tx.type} recorded for ${p.organId || p.hexId || 'Record'}`,
        detail: p.reason || p.message || 'Logged by Deadline Engine (2 required approvals out of 3 specialists unchanged).'
      };
    default:
      return {
        badge: tx.type || 'Ledger Event',
        title: `Transaction ${tx.id}`,
        detail: `Submitted by ${tx.submittedBy || tx.senderDepartment || 'Consortium Node'}`
      };
  }
}

export default function BlockchainExplorer({ isOpen, onClose }) {
  const [chainData, setChainData] = useState({ chain: [], blockHeight: 0 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' (default) or 'detail'
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [copiedHash, setCopiedHash] = useState('');

  const searchInputId = useId();
  const dialogTitleId = useId();

  useEffect(() => {
    if (isOpen) {
      loadChain();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  async function loadChain() {
    setLoading(true);
    setVerificationResult(null);
    setTamperResult(null);
    try {
      const res = await fetchBlockchain('ADMIN');
      if (res.success) {
        setChainData({ chain: res.chain, blockHeight: res.blockHeight });
        if (res.chain.length > 0) {
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

  function toggleBlockTechnicalDrawer(blockIndex) {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockIndex]: !prev[blockIndex]
    }));
  }

  function handleCopyText(text, key) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(''), 2000);
  }

  const filteredChain = useMemo(() => {
    if (!searchQuery.trim()) return chainData.chain;
    const q = searchQuery.toLowerCase();
    return chainData.chain.filter(block => {
      return (
        block.hash.toLowerCase().includes(q) ||
        block.previousHash.toLowerCase().includes(q) ||
        block.index.toString() === q ||
        JSON.stringify(block.transactions).toLowerCase().includes(q)
      );
    });
  }, [chainData.chain, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                <Blocks className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={dialogTitleId} className="text-base font-bold text-white tracking-wide">
                    MediChain Audit Ledger Explorer
                  </h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ledger Online • {chainData.chain.length} Blocks
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Plain-language clinical timeline with on-demand cryptographic hash & Merkle root inspection
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close blockchain explorer"
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Mode Toggle + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Timeline View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'detail'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                Technical Detail View
              </button>
            </div>

            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              Verify Ledger Integrity
            </button>

            <button
              type="button"
              onClick={handleSimulateTamper}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Demonstrates how the ledger detects unauthorized record tampering"
            >
              <Bug className="w-4 h-4" />
              Test Tamper Detection
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close blockchain explorer"
              className="hidden lg:inline-flex p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {verificationResult && (
          <div
            role="status"
            className="bg-emerald-950 border-b border-emerald-700 px-6 py-3 text-xs text-emerald-100 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Ledger Integrity Verified:</strong> All {verificationResult.blockHeight} blocks are intact. Every block hash, previous block link, and transaction fingerprint matches.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              aria-label="Dismiss verification notice"
              className="text-emerald-300 hover:text-white font-bold px-2"
            >
              ✕
            </button>
          </div>
        )}

        {tamperResult && (
          <div
            role="alert"
            className="bg-amber-950 border-b border-amber-700 px-6 py-3 text-xs text-amber-100 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Tamper Simulation Detected:</strong> {tamperResult.diagnostic} — Unauthorized modification was automatically rejected and restored.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTamperResult(null)}
              aria-label="Dismiss tamper notice"
              className="text-amber-300 hover:text-white font-bold px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Strip */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
          <div className="relative flex-1 max-w-lg">
            <label htmlFor={searchInputId} className="sr-only">
              Search blocks by donor name, organ ID, block number, or SHA-256 hash
            </label>
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by donor name, organ ID, block #, or hash..."
              className="w-full min-h-[38px] bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span>
              Showing <strong className="text-cyan-300 font-mono">{filteredChain.length}</strong> of{' '}
              <strong className="text-cyan-300 font-mono">{chainData.chain.length}</strong> blocks
            </span>
            <span className="inline-flex items-center gap-1">
              <span>Rule:</span>
              <strong className="text-emerald-300">2 required approvals out of 3 specialists</strong>
              <TermTooltip
                dark
                technicalTerm="Proof-of-Authority (PoA) + 2-of-3 Multi-Sig"
                description="Blocks are sealed only after 2 required approvals out of 3 authorized department specialists are verified."
              />
            </span>
          </div>
        </div>

        {/* BODY VIEW 1: SIMPLE TIMELINE VIEW (DEFAULT) */}
        {viewMode === 'timeline' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900">
            {loading ? (
              <div className="text-center py-16 text-slate-300 text-sm">
                Loading audit timeline...
              </div>
            ) : filteredChain.length === 0 ? (
              <div className="text-center py-16 text-slate-300 text-sm">
                No ledger blocks match your search query.
              </div>
            ) : (
              [...filteredChain].reverse().map(block => {
                const isGenesis = block.index === 0;
                const isExpanded = Boolean(expandedBlocks[block.index]);

                return (
                  <div
                    key={block.index}
                    className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                  >
                    {/* Timeline Block Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-xs">
                          Block #{block.index}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {isGenesis
                            ? 'Network Initialization (Genesis Block)'
                            : `Sealed by ${block.validatorNode}`}
                        </span>
                        <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60">
                          Verified & Immutable
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(block.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Plain-Language Events in this Block */}
                    <div className="space-y-3">
                      {block.transactions.map((tx, idx) => {
                        const summary = summarizeTransactionPlainLanguage(tx);
                        return (
                          <div
                            key={idx}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {summary.badge}
                                </span>
                                <h4 className="text-sm font-bold text-white">{summary.title}</h4>
                              </div>
                              <span className="text-xs font-mono text-slate-300">
                                Dept: {tx.senderDepartment}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {summary.detail}
                            </p>

                            {/* Specialist Signatures Summary */}
                            {tx.signatures && tx.signatures.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-emerald-300 font-semibold">
                                  Signed Approvals ({tx.signatures.length} recorded; 2 required approvals out of 3 specialists):
                                </span>
                                {tx.signatures.map((sig, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-xs text-emerald-200"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <strong>{sig.doctorName}</strong>
                                    <span className="font-mono text-emerald-300">
                                      ({sig.doctorId})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Toggle Technical Hashes & Merkle Root Drawer */}
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleBlockTechnicalDrawer(block.index)}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Cryptographic Hashes, Merkle Root & Raw Payload
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Cryptographic Hashes, Merkle Root & Raw Payload
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBlock(block);
                          setViewMode('detail');
                        }}
                        className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                      >
                        Open in Detail View →
                      </button>
                    </div>

                    {/* Expanded Technical Drawer */}
                    {isExpanded && (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs font-mono">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <TermTooltip
                                dark
                                label="Block SHA-256 Hash"
                                technicalTerm="Block Header SHA-256 Digest"
                                description="Unique cryptographic fingerprint of this block."
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyText(block.hash, `hash-${block.index}`)}
                                className="text-cyan-300 hover:text-white inline-flex items-center gap-1"
                              >
                                {copiedHash === `hash-${block.index}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="text-cyan-300 break-all select-all">{block.hash}</p>
                          </div>

                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <TermTooltip
                                dark
                                label="Previous Block Link"
                                technicalTerm="Parent Block SHA-256 Hash"
                                description="Links this block immutably to the preceding block in the chain."
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(block.previousHash, `prev-${block.index}`)
                                }
                                className="text-cyan-300 hover:text-white inline-flex items-center gap-1"
                              >
                                {copiedHash === `prev-${block.index}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="text-slate-200 break-all select-all">
                              {block.previousHash}
                            </p>
                          </div>

                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <TermTooltip
                                dark
                                label="Merkle Root Fingerprint"
                                technicalTerm="SHA-256 Binary Merkle Root"
                                description="Cryptographic root hash summarizing all transactions in this block."
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(block.merkleRoot, `merkle-${block.index}`)
                                }
                                className="text-cyan-300 hover:text-white inline-flex items-center gap-1"
                              >
                                {copiedHash === `merkle-${block.index}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="text-purple-300 break-all select-all">
                              {block.merkleRoot}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                          <span className="text-slate-300 block mb-1 font-sans font-semibold">
                            Raw Block Transactions JSON:
                          </span>
                          <pre className="text-slate-200 text-xs">
                            {JSON.stringify(block.transactions, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BODY VIEW 2: TECHNICAL DETAIL VIEW (Responsive Master-Detail without mobile clipping) */}
        {viewMode === 'detail' && (
          <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Left: Blocks List */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800 md:overflow-y-auto p-3 space-y-2.5 bg-slate-950/60">
              {loading ? (
                <div className="text-center py-12 text-slate-300 text-xs">
                  Loading consortium ledger...
                </div>
              ) : filteredChain.length === 0 ? (
                <div className="text-center py-12 text-slate-300 text-xs">
                  No blocks match your search query.
                </div>
              ) : (
                filteredChain.map(block => {
                  const isSelected = selectedBlock && selectedBlock.index === block.index;
                  const isGenesis = block.index === 0;

                  return (
                    <button
                      key={block.index}
                      type="button"
                      onClick={() => setSelectedBlock(block)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-400 shadow-lg'
                          : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          Block #{block.index}
                        </span>
                        <span className="text-xs text-slate-300 font-mono">
                          {isGenesis ? 'GENESIS' : `${block.transactions.length} Tx`}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs font-mono text-slate-300">
                        <p className="truncate">
                          <span className="text-slate-400">Hash: </span>
                          <span className="text-slate-100">{block.hash}</span>
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          Prev: {block.previousHash.substring(0, 16)}...
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-cyan-300 truncate max-w-[130px]">
                          {block.validatorNode}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right: Selected Block Deep Inspector */}
            <div className="md:col-span-8 md:overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900">
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
                      <span className="text-xs font-mono text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-700">
                        SEALED & VERIFIED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-300 text-xs block mb-1">
                          BLOCK SHA-256 HASH
                        </span>
                        <span className="text-cyan-300 break-all select-all">
                          {selectedBlock.hash}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-300 text-xs block mb-1">
                          PREVIOUS BLOCK HASH
                        </span>
                        <span className="text-slate-200 break-all select-all">
                          {selectedBlock.previousHash}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-300 text-xs block mb-1">
                          MERKLE ROOT HASH
                        </span>
                        <span className="text-purple-300 break-all select-all">
                          {selectedBlock.merkleRoot}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-300 text-xs block mb-1">
                          TIMESTAMP & NONCE
                        </span>
                        <span className="text-slate-200">
                          {new Date(selectedBlock.timestamp).toLocaleString()} | Nonce:{' '}
                          {selectedBlock.nonce}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Inside This Block */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-cyan-400" />
                        Sealed Transactions ({selectedBlock.transactions.length})
                      </h4>
                      <span className="text-xs text-slate-300 font-mono">
                        Consortium State Logs
                      </span>
                    </div>

                    {selectedBlock.transactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="text-xs text-cyan-300 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded mr-2">
                              {tx.type}
                            </span>
                            <span className="text-slate-200 font-bold">{tx.id}</span>
                          </div>
                          <span className="text-xs text-slate-300">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Payload JSON Inspector */}
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto text-xs">
                          <pre className="text-slate-200">
                            {JSON.stringify(tx.payload, null, 2)}
                          </pre>
                        </div>

                        {/* Cryptographic Multi-Signatures */}
                        {tx.signatures && tx.signatures.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1.5">
                            <span className="text-xs text-slate-300 font-bold block">
                              Specialist Approvals (2 required approvals out of 3 specialists met):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {tx.signatures.map((sig, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-emerald-950/40 border border-emerald-700/50 p-2.5 rounded-lg text-xs text-emerald-200"
                                >
                                  <div className="flex justify-between">
                                    <strong>{sig.doctorName}</strong>
                                    <span>{sig.doctorId}</span>
                                  </div>
                                  <div className="text-xs text-emerald-300 truncate mt-0.5">
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
                <div className="text-center py-20 text-slate-300 text-xs">
                  Select a block from the ledger on the left to inspect cryptographic headers and transactions.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
