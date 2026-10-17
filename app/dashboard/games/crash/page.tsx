"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "WAITING" | "RUNNING" | "CRASHED";
interface CrashState { roundId: string; status: Status; multiplier: number; serverSeedHash: string; serverSeed: string | null; countdown: number; }

function formatKES(cents: number) { return "KES " + Math.floor(cents / 100).toLocaleString("en-KE"); }

export default function CrashPage() {
  const [gameState, setGameState] = useState<CrashState | null>(null);
  const [amount, setAmount] = useState("100");
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutResult, setCashoutResult] = useState<{payoutCents:number;multiplier:number}|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [graphPoints, setGraphPoints] = useState<{x:number;y:number}[]>([{x:0,y:0}]);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const startTimeRef = useRef<number|null>(null);
  const W=520,H=280,PAD=40;

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/games/crash/state");
        if (!res.ok) return;
        const data: CrashState = await res.json();
        setGameState(prev => {
          if (prev && prev.roundId !== data.roundId) {
            setBetPlaced(false); setCashedOut(false); setCashoutResult(null);
            setError(null); setGraphPoints([{x:0,y:0}]); startTimeRef.current = null;
          }
          if (data.status === "RUNNING") {
            if (!startTimeRef.current) startTimeRef.current = Date.now();
            const t = (Date.now() - startTimeRef.current) / 1000;
            const px = Math.min(t * 18, W - PAD);
            const py = Math.min((data.multiplier - 1) * 60, H - PAD);
            setGraphPoints(pts => { const last = pts[pts.length-1]; if(Math.abs(last.x-px)<3) return pts; return [...pts.slice(-80),{x:px,y:py}]; });
          }
          if (data.status === "CRASHED") setGraphPoints([{x:0,y:0}]);
          return data;
        });
      } catch { /* ignore */ }
    }
    poll();
    intervalRef.current = setInterval(poll, 300);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handleBet() {
    setError(null);
    const res = await fetch("/api/games/crash/bet", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({amountKes:Number(amount)}) });
    const data = await res.json().catch(()=>null);
    if (!res.ok) { setError(data?.error??"Bet failed."); return; }
    setBetPlaced(true);
  }

  async function handleCashout() {
    setError(null);
    const res = await fetch("/api/games/crash/cashout", {method:"POST"});
    const data = await res.json().catch(()=>null);
    if (!res.ok) { setError(data?.error??"Cashout failed."); return; }
    setCashedOut(true);
    setCashoutResult({payoutCents:data.payoutCents, multiplier:data.multiplier});
  }

  const status = gameState?.status ?? "WAITING";
  const multiplier = gameState?.multiplier ?? 1.0;
  const pathD = graphPoints.length < 2 ? "" : graphPoints.map((p,i) => `${i===0?"M":"L"} ${PAD+p.x} ${H-PAD-p.y}`).join(" ");
  const rocketX = PAD + (graphPoints[graphPoints.length-1]?.x ?? 0);
  const rocketY = H - PAD - (graphPoints[graphPoints.length-1]?.y ?? 0);
  const multColor = status==="CRASHED" ? "#ef4444" : multiplier>=2 ? "#22c55e" : "#f0b429";

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-page">
      <aside className="hidden lg:flex w-52 flex-col border-r border-border bg-surface p-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-win font-medium">
            <span className="h-2 w-2 rounded-full bg-win animate-pulse" />Live round
          </div>
          <p className="mt-1 text-xs text-text-muted font-mono">#{gameState?.roundId?.slice(-6)??"------"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted px-1 pb-1">Navigate</p>
          {[["🏠","Lobby","/dashboard"],["📋","History","/dashboard/history"],["🔍","Verify","/verify"]].map(([e,l,h])=>(
            <a key={h} href={h} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:bg-card hover:text-text transition-colors">{e} {l}</a>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted px-1 pb-1">Games</p>
          {[["🎲","Dice","dice"],["🎡","Wheel","lucky-wheel"],["📍","Plinko","plinko"],["🎯","Roulette","mini-roulette"],["⚽","Penalty","penalty-shootout"],["🎰","Slots","slots"],["🪙","Coin","coin-toss"]].map(([e,l,id])=>(
            <a key={id} href={`/dashboard/games/${id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:bg-card hover:text-text transition-colors">{e} {l}</a>
          ))}
        </div>
        <div className="mt-auto rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-text mb-1">Seed hash</p>
          <p className="break-all font-mono text-[10px] text-text-muted">{gameState?.serverSeedHash?.slice(0,24)??"---"}…</p>
        </div>
      </aside>

      <div className="w-64 flex-shrink-0 border-r border-border bg-surface p-4 flex flex-col gap-3 overflow-y-auto">
        <h2 className="text-sm font-bold text-text">Place Bet</h2>
        <div className="space-y-1.5">
          <label className="text-xs text-text-muted">Amount (KES)</label>
          <input className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none" inputMode="numeric" placeholder="100" value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))} disabled={betPlaced} />
          <div className="grid grid-cols-4 gap-1">
            {["100","500","1000","5000"].map(v=>(
              <button key={v} type="button" onClick={()=>setAmount(v)} className="rounded-md border border-border bg-card py-1 text-xs text-text-muted hover:text-text hover:border-accent/40 transition-colors">{v}</button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {!betPlaced && status==="WAITING" && (
          <motion.button onClick={handleBet} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-page hover:bg-accent-hover" whileTap={{scale:0.97}}>
            Bet KES {Number(amount).toLocaleString()}
          </motion.button>
        )}
        {betPlaced && !cashedOut && status==="RUNNING" && (
          <motion.button onClick={handleCashout} className="w-full rounded-xl bg-win py-3 text-sm font-bold text-white" animate={{scale:[1,1.02,1]}} transition={{repeat:Infinity,duration:0.7}} whileTap={{scale:0.96}}>
            CASH OUT @ {multiplier.toFixed(2)}×
            <span className="block text-xs font-normal opacity-80">≈ {formatKES(Math.floor(Number(amount)*100*multiplier))}</span>
          </motion.button>
        )}
        {betPlaced && status==="WAITING" && !cashedOut && <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-center text-xs text-accent">✅ Bet placed. Waiting…</div>}
        {betPlaced && status==="CRASHED" && !cashedOut && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-xs text-danger">💸 You lost KES {Number(amount).toLocaleString()}.</div>}
        {cashedOut && cashoutResult && <div className="rounded-xl border border-win/30 bg-win/10 p-3 text-center"><p className="text-xs font-bold text-win">Cashed out @ {cashoutResult.multiplier.toFixed(2)}× 🎉</p><p className="text-xs text-win">+{formatKES(cashoutResult.payoutCents)}</p></div>}
        {!betPlaced && status==="RUNNING" && <div className="rounded-xl border border-border bg-card p-3 text-center text-xs text-text-muted">Round in progress. Wait for next.</div>}
        <div className="border-t border-border mt-1" />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-card p-3"><p className="text-xs text-text-muted">Status</p><p className={`text-sm font-bold mt-0.5 ${status==="RUNNING"?"text-win":status==="CRASHED"?"text-danger":"text-accent"}`}>{status==="WAITING"?`${gameState?.countdown??"…"}s`:status}</p></div>
          <div className="rounded-lg bg-card p-3"><p className="text-xs text-text-muted">Multiplier</p><p className="text-sm font-bold mt-0.5 text-text">{multiplier.toFixed(2)}×</p></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative flex-1 bg-gradient-to-br from-page via-surface to-page">
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[1,2,3,4,5].map(i=><line key={i} x1="0" y1={`${i*20}%`} x2="100%" y2={`${i*20}%`} stroke="#888" strokeWidth="1" strokeDasharray="4 4"/>)}
            {[1,2,3,4,5,6].map(i=><line key={i} x1={`${i*16.6}%`} y1="0" x2={`${i*16.6}%`} y2="100%" stroke="#888" strokeWidth="1" strokeDasharray="4 4"/>)}
          </svg>
          <div className="absolute right-3 top-0 h-full flex flex-col justify-between py-4 text-xs text-text-muted">
            {["3.4×","3.0×","2.5×","2.0×","1.5×","1.0×"].map(l=><span key={l}>{l}</span>)}
          </div>
          <div className="absolute bottom-2 left-10 right-10 flex justify-between text-xs text-text-muted">
            {["0s","3s","6s","9s","12s","15s","18s"].map(l=><span key={l}>{l}</span>)}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={multColor} stopOpacity="0.6"/>
                <stop offset="100%" stopColor={multColor} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {pathD && <path d={pathD+` L ${rocketX} ${H-PAD} L ${PAD} ${H-PAD} Z`} fill="url(#curveGlow)" opacity="0.15"/>}
            {pathD && <path d={pathD} fill="none" stroke={multColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
            {status==="RUNNING" && <text x={rocketX-12} y={rocketY+8} fontSize="24" style={{userSelect:"none"}}>🚀</text>}
            {status==="CRASHED" && <text x={rocketX-12} y={rocketY+8} fontSize="24" style={{userSelect:"none"}}>💥</text>}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div className="text-center" key={status} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}>
              {status==="WAITING" ? (
                <><p className="text-7xl font-black" style={{color:multColor}}>{gameState?.countdown??"…"}</p><p className="text-sm text-text-muted mt-1">Place your bet now</p></>
              ) : (
                <><motion.p key={Math.floor(multiplier*10)} className="text-7xl font-black tabular-nums" style={{color:multColor}} initial={{scale:0.95}} animate={{scale:1}}>{multiplier.toFixed(2)}×</motion.p>
                {status==="CRASHED" && <p className="text-lg font-bold text-danger mt-1">CRASHED</p>}
                {status==="RUNNING" && <p className="text-xs text-text-muted mt-1">CURRENT PAYOUT</p>}</>
              )}
            </motion.div>
          </div>
        </div>
        <div className="border-t border-border bg-surface">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <span className="h-2 w-2 rounded-full bg-win animate-pulse"/>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Players this round</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border max-h-32 overflow-y-auto">
            {[{n:"Kamau_22",a:500},{n:"WanjikuBet",a:200},{n:"NairobiAce",a:1000},{n:"MbuguaX",a:150},{n:"Steph_KE",a:300},{n:"GrayBird",a:750}].map((p,i)=>(
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{p.n[0]}</div>
                  <p className="text-xs text-text">{p.n}</p>
                </div>
                <p className="text-xs text-text-muted">KES {p.a.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
