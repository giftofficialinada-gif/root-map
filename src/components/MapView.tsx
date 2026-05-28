import { useMemo, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';

const DEFAULT_CENTER: [number, number] = [35.6812, 139.7671];

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function markerColor(pkg: Package) {
  if (pkg.delivered) return 'var(--delivered)';
  if (pkg.cool === 'frozen') return 'var(--frozen)';
  if (pkg.cool === 'refrigerated') return 'var(--cool)';
  return 'var(--ink)';
}

function createMarkerIcon(pkg: Package, n: number) {
  const color = markerColor(pkg);
  const label = pkg.collect ? '¥' : String(n);
  const filled = pkg.delivered;
  return L.divIcon({
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${filled ? color : 'var(--surface)'};
      border:2.5px solid ${color};
      color:${filled ? '#fff' : color};
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;
      font-family:'Noto Sans JP',sans-serif;
      box-shadow:0 2px 8px rgba(28,25,23,0.2);
    ">${label}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

const currentLocIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:var(--accent);border:3px solid white;box-shadow:0 0 0 3px rgba(194,90,42,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function LocationController({ onLocation, onError, triggerRef }: {
  onLocation: (p: [number, number]) => void;
  onError: () => void;
  triggerRef: React.MutableRefObject<(() => void) | null>;
}) {
  const map = useMap();
  const fly = () => {
    if (!navigator.geolocation) { onError(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.flyTo(c, 16, { duration: 1.0 });
        onLocation(c);
      },
      () => onError(),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  useEffect(() => { fly(); }, []);
  triggerRef.current = fly;
  return null;
}

export default function MapView() {
  const { selectedDate, setSelectedDate, getByDate, setDelivered, lastLocation, setLastLocation } = useAppStore();
  const packages = getByDate(selectedDate);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(lastLocation);
  const [locError, setLocError] = useState(false);
  const locateTrigger = useRef<(() => void) | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(500);

  useLayoutEffect(() => {
    const calc = () => {
      const nav = document.getElementById('app-navbar');
      const hdr = headerRef.current;
      if (nav && hdr) setMapHeight(window.innerHeight - nav.offsetHeight - hdr.offsetHeight);
    };
    calc();
    window.addEventListener('resize', calc);
    const ro = new ResizeObserver(calc);
    if (headerRef.current) ro.observe(headerRef.current);
    const nav = document.getElementById('app-navbar');
    if (nav) ro.observe(nav);
    return () => { window.removeEventListener('resize', calc); ro.disconnect(); };
  }, []);

  const positioned = useMemo(() => packages.filter(p => p.lat !== undefined && p.lng !== undefined), [packages]);
  const routePoints = useMemo(() => positioned.map(p => [p.lat!, p.lng!] as [number, number]), [positioned]);

  // Date formatting
  const dateObj = parseISO(selectedDate);
  const year = format(dateObj, 'yyyy');
  const monthDay = format(dateObj, 'M月d日', { locale: ja });
  const dow = format(dateObj, 'EEE', { locale: ja });

  const delivered = packages.filter(p => p.delivered).length;
  const remaining = packages.length - delivered;

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col">
      {/* Header */}
      <div ref={headerRef} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        className="px-4 pt-3 pb-2 flex-shrink-0">
        {/* Date row */}
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-end gap-2">
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: 13 }}>{year}</span>
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 26, lineHeight: 1 }}
              className="font-bold">{monthDay}</span>
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink-muted)', fontSize: 14 }}>{dow}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: '1px solid var(--border)', background: 'var(--washi)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 8 }}
              className="px-2 py-1 outline-none"
            />
            <button onClick={() => { setLocError(false); locateTrigger.current?.(); }}
              style={{ background: locError ? 'var(--ink-muted)' : 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 20 }}
              className="flex items-center gap-1 px-3 py-1.5 font-medium whitespace-nowrap">
              📍{locError ? '許可が必要' : '現在地'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-0 divide-x" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}
          // @ts-ignore
          style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <StatCell value={packages.length} label="今日の荷物" />
          <StatCell value={delivered} label="配達済" accent="var(--delivered)" />
          <StatCell value={remaining} label="残り" accent="var(--accent)" />
          {packages.filter(p => p.cool !== 'none').length > 0 &&
            <StatCell value={packages.filter(p => p.cool !== 'none').length} label="クール" accent="var(--cool)" />}
        </div>
      </div>

      {/* Map */}
      <div style={{ height: mapHeight, position: 'relative' }}>
        <MapContainer center={lastLocation ?? DEFAULT_CENTER} zoom={15}
          style={{ height: '100%', width: '100%' }}>
          {/* CartoDB Light tiles — エレガントな薄色マップ */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <LocationController
            onLocation={(p) => { setCurrentPos(p); setLastLocation(p); setLocError(false); }}
            onError={() => setLocError(true)}
            triggerRef={locateTrigger}
          />

          {currentPos && (
            <Marker position={currentPos} icon={currentLocIcon}>
              <Popup><span style={{ fontFamily: 'var(--font-sans)', color: 'var(--accent)' }}>📍 現在地</span></Popup>
            </Marker>
          )}

          {routePoints.length >= 2 && (
            <Polyline positions={routePoints} color="var(--accent)" weight={2} opacity={0.8} dashArray="8 5" />
          )}

          {positioned.map((pkg, idx) => (
            <Marker key={pkg.id} position={[pkg.lat!, pkg.lng!]} icon={createMarkerIcon(pkg, idx + 1)}>
              <Popup maxWidth={260}>
                <PackagePopup pkg={pkg} routeNo={idx + 1} onDelivered={setDelivered} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend overlay */}
        <div style={{ background: 'rgba(254,252,248,0.92)', border: '1px solid var(--border)', borderRadius: 10 }}
          className="absolute top-2 right-2 z-10 px-3 py-2 text-xs backdrop-blur-sm">
          {[
            { color: 'var(--ink)', label: '通常' },
            { color: 'var(--cool)', label: '冷蔵' },
            { color: 'var(--frozen)', label: '冷凍' },
            { color: 'var(--delivered)', label: '配達済' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${color}` }} />
              <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCell({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="flex-1 text-center px-2">
      <div style={{ fontFamily: 'var(--font-mono)', color: accent ?? 'var(--ink)', fontSize: 22, lineHeight: 1.1 }}
        className="font-semibold">
        {value}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-muted)', marginLeft: 1 }}>件</span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 10, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function PackagePopup({ pkg, routeNo, onDelivered }: {
  pkg: Package; routeNo: number; onDelivered: (id: string, v: boolean) => void;
}) {
  const color = markerColor(pkg);
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: 200 }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
          {routeNo}
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontWeight: 700 }}>{pkg.customerName}</span>
      </div>
      <p style={{ color: 'var(--ink-muted)', fontSize: 11 }} className="mb-2">{pkg.address}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        <Tag>{pkg.size}s</Tag>
        {pkg.cool !== 'none' && <Tag accent={pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)'}>{COOL_LABELS[pkg.cool]}</Tag>}
        {pkg.collect && <Tag accent="var(--accent)">コレクト{pkg.collectAmount ? ` ¥${pkg.collectAmount.toLocaleString()}` : ''}</Tag>}
        {pkg.delivered && <Tag accent="var(--delivered)">配達済</Tag>}
      </div>
      {pkg.notes && <p style={{ color: 'var(--ink-muted)', fontSize: 11 }} className="mb-2">📝 {pkg.notes}</p>}
      <button
        onClick={() => onDelivered(pkg.id, !pkg.delivered)}
        style={{
          width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: pkg.delivered ? 'transparent' : 'var(--delivered)',
          color: pkg.delivered ? 'var(--ink-muted)' : '#fff',
          border: pkg.delivered ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
        }}>
        {pkg.delivered ? '未配達に戻す' : '✓ 配達済にする'}
      </button>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 20,
      border: `1px solid ${accent ?? 'var(--border)'}`,
      color: accent ?? 'var(--ink-muted)',
      fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </span>
  );
}
