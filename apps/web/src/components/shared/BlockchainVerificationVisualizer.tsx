/**
 * BlockchainVerificationVisualizer
 *
 * Immersive full-screen animation that walks through the entire
 * certificate-verification lifecycle:
 *
 *   Document → Binary decomposition → SHA-256 hashing →
 *   Network discovery → Hash propagation → Node querying →
 *   Match found / Failed → Result
 *
 * Design theme: Egypt Vision 2030 — deep navy, gold, green.
 */

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'document'   // Document card pops up
  | 'binary'     // Document decomposes into hex/binary rain
  | 'hashing'    // SHA-256 computation with scramble effect
  | 'network'    // Network topology appears
  | 'propagate'  // Hash travels across connections
  | 'query'      // Peers query their CouchDB (hold until API returns)
  | 'matched'    // Hash found — confirmation burst
  | 'complete'   // Final success state
  | 'failed';    // Final failure state

type NodeStatus = 'idle' | 'active' | 'querying' | 'matched' | 'failed';

export interface BlockchainVisualizerProps {
  isOpen: boolean;
  fileName: string;
  fileSize: number;
  hash: string;
  /** null = API still in-flight, 'success' | 'failed' = result arrived */
  verificationResult: 'success' | 'failed' | null;
  onClose: () => void;
}

// ── Network topology ─────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  sub: string;
  role: 'peer' | 'orderer';
  cx: number;
  cy: number;
}

const CENTER = { cx: 450, cy: 248 };

const NODES: NodeDef[] = [
  { id: 'ord1', label: 'Orderer-1', sub: 'Raft Leader',  role: 'orderer', cx: 165, cy: 130 },
  { id: 'ord2', label: 'Orderer-2', sub: 'Raft Node',    role: 'orderer', cx:  72, cy: 248 },
  { id: 'ord3', label: 'Orderer-3', sub: 'Raft Node',    role: 'orderer', cx: 165, cy: 366 },
  { id: 'p1',   label: 'Ministry',  sub: 'Org1 · Peer0', role: 'peer',    cx: 736, cy: 120 },
  { id: 'p2',   label: 'MSMEDA',   sub: 'Org2 · Peer0', role: 'peer',    cx: 830, cy: 208 },
  { id: 'p3',   label: 'Training', sub: 'Org3 · Peer0', role: 'peer',    cx: 830, cy: 312 },
  { id: 'p4',   label: 'Auditors', sub: 'Org4 · Peer0', role: 'peer',    cx: 736, cy: 400 },
];

interface EdgeDef { from: string; to: string; type: 'raft' | 'main' | 'gossip' }

const EDGES: EdgeDef[] = [
  { from: 'ord1',   to: 'ord2', type: 'raft'   },
  { from: 'ord2',   to: 'ord3', type: 'raft'   },
  { from: 'ord1',   to: 'ord3', type: 'raft'   },
  { from: 'center', to: 'ord1', type: 'main'   },
  { from: 'center', to: 'ord2', type: 'main'   },
  { from: 'center', to: 'ord3', type: 'main'   },
  { from: 'center', to: 'p1',   type: 'main'   },
  { from: 'center', to: 'p2',   type: 'main'   },
  { from: 'center', to: 'p3',   type: 'main'   },
  { from: 'center', to: 'p4',   type: 'main'   },
  { from: 'p1',     to: 'p2',   type: 'gossip' },
  { from: 'p2',     to: 'p3',   type: 'gossip' },
  { from: 'p3',     to: 'p4',   type: 'gossip' },
  { from: 'p1',     to: 'p4',   type: 'gossip' },
];

function getPos(id: string): { cx: number; cy: number } {
  if (id === 'center') return CENTER;
  return NODES.find((n) => n.id === id) ?? CENTER;
}

// ── Phase log messages ───────────────────────────────────────────────────────

