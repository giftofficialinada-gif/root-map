import { useMemo, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createMarkerIcon(pkg: Package, routeNumber: number) {
  const color = pkg.delivered
    ? '#16a34a'
    : pkg.cool === 'frozen'
    ? '#7c3aed'
    : pkg.cool === 'refrigerated'
    ? '#0891b2'
    : '#2563eb';
  const label = pkg.collect ? '¥' : String(routeNumber);
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${label}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

const currentLocationIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function LocationController({
  onLocation,
  triggerRef,
}: {
  onLocation: (pos: [number, number]) => void;
  triggerRef: React.MutableRefObject<(() => void) | null>;
}) {
  const map = useMap();

  const flyToMe = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.flyTo(coords, 16, { duration: 1.2 });
        onLocation(coords);
      },
      () => alert('現在地の取得に失敗しました。\nブラウザの位置情報の許可を確認してください。'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { flyToMe(); }, []);
  triggerRef.current = flyToMe;
  return null;
}

export default function MapView() {
  const { selectedDate, setSelectedDate, getByDate, setDelivered } = useAppStore();
  const packages = getByDate(selectedDate);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const locateTrigger = useRef<(() => void) | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(500);

  // 高さをJS計測して確実に設定
  useLayoutEffect(() => {
    const calc = () => {
      const navbar = document.getElementById('app-navbar');
      const header = headerRef.current;
      if (navbar && header) {
        setMapHeight(window.innerHeight - navbar.offsetHeight - header.offsetHeight);
      }
    };
    calc();
    window.addEventListener('resize', calc);
    const ro = new ResizeObserver(calc);
    if (headerRef.current) ro.observe(headerRef.current);
    const nav = document.getElementById('app-navbar');
    if (nav) ro.observe(nav);
    return () => { window.removeEventListener('resize', calc); ro.disconnect(); };
  }, []);

  const positioned = useMemo(
    () => packages.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [packages]
  );

  const routePoints = useMemo(
    () => positioned.map((p) => [p.lat!, p.lng!] as [number, number]),
    [positioned]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div ref={headerRef} className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => locateTrigger.current?.()}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <span>📍</span>
          <span>現在地</span>
        </button>
        <div className="ml-auto flex gap-2 text-xs">
          <Legend color="#2563eb" label="通常" />
          <Legend color="#0891b2" label="冷蔵" />
          <Legend color="#7c3aed" label="冷凍" />
          <Legend color="#16a34a" label="済" />
        </div>
      </div>

      {/* Map — 高さをpxで明示指定 */}
      <div style={{ height: mapHeight, position: 'relative' }}>
        <MapContainer
          center={[35.6812, 139.7671]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationController onLocation={setCurrentPos} triggerRef={locateTrigger} />

          {currentPos && (
            <Marker position={currentPos} icon={currentLocationIcon}>
              <Popup><div className="text-sm font-medium text-blue-700">📍 現在地</div></Popup>
            </Marker>
          )}

          {routePoints.length >= 2 && (
            <Polyline positions={routePoints} color="#2563eb" weight={3} opacity={0.6} dashArray="6 4" />
          )}

          {positioned.map((pkg, idx) => (
            <Marker key={pkg.id} position={[pkg.lat!, pkg.lng!]} icon={createMarkerIcon(pkg, idx + 1)}>
              <Popup maxWidth={260}>
                <PackagePopup pkg={pkg} routeNo={idx + 1} onDelivered={setDelivered} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Stats overlay */}
        <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none">
          <div className="font-bold text-slate-700 mb-1">本日の荷物</div>
          <div className="text-slate-600">合計 <span className="font-bold text-blue-600">{packages.length}</span>件</div>
          <div className="text-slate-600">配達済 <span className="font-bold text-green-600">{packages.filter(p => p.delivered).length}</span>件</div>
          {positioned.length < packages.length && packages.length > 0 && (
            <div className="text-amber-600 mt-1">📍未取得 {packages.length - positioned.length}件</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span style={{ background: color }} className="inline-block w-3 h-3 rounded-full" />
      <span className="text-slate-600">{label}</span>
    </span>
  );
}

function PackagePopup({ pkg, routeNo, onDelivered }: {
  pkg: Package; routeNo: number; onDelivered: (id: string, v: boolean) => void;
}) {
  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{routeNo}</span>
        <span className="font-bold text-slate-800">{pkg.customerName}</span>
      </div>
      <div className="text-xs text-slate-600 mb-2">{pkg.address}</div>
      <div className="flex flex-wrap gap-1 mb-3">
        <Badge color="blue">{pkg.size}サイズ</Badge>
        {pkg.cool !== 'none' && <Badge color={pkg.cool === 'frozen' ? 'purple' : 'cyan'}>{COOL_LABELS[pkg.cool]}</Badge>}
        {pkg.collect && <Badge color="amber">コレクト{pkg.collectAmount ? `¥${pkg.collectAmount.toLocaleString()}` : ''}</Badge>}
        {pkg.delivered && <Badge color="green">配達済</Badge>}
      </div>
      {pkg.notes && <div className="text-xs text-slate-500 mb-2">📝 {pkg.notes}</div>}
      <button
        onClick={() => onDelivered(pkg.id, !pkg.delivered)}
        className={`w-full py-1.5 rounded text-xs font-semibold transition-colors ${
          pkg.delivered ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {pkg.delivered ? '未配達に戻す' : '✓ 配達済にする'}
      </button>
    </div>
  );
}

const badgeColors = {
  blue: 'bg-blue-100 text-blue-700', cyan: 'bg-cyan-100 text-cyan-700',
  purple: 'bg-purple-100 text-purple-700', amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
};

function Badge({ color, children }: { color: keyof typeof badgeColors; children: React.ReactNode }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[color]}`}>{children}</span>;
}
