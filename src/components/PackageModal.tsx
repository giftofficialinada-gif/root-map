import { useState, useEffect } from 'react';
import { Package, PACKAGE_SIZES, CoolType, PackageSize, COOL_LABELS } from '../types';

interface Props {
  pkg?: Package;
  defaultDate: string;
  scannedCode?: string;
  onSave: (data: Omit<Package, 'id' | 'routeOrder'>) => void;
  onClose: () => void;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const [lng, lat] = data[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=jp`,
      { headers: { 'Accept-Language': 'ja,en' } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

export default function PackageModal({ pkg, defaultDate, scannedCode, onSave, onClose }: Props) {
  const [customerName, setCustomerName] = useState(pkg?.customerName ?? '');
  const [address, setAddress] = useState(pkg?.address ?? '');
  const [size, setSize] = useState<PackageSize>(pkg?.size ?? 60);
  const [cool, setCool] = useState<CoolType>(pkg?.cool ?? 'none');
  const [collect, setCollect] = useState(pkg?.collect ?? false);
  const [collectAmount, setCollectAmount] = useState(pkg?.collectAmount?.toString() ?? '');
  const [notes, setNotes] = useState(pkg?.notes ?? '');
  const [date, setDate] = useState(pkg?.date ?? defaultDate);
  const [lat, setLat] = useState(pkg?.lat);
  const [lng, setLng] = useState(pkg?.lng);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [error, setError] = useState('');

  useEffect(() => { if (pkg?.lat) setGeocodeStatus('ok'); }, [pkg]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true); setGeocodeStatus('idle');
    const r = await geocodeAddress(address);
    setGeocoding(false);
    if (r) { setLat(r.lat); setLng(r.lng); setGeocodeStatus('ok'); }
    else setGeocodeStatus('fail');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { setError('名前を入力してください'); return; }
    if (!address.trim()) { setError('住所を入力してください'); return; }
    onSave({
      customerName: customerName.trim(), address: address.trim(), size, cool,
      collect, collectAmount: collect && collectAmount ? parseInt(collectAmount, 10) : undefined,
      notes: notes.trim() || undefined, date, lat, lng, delivered: pkg?.delivered ?? false,
    });
  };

  const coolColors: Record<CoolType, string> = {
    none: 'var(--ink)', refrigerated: 'var(--cool)', frozen: 'var(--frozen)',
  };

  return (
    <div style={{ background: 'rgba(28,25,23,0.4)' }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)' }} className="flex items-center justify-between px-5 py-4 sticky top-0"
          // @ts-ignore
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 18 }} className="font-bold">
            {pkg ? '荷物を編集' : '荷物を追加'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--ink-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <Field label="配達日">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </Field>
          <Field label="お客様名">
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="例：田中 花子" className={inp} />
          </Field>
          <Field label="住所">
            <div className="flex gap-2">
              <input type="text" value={address}
                onChange={(e) => { setAddress(e.target.value); setGeocodeStatus('idle'); }}
                placeholder="例：名古屋市南区豊田1-7-17" className={`${inp} flex-1`} />
              <button type="button" onClick={handleGeocode} disabled={geocoding || !address.trim()}
                style={{ background: geocodeStatus === 'ok' ? 'var(--delivered)' : 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 12 }}
                className="px-3 py-2 font-medium disabled:opacity-40 whitespace-nowrap">
                {geocoding ? '取得中…' : geocodeStatus === 'ok' ? '✓取得済' : '📍取得'}
              </button>
            </div>
            {geocodeStatus === 'fail' && (
              <p style={{ color: 'var(--accent)', fontSize: 11 }} className="mt-1">取得失敗（保存は可能です）</p>
            )}
          </Field>

          <Field label="サイズ">
            <div className="grid grid-cols-4 gap-1.5">
              {PACKAGE_SIZES.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)}
                  style={{
                    borderRadius: 8, fontSize: 12, padding: '6px 0', fontFamily: 'var(--font-mono)',
                    background: size === s ? 'var(--ink)' : 'transparent',
                    color: size === s ? '#fff' : 'var(--ink-muted)',
                    border: `1px solid ${size === s ? 'var(--ink)' : 'var(--border)'}`,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="クール">
            <div className="flex gap-2">
              {(['none', 'refrigerated', 'frozen'] as CoolType[]).map((c) => (
                <button key={c} type="button" onClick={() => setCool(c)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13,
                    background: cool === c ? coolColors[c] : 'transparent',
                    color: cool === c ? '#fff' : 'var(--ink-muted)',
                    border: `1px solid ${cool === c ? coolColors[c] : 'var(--border)'}`,
                  }}>
                  {COOL_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setCollect(!collect)}
                style={{ width: 44, height: 24, borderRadius: 12, background: collect ? 'var(--accent)' : 'var(--border)', padding: '3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: collect ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 14 }}>コレクト（代引き）</span>
            </label>
            {collect && (
              <div className="mt-2 flex items-center gap-2">
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>金額</span>
                <input type="number" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="0" className={`${inp} flex-1`} min="0" />
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>円</span>
              </div>
            )}
          </div>

          <Field label="備考（任意）">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="例：玄関前に置く" className={inp} />
          </Field>

          {scannedCode && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--washi)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>▦</span>
              <div>
                <p style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>スキャン結果</p>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontSize: 13 }}>{scannedCode}</p>
              </div>
            </div>
          )}
          {error && <p style={{ color: 'var(--accent)', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          <button type="submit"
            style={{ width: '100%', background: 'var(--ink)', color: '#fff', borderRadius: 14, padding: '14px 0', fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.1em' }}>
            {pkg ? '更新する' : '追加する'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inp = [
  'w-full px-4 py-2.5 text-sm outline-none',
  'bg-transparent',
].join(' ');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em' }}
        className="block mb-1.5 uppercase">{label}</label>
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--washi)' }}>
        {children}
      </div>
    </div>
  );
}

export { geocodeAddress };
