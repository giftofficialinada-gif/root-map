import { useState, useEffect, useRef, useMemo } from 'react';
import { Package, PACKAGE_SIZES, CoolType, PackageSize, COOL_LABELS, TimeSlot, TIME_SLOT_LABELS, TIME_SLOT_COLORS } from '../types';
import { useAppStore } from '../store/useAppStore';

interface Props {
  pkg?: Package;
  defaultDate: string;
  scannedCode?: string;
  onSave: (data: Omit<Package, 'id' | 'routeOrder' | 'userId'>) => void;
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

async function lookupZip(zip: string): Promise<string | null> {
  const digits = zip.replace(/\D/g, '');
  if (digits.length !== 7) return null;
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
    const data = await res.json();
    if (data.results?.[0]) {
      const r = data.results[0];
      return `${r.address1}${r.address2}${r.address3}`;
    }
  } catch { /* ignore */ }
  return null;
}

export default function PackageModal({ pkg, defaultDate, scannedCode, onSave, onClose }: Props) {
  const { getAllForUser } = useAppStore();

  const [customerName, setCustomerName] = useState(pkg?.customerName ?? '');
  const [address, setAddress] = useState(pkg?.address ?? '');
  const [zip, setZip] = useState('');
  const [zipStatus, setZipStatus] = useState<'idle' | 'loading' | 'ok' | 'notfound'>('idle');
  const [size, setSize] = useState<PackageSize>(pkg?.size ?? 60);
  const [cool, setCool] = useState<CoolType>(pkg?.cool ?? 'none');
  const [nekoposu, setNekoposu] = useState(pkg?.nekoposu ?? false);
  const [kogire, setKogire] = useState(pkg?.kogire ?? false);
  const [collect, setCollect] = useState(pkg?.collect ?? false);
  const [collectAmount, setCollectAmount] = useState(pkg?.collectAmount?.toString() ?? '');
  const [cashOnDelivery, setCashOnDelivery] = useState(pkg?.cashOnDelivery ?? false);
  const [cashOnDeliveryAmount, setCashOnDeliveryAmount] = useState(pkg?.cashOnDeliveryAmount?.toString() ?? '');
  const [timeSlot, setTimeSlot] = useState<TimeSlot | ''>(pkg?.timeSlot ?? '');
  const [notes, setNotes] = useState(pkg?.notes ?? '');
  const [date, setDate] = useState(pkg?.date ?? defaultDate);
  const [lat, setLat] = useState(pkg?.lat);
  const [lng, setLng] = useState(pkg?.lng);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);
  const suggRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (pkg?.lat) setGeocodeStatus('ok'); }, [pkg]);

  // 過去の顧客一覧（重複除去・最新順）
  const pastCustomers = useMemo(() => {
    const all = getAllForUser();
    const seen = new Set<string>();
    const result: { customerName: string; address: string }[] = [];
    for (const p of [...all].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!seen.has(p.customerName)) {
        seen.add(p.customerName);
        result.push({ customerName: p.customerName, address: p.address });
      }
    }
    return result;
  }, []);

  // 名前入力に合わせた候補絞り込み
  const suggestions = useMemo(() => {
    if (!customerName.trim()) return pastCustomers.slice(0, 5);
    const q = customerName.toLowerCase();
    return pastCustomers.filter(c =>
      c.customerName.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [customerName, pastCustomers]);

  // 郵便番号が7桁になったら自動検索
  useEffect(() => {
    const digits = zip.replace(/\D/g, '');
    if (digits.length !== 7) { if (zipStatus === 'ok') setZipStatus('idle'); return; }
    setZipStatus('loading');
    lookupZip(digits).then((result) => {
      if (result) {
        setAddress(result);
        setZipStatus('ok');
        setGeocodeStatus('idle');
        // フォーカスを住所欄に移して番地を続けて入力できるように
        setTimeout(() => {
          if (addressRef.current) {
            addressRef.current.focus();
            const len = addressRef.current.value.length;
            addressRef.current.setSelectionRange(len, len);
          }
        }, 50);
      } else {
        setZipStatus('notfound');
      }
    });
  }, [zip]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true); setGeocodeStatus('idle');
    const r = await geocodeAddress(address);
    setGeocoding(false);
    if (r) { setLat(r.lat); setLng(r.lng); setGeocodeStatus('ok'); }
    else setGeocodeStatus('fail');
  };

  const applySuggestion = (s: { customerName: string; address: string }) => {
    setCustomerName(s.customerName);
    setAddress(s.address);
    setShowSuggestions(false);
    setGeocodeStatus('idle');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { setError('名前を入力してください'); return; }
    if (!address.trim()) { setError('住所を入力してください'); return; }
    onSave({
      customerName: customerName.trim(), address: address.trim(), size, cool,
      nekoposu, kogire,
      collect, collectAmount: collect && collectAmount ? parseInt(collectAmount, 10) : undefined,
      cashOnDelivery, cashOnDeliveryAmount: cashOnDelivery && cashOnDeliveryAmount ? parseInt(cashOnDeliveryAmount, 10) : undefined,
      timeSlot: timeSlot || undefined,
      notes: notes.trim() || undefined, date, lat, lng, delivered: pkg?.delivered ?? false,
    });
  };

  const coolColors: Record<CoolType, string> = {
    none: 'var(--ink)', refrigerated: 'var(--cool)', frozen: 'var(--frozen)',
  };

  return (
    <div style={{ background: 'rgba(28,25,23,0.4)' }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); setShowSuggestions(false); }}>
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10">
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 18 }} className="font-bold">
            {pkg ? '荷物を編集' : '荷物を追加'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--ink-muted)', fontSize: 22, lineHeight: 1, background: 'transparent' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <Field label="配達日">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </Field>

          {/* お客様名（履歴候補付き） */}
          <div style={{ position: 'relative' }}>
            <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em' }}
              className="block mb-1.5 uppercase">お客様名</label>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--washi)' }}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="例：田中 花子"
                className={inp}
                autoComplete="off"
              />
            </div>

            {/* サジェストドロップダウン */}
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggRef}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(28,25,23,0.12)', marginTop: 4 }}>
                {customerName.trim() === '' && (
                  <div style={{ padding: '8px 14px 4px', fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 10, letterSpacing: '0.1em' }}>
                    最近のお客様
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button key={i} type="button"
                    onMouseDown={() => applySuggestion(s)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'transparent', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>{s.customerName}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11 }} className="truncate">{s.address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 郵便番号 */}
          <div>
            <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em' }}
              className="block mb-1.5 uppercase">郵便番号（住所自動補完）</label>
            <div style={{ border: `1px solid ${zipStatus === 'ok' ? 'var(--delivered)' : 'var(--border)'}`, borderRadius: 12, background: 'var(--washi)', display: 'flex', alignItems: 'center' }}>
              <span style={{ paddingLeft: 14, color: 'var(--ink-muted)', fontSize: 13, flexShrink: 0 }}>〒</span>
              <input
                type="text"
                inputMode="numeric"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="1234567"
                maxLength={8}
                style={{ flex: 1, background: 'transparent', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)', padding: '10px 12px', letterSpacing: '0.1em' }}
              />
              <span style={{ paddingRight: 12, fontSize: 11, fontFamily: 'var(--font-sans)', color: zipStatus === 'ok' ? 'var(--delivered)' : zipStatus === 'notfound' ? 'var(--accent)' : 'var(--ink-muted)', flexShrink: 0 }}>
                {zipStatus === 'loading' ? '検索中…' : zipStatus === 'ok' ? '✓補完済' : zipStatus === 'notfound' ? '見つからず' : '7桁入力で自動補完'}
              </span>
            </div>
          </div>

          {/* 住所（番地を追加） */}
          <Field label="住所（番地まで入力）">
            <div className="flex gap-2">
              <input
                ref={addressRef}
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setGeocodeStatus('idle'); }}
                placeholder="例：名古屋市南区豊田1-7-17"
                className={`${inp} flex-1`}
              />
              <button type="button" onClick={handleGeocode} disabled={geocoding || !address.trim()}
                style={{ background: geocodeStatus === 'ok' ? 'var(--delivered)' : 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 12, flexShrink: 0 }}
                className="px-3 py-2 font-medium disabled:opacity-40 whitespace-nowrap">
                {geocoding ? '…' : geocodeStatus === 'ok' ? '✓取得済' : '📍取得'}
              </button>
            </div>
            {geocodeStatus === 'fail' && (
              <p style={{ color: 'var(--accent)', fontSize: 11 }} className="mt-1">取得失敗（保存は可能です）</p>
            )}
          </Field>

          <Field label="サイズ">
            <div className="p-2 space-y-2">
              {/* ネコポス：サイズ選択不要なサービス */}
              <label className="flex items-center gap-3 cursor-pointer pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => { setNekoposu(!nekoposu); if (!nekoposu) setKogire(false); }}
                  style={{ width: 44, height: 24, borderRadius: 12, background: nekoposu ? 'var(--ink)' : 'var(--border)', padding: '3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: nekoposu ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 14 }}>ネコポス</span>
                  <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, marginLeft: 6 }}>（サイズ選択なし）</span>
                </div>
              </label>
              {/* 小物：サイズ選択も併用可 */}
              <label className="flex items-center gap-3 cursor-pointer pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => { setKogire(!kogire); if (!kogire) setNekoposu(false); }}
                  style={{ width: 44, height: 24, borderRadius: 12, background: kogire ? '#6B7280' : 'var(--border)', padding: '3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: kogire ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 14 }}>小物</span>
                  <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, marginLeft: 6 }}>（サイズも選択可）</span>
                </div>
              </label>
              {/* サイズボタン：ネコポスの時だけグレーアウト、小物でも選択可 */}
              <div className="grid grid-cols-4 gap-1.5" style={{ opacity: nekoposu ? 0.3 : 1 }}>
                {PACKAGE_SIZES.map((s) => (
                  <button key={s} type="button"
                    disabled={nekoposu}
                    onClick={() => setSize(s)}
                    style={{
                      borderRadius: 8, fontSize: 12, padding: '6px 0', fontFamily: 'var(--font-mono)',
                      background: !nekoposu && size === s ? (kogire ? '#6B7280' : 'var(--ink)') : 'transparent',
                      color: !nekoposu && size === s ? '#fff' : 'var(--ink-muted)',
                      border: `1px solid ${!nekoposu && size === s ? (kogire ? '#6B7280' : 'var(--ink)') : 'var(--border)'}`,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <Field label="クール">
            <div className="flex gap-2 p-2">
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
                style={{ width: 44, height: 24, borderRadius: 12, background: collect ? 'var(--accent)' : 'var(--border)', padding: '3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: collect ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 14 }}>コレクト（ヤマト代引き）</span>
            </label>
            {collect && (
              <div className="mt-2 flex items-center gap-2">
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>金額</span>
                <input type="number" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="0" className={`${inp} flex-1`} min="0"
                  style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--washi)' }} />
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>円</span>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setCashOnDelivery(!cashOnDelivery)}
                style={{ width: 44, height: 24, borderRadius: 12, background: cashOnDelivery ? '#555' : 'var(--border)', padding: '3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: cashOnDelivery ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 14 }}>着払い</span>
            </label>
            {cashOnDelivery && (
              <div className="mt-2 flex items-center gap-2">
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>金額</span>
                <input type="number" value={cashOnDeliveryAmount} onChange={(e) => setCashOnDeliveryAmount(e.target.value)}
                  placeholder="0" className={`${inp} flex-1`} min="0"
                  style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--washi)' }} />
                <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>円</span>
              </div>
            )}
          </div>

          <Field label="時間帯指定（任意）">
            <div className="p-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map((slot) => {
                  const color = TIME_SLOT_COLORS[slot];
                  const selected = timeSlot === slot;
                  return (
                    <button key={slot} type="button" onClick={() => setTimeSlot(selected ? '' : slot)}
                      style={{
                        padding: '7px 0', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-sans)',
                        background: selected ? color : 'transparent',
                        color: selected ? '#fff' : color,
                        border: `1.5px solid ${color}`,
                        fontWeight: selected ? 700 : 400,
                      }}>
                      {TIME_SLOT_LABELS[slot]}
                    </button>
                  );
                })}
              </div>
              {timeSlot && (
                <button type="button" onClick={() => setTimeSlot('')}
                  style={{ width: '100%', padding: '5px 0', borderRadius: 8, fontSize: 11, color: 'var(--ink-muted)', border: '1px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-sans)' }}>
                  指定なしに戻す
                </button>
              )}
            </div>
          </Field>

          <Field label="備考（任意）">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="例：玄関前に置く" className={inp} />
          </Field>

          {scannedCode && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--washi)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>▦</span>
              <div>
                <p style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', marginBottom: 2 }}>スキャン番号</p>
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

const inp = 'w-full px-4 py-2.5 text-sm outline-none bg-transparent';

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
