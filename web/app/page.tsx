'use client';

import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CircleDot, Radio, Users, WalletCards, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const seed = [
  { wallet: '0x8B2…91F', side: 'YES', amount: 1.2, fresh: true, time: '12s' },
  { wallet: '0x1A7…D04', side: 'NO', amount: 0.6, fresh: true, time: '38s' },
  { wallet: '0x8B2…91F', side: 'YES', amount: 0.4, fresh: false, time: '1m' },
  { wallet: '0xD39…AA8', side: 'YES', amount: 0.9, fresh: true, time: '2m' },
];

export default function Home() {
  const [events, setEvents] = useState(seed);
  const [turn, setTurn] = useState(0);
  const unique = useMemo(() => new Set(events.map((event) => event.wallet)).size, [events]);
  const total = events.reduce((sum, event) => sum + event.amount, 0);
  const yes = events.filter((event) => event.side === 'YES').reduce((sum, event) => sum + event.amount, 0);
  const confidence = Math.round((yes / total) * 100);

  function simulate() {
    const repeat = turn % 2 === 0;
    const wallet = repeat ? '0x1A7…D04' : `0x${(734 + turn).toString(16).toUpperCase()}…C2E`;
    setEvents((current) => [{ wallet, side: turn % 3 === 0 ? 'NO' : 'YES', amount: 0.25, fresh: !current.some((e) => e.wallet === wallet), time: 'now' }, ...current]);
    setTurn((value) => value + 1);
  }

  return (
    <main className="min-h-screen overflow-hidden px-5 py-6 text-slate-100 sm:px-8 lg:px-12">
      <div className="aurora aurora-one" /><div className="aurora aurora-two" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10"><CircleDot className="size-5 text-cyan-300" /></span>
          <div><p className="font-semibold tracking-tight">MARKET PULSE</p><p className="text-xs text-slate-400">Participation analytics on Ritual</p></div>
        </div>
        <div className="live"><Radio className="size-3.5" /> LOCAL SIMULATION</div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 pb-12 pt-10 lg:grid-cols-[1.35fr_.65fr]">
        <div>
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-cyan-300"><Zap className="size-4" /> Autonomous market #01</div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-6xl">Will ETH close above <span className="text-gradient">$4,000?</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">A self-resolving prediction market with transparent, on-chain participation signals. Repeat bets add activity—never fake reach.</p>

          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Users />} label="Unique bettors" value={String(unique)} accent />
            <Stat icon={<Activity />} label="Total bets" value={String(events.length)} />
            <Stat icon={<WalletCards />} label="Pool size" value={`${total.toFixed(2)} RIT`} />
            <Stat icon={<ArrowUpRight />} label="YES signal" value={`${confidence}%`} />
          </div>

          <div className="panel mt-6 p-5 sm:p-7">
            <div className="mb-6 flex items-end justify-between">
              <div><p className="eyebrow">Live market signal</p><h2 className="mt-1 text-xl font-semibold">Crowd confidence</h2></div>
              <span className="font-mono text-2xl font-semibold text-cyan-300">{confidence}% YES</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-fuchsia-400/15"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all" style={{ width: `${confidence}%` }} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="bet yes">YES <strong>{yes.toFixed(2)} RIT</strong></button>
              <button className="bet no">NO <strong>{(total - yes).toFixed(2)} RIT</strong></button>
            </div>
          </div>
        </div>

        <aside className="panel flex min-h-[480px] flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Contract events</p><h2 className="mt-1 text-xl font-semibold">Participation feed</h2></div><span className="pulse-dot" /></div>
          <div className="my-5 h-px bg-white/10" />
          <div className="flex-1 space-y-3" aria-live="polite">
            {events.slice(0, 6).map((event, index) => (
              <div className="event" key={`${event.wallet}-${index}`}>
                <div className={`event-icon ${event.fresh ? 'fresh' : ''}`}>{event.fresh ? <Users /> : <Activity />}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-mono text-sm">{event.wallet}</span>{event.fresh && <span className="new">NEW</span>}</div><p className="mt-1 text-xs text-slate-500">{event.fresh ? 'First participation' : 'Repeat activity'} · {event.time}</p></div>
                <div className="text-right"><p className={event.side === 'YES' ? 'text-emerald-300' : 'text-fuchsia-300'}>{event.side}</p><p className="text-xs text-slate-400">{event.amount} RIT</p></div>
              </div>
            ))}
          </div>
          <Button onClick={simulate} className="mt-5 h-11 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"><Zap /> Simulate next bet</Button>
          <p className="mt-3 text-center text-[11px] text-slate-500">Alternates repeat and first-time wallets</p>
        </aside>
      </section>
      <footer className="relative z-10 mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-500"><span>Built by wakbowaa · Ritual Chain Workshop 2</span><span>5 contract tests passing · Testnet-safe local demo</span></footer>
    </main>
  );
}

function Stat({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`stat ${accent ? 'stat-accent' : ''}`}><div className="mb-5 flex items-center justify-between text-slate-500"><span className="size-4">{icon}</span><span className="text-[10px] uppercase tracking-widest">Live</span></div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>;
}