const PHASE_LOGS: Partial<Record<Phase, string[]>> = {
  document: [
    '> Initializing secure verification session...',
    '> Document received by verification pipeline',
    '> File integrity pre-check: OK',
  ],
  binary: [
    '> Decomposing document into byte representation...',
    '> Reading binary stream: 01010000 01000100 01000110...',
    '> Byte array ready for cryptographic processing',
  ],
  hashing: [
    '> Initializing SHA-256 cryptographic algorithm...',
    '> Processing 512-bit message blocks...',
    '> Applying 64 rounds of SHA-256 compression...',
    '> Computing final 256-bit digest...',
  ],
  network: [
    '> Hyperledger Fabric 2.5 network topology loaded',
    '> 3 Raft orderer nodes confirmed online',
    '> 4 endorsing peer nodes reachable (1 per org)',
    '> TLS mutual authentication handshake: ✓',
    '> Channel "certificates" active',
  ],
  propagate: [
    '> Broadcasting hash to distributed ledger network...',
    '> Establishing gRPC connections to all 4 organizations...',
    '> Dispatching verification query across channel...',
  ],
  query: [
    '> Org1 (Ministry) → CouchDB query: cert_hash lookup...',
    '> Org2 (MSMEDA) → CouchDB query: cert_hash lookup...',
    '> Org3 (Training) → CouchDB query: cert_hash lookup...',
    '> Org4 (Auditors) → CouchDB query: cert_hash lookup...',
    '> Awaiting endorsement responses...',
  ],
  matched: [
    '> ✓ Hash match confirmed on distributed ledger',
    '> ✓ Certificate record retrieved from world state',
    '> ✓ Block endorsed by MAJORITY of organizations',
    '> ✓ Issuer digital signature: AUTHENTIC',
    '> ✓ Revocation status: CLEAR',
  ],
  complete: [
    '> ════════════════════════════════════',
    '> BLOCKCHAIN VERIFICATION: SUCCESS',
    '> Certificate is authentic and unmodified',
    '> ════════════════════════════════════',
  ],
  failed: [
    '> ✗ No hash match on any peer node',
    '> ✗ Certificate not found in world state',
    '> ✗ Document may not have been issued via this platform',
    '> VERIFICATION RESULT: FAILED',
  ],
};

// ── Binary rain particles ────────────────────────────────────────────────────

const HEX = '0123456789ABCDEF';
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: `${(i * 1.27) % 98}%`,
  char: HEX[i % 16] + HEX[(i * 3) % 16],
  dur: `${(1.4 + (i % 7) * 0.28).toFixed(2)}s`,
  delay: `${((i * 0.037) % 1.8).toFixed(2)}s`,
  size: 9 + (i % 7),
  opacity: 0.25 + (i % 5) * 0.14,
}));

// ── Hash scramble helper ─────────────────────────────────────────────────────

function randomHex(len: number) {
  return Array.from({ length: len }, () => HEX[Math.floor(Math.random() * 16)]).join('');
}

// ── Phase step bar ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Document',  phases: ['document', 'binary']       },
  { label: 'Hash',      phases: ['hashing']                   },
  { label: 'Network',   phases: ['network']                   },
  { label: 'Propagate', phases: ['propagate']                 },
  { label: 'Query',     phases: ['query']                     },
  { label: 'Result',    phases: ['matched', 'complete', 'failed'] },
];

function phaseStep(p: Phase): number {
  return STEPS.findIndex((s) => s.phases.includes(p));
}

// ── Component ────────────────────────────────────────────────────────────────

