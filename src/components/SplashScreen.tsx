import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(onDone, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'var(--washi)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20,
        opacity: phase === 'out' ? 0 : phase === 'in' ? 0 : 1,
        transition: phase === 'in' ? 'opacity 0.8s ease-out' : phase === 'out' ? 'opacity 0.7s ease-in' : 'none',
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        border: '2px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Truck size={36} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 22, fontWeight: 700, letterSpacing: '0.12em' }}>
          荷物ルートマップ
        </p>
        <div style={{ width: 40, height: 2, background: 'var(--accent)', margin: '10px auto 0', borderRadius: 1 }} />
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.2em', marginTop: 4 }}>
        DELIVERY ROUTE MAP
      </p>
    </div>
  );
}
