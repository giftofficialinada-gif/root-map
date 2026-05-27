import { useState, useEffect } from 'react';
import { Package, PACKAGE_SIZES, CoolType, PackageSize, COOL_LABELS } from '../types';

interface Props {
  pkg?: Package;
  defaultDate: string;
  onSave: (data: Omit<Package, 'id' | 'routeOrder'>) => void;
  onClose: () => void;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // 国土地理院API（日本の住所に最適）
  try {
    const q = encodeURIComponent(address);
    const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${q}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const [lng, lat] = data[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch {
    // ignore
  }
  // フォールバック: Nominatim
  try {
    const q = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=jp`,
      { headers: { 'Accept-Language': 'ja,en' } }
    );
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore
  }
  return null;
}

export default function PackageModal({ pkg, defaultDate, onSave, onClose }: Props) {
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

  useEffect(() => {
    if (pkg?.lat) setGeocodeStatus('ok');
  }, [pkg]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeocodeStatus('idle');
    const result = await geocodeAddress(address);
    setGeocoding(false);
    if (result) {
      setLat(result.lat);
      setLng(result.lng);
      setGeocodeStatus('ok');
    } else {
      setGeocodeStatus('fail');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { setError('名前を入力してください'); return; }
    if (!address.trim()) { setError('住所を入力してください'); return; }

    onSave({
      customerName: customerName.trim(),
      address: address.trim(),
      size,
      cool,
      collect,
      collectAmount: collect && collectAmount ? parseInt(collectAmount, 10) : undefined,
      notes: notes.trim() || undefined,
      date,
      lat,
      lng,
      delivered: pkg?.delivered ?? false,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-800">
            {pkg ? '荷物を編集' : '荷物を追加'}
          </h2>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600 leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date */}
          <Field label="配達日">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Name */}
          <Field label="お客様名">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="例：田中 花子"
              className={inputCls}
            />
          </Field>

          {/* Address */}
          <Field label="住所">
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setGeocodeStatus('idle'); }}
                placeholder="例：東京都千代田区千代田1-1"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !address.trim()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap"
              >
                {geocoding ? '取得中…' : '📍取得'}
              </button>
            </div>
            {geocodeStatus === 'ok' && (
              <p className="text-xs text-green-600 mt-1">✓ 地図の位置を取得しました</p>
            )}
            {geocodeStatus === 'fail' && (
              <p className="text-xs text-red-500 mt-1">⚠ 位置の取得に失敗しました（保存は可能です）</p>
            )}
          </Field>

          {/* Size */}
          <Field label="サイズ">
            <select
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10) as PackageSize)}
              className={inputCls}
            >
              {PACKAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}サイズ</option>
              ))}
            </select>
          </Field>

          {/* Cool */}
          <Field label="クール">
            <div className="flex gap-2">
              {(['none', 'refrigerated', 'frozen'] as CoolType[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCool(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    cool === c
                      ? c === 'none'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : c === 'refrigerated'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {COOL_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>

          {/* Collect */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setCollect(!collect)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                  collect ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${collect ? 'translate-x-6' : ''}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">コレクト（代引き）</span>
            </label>
            {collect && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-600">金額</span>
                <input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} flex-1`}
                  min="0"
                />
                <span className="text-sm text-slate-600">円</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <Field label="備考（任意）">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例：玄関前に置く"
              className={inputCls}
            />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {pkg ? '更新する' : '追加する'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export { geocodeAddress };