export function BlockchainVerificationVisualizer({
  isOpen,
  fileName,
  fileSize,
  hash,
  verificationResult,
  onClose,
}: BlockchainVisualizerProps) {
  const [phase, setPhase] = useState<Phase>('document');
  const [statuses, setStatuses] = useState<Record<string, NodeStatus>>(() =>
    Object.fromEntries(NODES.map((n) => [n.id, 'idle' as NodeStatus]))
  );
  const [logLines, setLogLines] = useState<string[]>([]);
  const [displayHash, setDisplayHash] = useState('');
  const [hashSettled, setHashSettled] = useState(false);
  const [edgesLive, setEdgesLive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('document');

  const addLog = (lines: string[]) =>
    setLogLines((prev) => [...prev, ...lines].slice(-50));

  // ── Phase state machine ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      // Reset everything
      setPhase('document');
      phaseRef.current = 'document';
      setStatuses(Object.fromEntries(NODES.map((n) => [n.id, 'idle'])));
      setLogLines([]);
      setDisplayHash('');
      setHashSettled(false);
      setEdgesLive(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    const go = (p: Phase) => {
      setPhase(p);
      phaseRef.current = p;
      if (PHASE_LOGS[p]) addLog(PHASE_LOGS[p]!);
    };

    go('document');

    t(() => go('binary'), 1800);
    t(() => go('hashing'), 3800);

    t(() => {
      go('network');
      t(() => {
        go('propagate');
        setEdgesLive(true);
        NODES.forEach((n, i) =>
          t(() => setStatuses((prev) => ({ ...prev, [n.id]: 'active' })), i * 180)
        );
        t(() => {
          go('query');
          NODES.filter((n) => n.role === 'peer').forEach((n, i) =>
            t(() => setStatuses((prev) => ({ ...prev, [n.id]: 'querying' })), i * 280)
          );
        }, 2200);
      }, 1200);
    }, 7000);

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  // ── Hash scramble ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'hashing' || !hash) return;
    let settled = 0;
    setHashSettled(false);
    const id = setInterval(() => {
      if (settled >= hash.length) {
        setHashSettled(true);
        setDisplayHash(hash);
        clearInterval(id);
        return;
      }
      setDisplayHash(hash.slice(0, settled) + randomHex(hash.length - settled));
      settled += 2;
    }, 55);
    return () => clearInterval(id);
  }, [phase, hash]);

  // ── React to API result during query phase ───────────────────────────────

  useEffect(() => {
    if (phaseRef.current !== 'query' || verificationResult === null) return;
    const success = verificationResult === 'success';
    const id = setTimeout(() => {
      const next: Phase = success ? 'matched' : 'failed';
      setPhase(next);
      phaseRef.current = next;
      addLog(PHASE_LOGS[next]!);
      setStatuses((prev) => {
        const s = { ...prev };
        NODES.forEach((n) => {
          if (n.role === 'peer') s[n.id] = success ? 'matched' : 'failed';
        });
        return s;
      });
      if (success) {
        setTimeout(() => {
          setPhase('complete');
          phaseRef.current = 'complete';
          addLog(PHASE_LOGS.complete!);
        }, 2000);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [phase, verificationResult]);

  // Also handle when API result arrives before reaching 'query' phase
  useEffect(() => {
    if (verificationResult === null) return;
    const check = setInterval(() => {
      if (phaseRef.current === 'query') clearInterval(check);
    }, 200);
    return () => clearInterval(check);
  }, [verificationResult]);

  // ── Auto-scroll log ──────────────────────────────────────────────────────

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  if (!isOpen) return null;

  const step = phaseStep(phase);
  const isFinal = phase === 'complete' || phase === 'failed';
  const isSuccess = phase === 'complete';
  const showNetwork = ['network', 'propagate', 'query', 'matched', 'complete', 'failed'].includes(phase);

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Injected CSS keyframes ────────────────────────────────────────── */}
      <style>{`
        @keyframes vz-fall {
          0%   { transform: translateY(-30px); opacity: 0; }
          8%   { opacity: 1; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        @keyframes vz-doc-pop {
          0%   { transform: translateY(40px) scale(0.82); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes vz-node-pop {
          0%   { opacity: 0; }
          60%  { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes vz-burst {
          0%   { transform: scale(0.75); opacity: 0; }
          55%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes vz-pulse-gold {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        @keyframes vz-dash-flow {
          from { stroke-dashoffset: 24; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes vz-glow-green {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        @keyframes vz-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .vz-blink { animation: vz-blink 1s step-end infinite; }
        .vz-dash-anim { animation: vz-dash-flow 0.45s linear infinite; }
        .vz-pulse-gold-anim { animation: vz-pulse-gold 1.8s ease-in-out infinite; }
      `}</style>

      {/* ── Full-screen overlay ───────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: '#020B18' }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(197,162,61,0.2)', background: '#020F22' }}
        >
          {/* Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
              style={{ background: 'linear-gradient(135deg,#C5A23D,#009B4D)', color: '#020B18' }}
            >
              🏛
            </div>
            <div className="min-w-0">
              <div
                className="text-xs font-bold tracking-widest"
                style={{ color: '#C5A23D', letterSpacing: '0.18em' }}
              >
                EGYPT VISION 2030
              </div>
              <div className="text-xs truncate" style={{ color: '#4A5568' }}>
                SME Certificate Trust Platform — Blockchain Verification Engine
              </div>
            </div>
          </div>

          {/* Step bar (desktop) */}
          <div className="hidden lg:flex items-center gap-0.5 mx-4">
            {STEPS.map((s, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <div key={s.label} className="flex items-center gap-0.5">
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-300"
                    style={{
                      background: done
                        ? 'rgba(0,155,77,0.18)'
                        : active
                        ? 'rgba(197,162,61,0.18)'
                        : 'rgba(255,255,255,0.03)',
                      color: done ? '#4ADE80' : active ? '#F0C040' : '#374151',
                      border: `1px solid ${
                        done   ? 'rgba(0,155,77,0.35)'
                        : active ? 'rgba(197,162,61,0.5)'
                        : 'rgba(255,255,255,0.05)'
                      }`,
                    }}
                  >
                    <span>{done ? '✓' : active ? '◉' : '○'}</span>
                    <span>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-4 h-px"
                      style={{ background: done ? 'rgba(0,155,77,0.5)' : 'rgba(255,255,255,0.06)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: '#4A5568' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Visualization canvas ───────────────────────────────────────── */}
          <div className="flex-1 relative overflow-hidden">

            {/* Grid pattern background */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(197,162,61,0.07) 1px, transparent 1px),
                                  linear-gradient(90deg,rgba(197,162,61,0.07) 1px, transparent 1px)`,
                backgroundSize: '44px 44px',
              }}
            />

            {/* ══ Phase: Document + Binary ══════════════════════════════════ */}
            {(phase === 'document' || phase === 'binary') && (
              <div className="absolute inset-0 flex items-center justify-center">

                {/* Binary / hex rain */}
                {phase === 'binary' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {PARTICLES.map((p) => (
                      <span
                        key={p.id}
                        className="absolute font-mono select-none"
                        style={{
                          left: p.x,
                          top: '-30px',
                          fontSize: p.size + 'px',
                          color: `rgba(197,162,61,${p.opacity})`,
                          animation: `vz-fall ${p.dur} ${p.delay} ease-in infinite`,
                        }}
                      >
                        {p.char}
                      </span>
                    ))}
                  </div>
                )}

                {/* Document card */}
                <div
                  className="relative z-10 w-72 rounded-2xl p-6"
                  style={{
                    background: 'linear-gradient(145deg,#0A1E38,#051525)',
                    border: '1px solid rgba(197,162,61,0.4)',
                    boxShadow: '0 0 60px rgba(197,162,61,0.1)',
                    animation: 'vz-doc-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
                    opacity: phase === 'binary' ? 0.25 : 1,
                    filter: phase === 'binary' ? 'blur(3px)' : 'none',
                    transition: 'opacity 0.9s ease, filter 0.9s ease',
                  }}
                >
                  {/* Doc header stripe */}
                  <div
                    className="flex items-center justify-between -mx-6 -mt-6 mb-5 px-4 py-2 rounded-t-2xl"
                    style={{ background: 'linear-gradient(90deg,rgba(197,162,61,0.15),rgba(0,155,77,0.12))', borderBottom: '1px solid rgba(197,162,61,0.2)' }}
                  >
                    <span className="text-xs font-bold tracking-widest" style={{ color: '#C5A23D', letterSpacing: '0.15em' }}>
                      CERTIFICATE DOCUMENT
                    </span>
                    <span className="text-xs" style={{ color: '#4ADE80' }}>✓ Received</span>
                  </div>

                  {/* File icon + info */}
                  <div className="flex items-start gap-3 mb-5">
                    <div
                      className="w-11 h-14 rounded flex items-center justify-center text-xl shrink-0"
                      style={{ background: 'rgba(197,162,61,0.08)', border: '1px solid rgba(197,162,61,0.25)' }}
                    >
                      📄
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#E8E8E8' }}>
                        {fileName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>
                        {(fileSize / 1024).toFixed(1)} KB
                      </p>
                      <div
                        className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'rgba(0,155,77,0.12)', color: '#4ADE80', border: '1px solid rgba(0,155,77,0.3)' }}
                      >
                        ◎ Queued for hashing
                      </div>
                    </div>
                  </div>

                  {/* Meta rows */}
                  {[
                    { k: 'Algorithm',  v: 'SHA-256' },
                    { k: 'Network',    v: 'Hyperledger Fabric 2.5' },
                    { k: 'Channel',    v: 'certificates' },
                    { k: 'Consensus',  v: 'Raft (3 orderers)' },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex justify-between text-xs py-1.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#4A5568' }}
                    >
                      <span>{row.k}</span>
                      <span style={{ color: '#C5A23D' }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ Phase: Hashing ═══════════════════════════════════════════ */}
            {phase === 'hashing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
                {/* Title */}
                <div className="flex items-center gap-3 w-full max-w-2xl">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(197,162,61,0.5))' }} />
                  <span className="text-xs font-bold tracking-[0.28em]" style={{ color: '#C5A23D' }}>
                    SHA — 256
                  </span>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(197,162,61,0.5),transparent)' }} />
                </div>

                {/* Hash display box */}
                <div
                  className="w-full max-w-2xl rounded-2xl p-5"
                  style={{
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(197,162,61,0.4)',
                    boxShadow: '0 0 40px rgba(197,162,61,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: '#4A5568' }}>
                    <span style={{ color: '#C5A23D' }}>⬡</span>
                    <span>Cryptographic Hash Digest</span>
                    {hashSettled && (
                      <span className="ml-auto" style={{ color: '#4ADE80' }}>
                        Computation Complete ✓
                      </span>
                    )}
                  </div>
                  <p
                    className="font-mono text-sm break-all leading-7"
                    style={{ color: hashSettled ? '#F0C040' : '#C5A23D', letterSpacing: '0.04em' }}
                  >
                    {displayHash.split('').map((ch, i) => (
                      <span key={i} style={{ transition: 'color 0.2s', color: i < (hash ? hash.length - (hash.length - i) : 0) ? '#F0C040' : '#C5A23D' }}>
                        {ch}
                      </span>
                    ))}
                    {!hashSettled && (
                      <span className="vz-blink" style={{ color: '#C5A23D' }}>▋</span>
                    )}
                  </p>
                </div>

                {/* Processing dots */}
                {!hashSettled && (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: '#C5A23D',
                            animation: `vz-pulse-gold 0.9s ${i * 0.18}s ease-in-out infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono" style={{ color: '#4A5568' }}>
                      Processing cryptographic digest...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ══ Phase: Network → onward (SVG graph) ═════════════════════ */}
            {showNetwork && (
              <div className="absolute inset-0 flex flex-col">

                {/* Hash summary bar */}
                <div
                  className="mx-3 mt-2.5 mb-1.5 px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0"
                  style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(197,162,61,0.2)' }}
                >
                  <span className="text-xs font-bold shrink-0 font-mono" style={{ color: '#C5A23D' }}>SHA-256</span>
                  <span className="font-mono text-xs truncate" style={{ color: '#4A5568' }}>
                    {hash}
                  </span>
                </div>

                {/* SVG network */}
                <div className="flex-1 min-h-0">
                  <svg
                    viewBox="0 0 900 500"
                    width="100%"
                    height="100%"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <filter id="vz-glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="vz-glow-green" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="vz-glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <radialGradient id="vz-gold-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#C5A23D" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#C5A23D" stopOpacity="0"    />
                      </radialGradient>
                      <radialGradient id="vz-green-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#00C853" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#00C853" stopOpacity="0"    />
                      </radialGradient>
                      <radialGradient id="vz-red-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#EF4444" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0"    />
                      </radialGradient>

                      {/* Named paths for animateMotion */}
                      {EDGES.map((e, i) => {
                        const a = getPos(e.from), b = getPos(e.to);
                        return <path key={`p${i}`} id={`vz-ep-${i}`} d={`M${a.cx} ${a.cy} L${b.cx} ${b.cy}`} fill="none" />;
                      })}
                    </defs>

                    {/* Center glow halo */}
                    {phase !== 'network' && (
                      <ellipse
                        cx={CENTER.cx} cy={CENTER.cy} rx="130" ry="85"
                        fill="url(#vz-gold-halo)"
                        className="vz-pulse-gold-anim"
                      />
                    )}

                    {/* ── Edges ─────────────────────────────────────────────── */}
                    {EDGES.map((e, i) => {
                      const a = getPos(e.from), b = getPos(e.to);
                      const live = edgesLive;
                      const ok   = phase === 'complete';
                      const bad  = phase === 'failed';

                      let stroke =
                        e.type === 'raft'   ? 'rgba(139,92,246,0.2)'  :
                        e.type === 'gossip' ? 'rgba(59,130,246,0.12)' :
                                              'rgba(197,162,61,0.18)';

                      if (live) {
                        stroke =
                          e.type === 'main' && ok  ? 'rgba(0,200,83,0.55)'    :
                          e.type === 'main' && bad ? 'rgba(239,68,68,0.45)'   :
                          e.type === 'main'         ? 'rgba(197,162,61,0.55)' :
                          e.type === 'raft'         ? 'rgba(139,92,246,0.45)' :
                          ok                        ? 'rgba(0,200,83,0.3)'    :
                                                      'rgba(59,130,246,0.25)';
                      }

                      const dash = live && e.type === 'main' ? '6 5' :
                                   e.type === 'gossip'       ? '3 7' :
                                   e.type === 'raft' && live ? '4 5' : 'none';

                      return (
                        <g key={`edge-${i}`}>
                          <line
                            x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                            stroke={stroke}
                            strokeWidth={e.type === 'main' ? 1.5 : 1}
                            strokeDasharray={dash}
                            className={live && e.type !== 'gossip' ? 'vz-dash-anim' : ''}
                          />
                          {/* Traveling packet (propagate phase, main edges only) */}
                          {phase === 'propagate' && e.type === 'main' && (
                            <circle r="5" fill="#F0C040" filter="url(#vz-glow-gold)">
                              <animateMotion dur="1.1s" repeatCount="indefinite">
                                <mpath href={`#vz-ep-${i}`} />
                              </animateMotion>
                            </circle>
                          )}
                        </g>
                      );
                    })}

                    {/* ── Center hash diamond ───────────────────────────────── */}
                    <g style={{ animation: phase === 'network' ? 'vz-node-pop 0.5s 0s both' : 'none' }}>
                      <polygon
                        points={`${CENTER.cx},${CENTER.cy - 42} ${CENTER.cx + 34},${CENTER.cy} ${CENTER.cx},${CENTER.cy + 42} ${CENTER.cx - 34},${CENTER.cy}`}
                        fill="rgba(197,162,61,0.07)"
                        stroke="#C5A23D"
                        strokeWidth="1.5"
                        filter="url(#vz-glow-gold)"
                        className="vz-pulse-gold-anim"
                      />
                      <polygon
                        points={`${CENTER.cx},${CENTER.cy - 26} ${CENTER.cx + 21},${CENTER.cy} ${CENTER.cx},${CENTER.cy + 26} ${CENTER.cx - 21},${CENTER.cy}`}
                        fill="rgba(197,162,61,0.14)"
                        stroke="rgba(197,162,61,0.55)"
                        strokeWidth="1"
                      />
                      <text x={CENTER.cx} y={CENTER.cy - 3} textAnchor="middle" fill="#C5A23D" fontSize="9" fontFamily="monospace" fontWeight="bold">HASH</text>
                      <text x={CENTER.cx} y={CENTER.cy + 9} textAnchor="middle" fill="#C5A23D" fontSize="7.5" fontFamily="monospace">SOURCE</text>
                      <text x={CENTER.cx} y={CENTER.cy + 58} textAnchor="middle" fill="rgba(197,162,61,0.5)" fontSize="6.5" fontFamily="monospace">
                        {hash.slice(0, 8)}…{hash.slice(-8)}
                      </text>
                    </g>

                    {/* ── Peer / Orderer nodes ──────────────────────────────── */}
                    {NODES.map((node, ni) => {
                      const st      = statuses[node.id] ?? 'idle';
                      const isPeer  = node.role === 'peer';
                      const delay   = `${ni * 0.09}s`;
                      const R       = 38;

                      const fillColor =
                        st === 'matched'  ? 'rgba(0,200,83,0.16)'    :
                        st === 'failed'   ? 'rgba(239,68,68,0.16)'   :
                        st === 'querying' ? (isPeer ? 'rgba(59,130,246,0.22)' : 'rgba(139,92,246,0.22)') :
                        st === 'active'   ? (isPeer ? 'rgba(59,130,246,0.16)' : 'rgba(139,92,246,0.16)') :
                                            (isPeer ? 'rgba(59,130,246,0.07)' : 'rgba(139,92,246,0.07)');

                      const strokeColor =
                        st === 'matched'  ? '#00C853'  :
                        st === 'failed'   ? '#EF4444'  :
                        st === 'querying' ? (isPeer ? '#60A5FA' : '#A78BFA') :
                        st === 'active'   ? (isPeer ? '#3B82F6' : '#8B5CF6') :
                                            (isPeer ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)');

                      const labelColor =
                        st === 'matched' ? '#4ADE80' :
                        st === 'failed'  ? '#FCA5A5' :
                        isPeer           ? '#60A5FA' : '#A78BFA';

                      const gfx =
                        st === 'matched' ? 'url(#vz-glow-green)' :
                        st === 'failed'  ? 'url(#vz-glow-red)'   :
                        (st === 'active' || st === 'querying') ? 'url(#vz-glow-gold)' : 'none';

                      return (
                        <g key={node.id} style={{ animation: phase === 'network' ? `vz-node-pop 0.5s ${delay} both` : 'none' }}>

                          {/* Halo behind node */}
                          {st === 'matched' && (
                            <circle cx={node.cx} cy={node.cy} r={R + 22} fill="url(#vz-green-halo)" className="vz-pulse-gold-anim" />
                          )}
                          {st === 'failed' && (
                            <circle cx={node.cx} cy={node.cy} r={R + 18} fill="url(#vz-red-halo)" />
                          )}

                          {/* Main circle */}
                          <circle
                            cx={node.cx} cy={node.cy} r={R}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={st === 'idle' ? 1 : 1.8}
                            filter={gfx}
                            style={
                              st === 'matched' ? { animation: 'vz-burst 0.55s cubic-bezier(0.34,1.56,0.64,1) both' } :
                              st === 'querying' ? { animation: 'vz-pulse-gold 1.2s ease-in-out infinite' } : {}
                            }
                          />

                          {/* Spinning query arc (SVG native rotation) */}
                          {st === 'querying' && (
                            <circle
                              cx={node.cx} cy={node.cy} r={R + 7}
                              fill="none"
                              stroke={isPeer ? '#3B82F6' : '#8B5CF6'}
                              strokeWidth="2"
                              strokeDasharray="22 110"
                            >
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from={`0 ${node.cx} ${node.cy}`}
                                to={`360 ${node.cx} ${node.cy}`}
                                dur="1.4s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}

                          {/* Status icon */}
                          {st === 'matched' && (
                            <text x={node.cx} y={node.cy - 14} textAnchor="middle" fill="#4ADE80" fontSize="13">✓</text>
                          )}
                          {st === 'failed' && (
                            <text x={node.cx} y={node.cy - 14} textAnchor="middle" fill="#FCA5A5" fontSize="13">✗</text>
                          )}
                          {st === 'querying' && (
                            <text x={node.cx} y={node.cy - 14} textAnchor="middle" fill={isPeer ? '#60A5FA' : '#A78BFA'} fontSize="7" fontFamily="monospace">QUERY</text>
                          )}

                          {/* Label */}
                          <text
                            x={node.cx}
                            y={node.cy + (st === 'matched' || st === 'failed' || st === 'querying' ? 5 : -3)}
                            textAnchor="middle"
                            fill={labelColor}
                            fontSize="10.5"
                            fontWeight="bold"
                            fontFamily="system-ui, sans-serif"
                          >
                            {node.label}
                          </text>
                          <text
                            x={node.cx}
                            y={node.cy + (st === 'matched' || st === 'failed' || st === 'querying' ? 17 : 9)}
                            textAnchor="middle"
                            fill="rgba(100,116,139,0.85)"
                            fontSize="7.5"
                            fontFamily="monospace"
                          >
                            {node.sub}
                          </text>

                          {/* Role pill */}
                          <rect
                            x={node.cx - 19} y={node.cy + R + 5}
                            width="38" height="13" rx="6.5"
                            fill={isPeer ? 'rgba(59,130,246,0.18)' : 'rgba(139,92,246,0.18)'}
                            stroke={isPeer ? 'rgba(59,130,246,0.4)' : 'rgba(139,92,246,0.4)'}
                            strokeWidth="0.6"
                          />
                          <text
                            x={node.cx} y={node.cy + R + 14.5}
                            textAnchor="middle"
                            fill={isPeer ? '#60A5FA' : '#A78BFA'}
                            fontSize="7"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {isPeer ? 'PEER' : 'ORDERER'}
                          </text>

                          {/* CouchDB indicator for querying peers */}
                          {st === 'querying' && isPeer && (
                            <text
                              x={node.cx} y={node.cy + R + 32}
                              textAnchor="middle"
                              fill="rgba(59,130,246,0.65)"
                              fontSize="7"
                              fontFamily="monospace"
                            >
                              ⬡ CouchDB
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Legend */}
                    <text x="20"  y="486" fill="rgba(139,92,246,0.5)" fontSize="8" fontFamily="monospace">● Raft Orderers</text>
                    <text x="140" y="486" fill="rgba(59,130,246,0.5)"  fontSize="8" fontFamily="monospace">● Endorsing Peers</text>
                    <text x="280" y="486" fill="rgba(197,162,61,0.5)"  fontSize="8" fontFamily="monospace">◆ Hash Source</text>
                    <text x="390" y="486" fill="rgba(0,200,83,0.5)"    fontSize="8" fontFamily="monospace">─ Active Channel</text>
                    <text x="500" y="486" fill="rgba(197,162,61,0.35)" fontSize="8" fontFamily="monospace">··· Gossip Protocol</text>
                  </svg>
                </div>
              </div>
            )}

            {/* ══ Final result overlay ══════════════════════════════════════ */}
            {isFinal && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(2,11,24,0.82)', backdropFilter: 'blur(6px)' }}
              >
                <div
                  className="rounded-2xl p-8 w-96 text-center"
                  style={{
                    background: isSuccess
                      ? 'linear-gradient(145deg,#04141F,#051F0F)'
                      : 'linear-gradient(145deg,#04141F,#1A0505)',
                    border: `1.5px solid ${isSuccess ? 'rgba(0,200,83,0.5)' : 'rgba(239,68,68,0.5)'}`,
                    boxShadow: isSuccess
                      ? '0 0 70px rgba(0,200,83,0.12)'
                      : '0 0 70px rgba(239,68,68,0.12)',
                    animation: 'vz-burst 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{
                      background: isSuccess ? 'rgba(0,200,83,0.14)' : 'rgba(239,68,68,0.14)',
                      border: `2px solid ${isSuccess ? '#00C853' : '#EF4444'}`,
                      boxShadow: isSuccess ? '0 0 35px rgba(0,200,83,0.3)' : '0 0 35px rgba(239,68,68,0.3)',
                    }}
                  >
                    {isSuccess
                      ? <CheckCircle2 className="w-10 h-10" style={{ color: '#00C853' }} />
                      : <XCircle     className="w-10 h-10" style={{ color: '#EF4444' }} />
                    }
                  </div>

                  <h2 className="text-2xl font-bold mb-2" style={{ color: isSuccess ? '#4ADE80' : '#FCA5A5' }}>
                    {isSuccess ? 'Certificate Verified' : 'Verification Failed'}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                    {isSuccess
                      ? 'This certificate is authentic and its hash was matched on the Hyperledger Fabric distributed ledger.'
                      : 'No matching hash record was found on any peer node. This document may not have been issued through this platform.'}
                  </p>

                  {isSuccess && (
                    <div className="mt-5 space-y-2 text-left">
                      {[
                        'Hash matched on distributed ledger',
                        'Block confirmed by MAJORITY endorsement',
                        'Issuer digital signature: AUTHENTIC',
                        'Certificate status: NOT REVOKED',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5 text-xs">
                          <span style={{ color: '#00C853' }}>✓</span>
                          <span style={{ color: '#CBD5E1' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className="mt-5 pt-4 text-xs"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#374151' }}
                  >
                    Hyperledger Fabric 2.5 · Egypt Vision 2030 · SME Cert Platform
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Technical log panel ────────────────────────────────────────── */}
          <div
            className="w-64 shrink-0 hidden md:flex flex-col"
            style={{ borderLeft: '1px solid rgba(197,162,61,0.13)', background: '#010912' }}
          >
            <div
              className="px-3 py-2 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
              style={{ borderBottom: '1px solid rgba(197,162,61,0.1)', color: '#C5A23D', letterSpacing: '0.15em' }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4ADE80', animation: 'vz-pulse-gold 1.5s ease-in-out infinite' }} />
              VERIFY LOG
            </div>

            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-2.5 font-mono text-xs leading-5 space-y-px"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(197,162,61,0.2) transparent' }}
            >
              {logLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color:
                      line.startsWith('> ✓') ? '#4ADE80' :
                      line.startsWith('> ✗') ? '#FCA5A5' :
                      line.startsWith('> ══') ? '#C5A23D' :
                      '#374151',
                  }}
                >
                  {line}
                </div>
              ))}
              {!isFinal && <span className="vz-blink" style={{ color: '#C5A23D' }}>▋</span>}
            </div>

            <div
              className="px-3 py-2 flex items-center justify-between shrink-0 text-xs"
              style={{ borderTop: '1px solid rgba(197,162,61,0.1)', background: '#020F22' }}
            >
              <span style={{ color: '#1F2937' }}>
                ch: <span style={{ color: '#C5A23D' }}>certificates</span>
              </span>
              <span style={{ color: '#1F2937' }}>
                Fabric <span style={{ color: '#C5A23D' }}>2.5</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
