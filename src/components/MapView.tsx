import { useMemo, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import {
  Package, COOL_LABELS, TIME_SLOT_LABELS, TIME_SLOT_COLORS,
  DeliveryStatus, DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, DELIVERY_STATUS_ICONS,
  getEffectiveStatus,
} from '../types';

const DEFAULT_CENTER: [number, number] = [35.6812, 139.7671];

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function markerColor(pkg: Package) {
  const status = getEffectiveStatus(pkg);
  if (status !== 'pending') return DELIVERY_STATUS_COLORS[status];
  if (pkg.timeSlot) return TIME_SLOT_COLORS[pkg.timeSlot];
  if (pkg.cool === 'frozen') return 'var(--frozen)';
  if (pkg.cool === 'refrigerated') return 'var(--cool)';
  return 'var(--ink)';
}

function createMarkerIcon(pkg: Package, n: number) {
  const color = markerColor(pkg);
  const status = getEffectiveStatus(pkg);
  const label = status !== 'pending' ? DELIVERY_STATUS_ICONS[status] : (pkg.collect ? '¥' : String(n));
  const filled = status !== 'pending';
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

function createClusterIcon(count: number, color: string) {
  return L.divIcon({
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${color};
      color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;font-weight:700;
      font-family:'Noto Sans JP',sans-serif;
      box-shadow:0 2px 10px rgba(28,25,23,0.3);
      position:relative;
    ">${count}<span style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--accent);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;">✦</span></div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

const CLUSTER_THRESHOLD = 0.0004;

function clusterPackages(pkgs: Package[]): { center: [number, number]; packages: Package[] }[] {
  const assigned = new Set<string>();
  const clusters: { center: [number, number]; packages: Package[] }[] = [];
  for (const pkg of pkgs) {
    if (assigned.has(pkg.id)) continue;
    const group = [pkg];
    assigned.add(pkg.id);
    for (const other of pkgs) {
      if (assigned.has(other.id)) continue;
      if (Math.abs(pkg.lat! - other.lat!) < CLUSTER_THRESHOLD && Math.abs(pkg.lng! - other.lng!) < CLUSTER_THRESHOLD) {
        group.push(other);
        assigned.add(other.id);
      }
    }
    const avgLat = group.reduce((s, p) => s + p.lat!, 0) / group.length;
    const avgLng = group.reduce((s, p) => s + p.lng!, 0) / group.length;
    clusters.push({ center: [avgLat, avgLng], packages: group });
  }
  return clusters;
}

// ~400m threshold in degrees (at lat 35°, 0.004° ≈ 440m)
const OFF_ROUTE_THRESHOLD = 0.004;

function distToSegmentSq(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return (p[0]-a[0])**2 + (p[1]-a[1])**2;
  const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx+dy*dy)));
  return (p[0]-a[0]-t*dx)**2 + (p[1]-a[1]-t*dy)**2;
}

function checkOffRoute(pos: [number, number], route: [number, number][]): boolean {
  if (route.length === 0) return false;
  let minD2 = (pos[0]-route[0][0])**2 + (pos[1]-route[0][1])**2;
  for (let i = 0; i < route.length - 1; i++) {
    minD2 = Math.min(minD2, distToSegmentSq(pos, route[i], route[i+1]));
  }
  return Math.sqrt(minD2) > OFF_ROUTE_THRESHOLD;
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
  const onLocationRef = useRef(onLocation);
  const onErrorRef = useRef(onError);
  const lastPosRef = useRef<[number, number] | null>(null);

  useEffect(() => { onLocationRef.current = onLocation; }, [onLocation]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!navigator.geolocation) { onErrorRef.current(); return; }
    let firstFix = true;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        lastPosRef.current = c;
        if (firstFix) {
          map.flyTo(c, 16, { duration: 1.0 });
          firstFix = false;
        }
        onLocationRef.current(c);
      },
      () => onErrorRef.current(),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [map]);

  triggerRef.current = () => {
    if (lastPosRef.current) map.flyTo(lastPosRef.current, 16, { duration: 1.0 });
  };
  return null;
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}
function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `約${min}分`;
  return `約${Math.floor(min / 60)}時間${min % 60 > 0 ? `${min % 60}分` : ''}`;
}

export default function MapView() {
  const { selectedDate, setSelectedDate, getByDate, setDeliveryStatus, lastLocation, setLastLocation, autoRoutePackages } = useAppStore();
  const packages = getByDate(selectedDate);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(lastLocation);
  const [locError, setLocError] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  const [rerouteLoading, setRerouteLoading] = useState(false);
  const [navRoute, setNavRoute] = useState<[number, number][]>([]);
  const [navInfo, setNavInfo] = useState<{ distance: number; duration: number; name: string } | null>(null);
  const locateTrigger = useRef<(() => void) | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(500);
  const navFetchKeyRef = useRef('');

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
  const clusters = useMemo(() => clusterPackages(positioned), [positioned]);

  // First undelivered positioned package (= next delivery target)
  const nextPkg = useMemo(() =>
    positioned.find(p => getEffectiveStatus(p) === 'pending'),
    [positioned]
  );

  // Undelivered route for off-route detection
  const undeliveredRoute = useMemo(() =>
    positioned.filter(p => getEffectiveStatus(p) === 'pending').map(p => [p.lat!, p.lng!] as [number, number]),
    [positioned]
  );

  // Off-route detection whenever position updates
  useEffect(() => {
    if (!currentPos || undeliveredRoute.length < 2) { setOffRoute(false); return; }
    setOffRoute(checkOffRoute(currentPos, undeliveredRoute));
  }, [currentPos, undeliveredRoute]);

  // Nav route: current position → next package via OSRM road network
  // Only re-fetches when position moves >~300m or next package changes
  useEffect(() => {
    if (!currentPos || !nextPkg) {
      setNavRoute([]); setNavInfo(null); return;
    }
    const roundLat = Math.round(currentPos[0] / 0.003) * 0.003;
    const roundLng = Math.round(currentPos[1] / 0.003) * 0.003;
    const key = `${nextPkg.id}_${roundLat}_${roundLng}`;
    if (navFetchKeyRef.current === key) return;
    navFetchKeyRef.current = key;

    const controller = new AbortController();
    const [curLat, curLng] = currentPos;
    (async () => {
      try {
        const coords = `${curLng.toFixed(6)},${curLat.toFixed(6)};${nextPkg.lng!.toFixed(6)},${nextPkg.lat!.toFixed(6)}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0] && !controller.signal.aborted) {
          const r = data.routes[0];
          setNavRoute((r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]));
          setNavInfo({ distance: r.distance, duration: r.duration, name: nextPkg.customerName });
        }
      } catch { /* AbortError or network error */ }
    })();
    return () => controller.abort();
  }, [currentPos, nextPkg]);

  const handleLocation = (p: [number, number]) => {
    setCurrentPos(p);
    setLastLocation(p);
    setLocError(false);
  };

  const handleReroute = async () => {
    if (!currentPos) return;
    setRerouteLoading(true);
    await autoRoutePackages(selectedDate, currentPos);
    setRerouteLoading(false);
    setOffRoute(false);
  };

  // Date formatting
  const dateObj = parseISO(selectedDate);
  const year = format(dateObj, 'yyyy');
  const monthDay = format(dateObj, 'M月d日', { locale: ja });
  const dow = format(dateObj, 'EEE', { locale: ja });

  const delivered = packages.filter(p => getEffectiveStatus(p) === 'delivered').length;
  const remaining = packages.filter(p => getEffectiveStatus(p) === 'pending').length;

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
            onLocation={handleLocation}
            onError={() => setLocError(true)}
            triggerRef={locateTrigger}
          />

          {currentPos && (
            <Marker position={currentPos} icon={currentLocIcon}>
              <Popup><span style={{ fontFamily: 'var(--font-sans)', color: 'var(--accent)' }}>📍 現在地</span></Popup>
            </Marker>
          )}

          {/* Overview route: grey dashed */}
          {routePoints.length >= 2 && (
            <Polyline positions={routePoints} color="#B0A090" weight={1.5} opacity={0.6} dashArray="6 6" />
          )}

          {/* Navigation route: current pos → next package (road-following, solid blue) */}
          {navRoute.length >= 2 && (
            <>
              <Polyline positions={navRoute} color="#fff" weight={6} opacity={0.8} />
              <Polyline positions={navRoute} color="#2563EB" weight={4} opacity={0.95} />
            </>
          )}

          {clusters.map((cluster, ci) => {
            if (cluster.packages.length === 1) {
              const pkg = cluster.packages[0];
              const routeNo = positioned.indexOf(pkg) + 1;
              return (
                <Marker key={pkg.id} position={[pkg.lat!, pkg.lng!]} icon={createMarkerIcon(pkg, routeNo)}>
                  <Popup maxWidth={260}>
                    <PackagePopup pkg={pkg} routeNo={routeNo} onStatusChange={setDeliveryStatus} />
                  </Popup>
                </Marker>
              );
            }
            const allDelivered = cluster.packages.every(p => getEffectiveStatus(p) === 'delivered');
            const clusterColor = allDelivered ? 'var(--delivered)' : 'var(--ink)';
            return (
              <Marker key={`cluster-${ci}`} position={cluster.center} icon={createClusterIcon(cluster.packages.length, clusterColor)}>
                <Popup maxWidth={280}>
                  <div style={{ fontFamily: 'var(--font-sans)' }}>
                    <p style={{ fontWeight: 700, marginBottom: 8, color: 'var(--ink)', fontSize: 13 }}>同一場所 {cluster.packages.length}件</p>
                    {cluster.packages.map((pkg) => {
                      const routeNo = positioned.indexOf(pkg) + 1;
                      return (
                        <div key={pkg.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                          <PackagePopup pkg={pkg} routeNo={routeNo} onStatusChange={setDeliveryStatus} />
                        </div>
                      );
                    })}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Off-route re-route banner */}
        {(offRoute || rerouteLoading) && (
          <div style={{
            position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 1000,
            background: rerouteLoading ? 'var(--ink)' : '#c25a2a',
            color: '#fff', borderRadius: 14, padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}>
              {rerouteLoading ? '🔄 再ルート計算中…' : '📍 ルートを外れました'}
            </span>
            {!rerouteLoading && (
              <button onClick={handleReroute}
                style={{ background: '#fff', color: '#c25a2a', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                再ルート検索
              </button>
            )}
          </div>
        )}

        {/* Navigation info panel */}
        {navInfo && (
          <div style={{
            position: 'absolute', top: 8, left: 8, zIndex: 1000,
            background: 'rgba(254,252,248,0.96)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            maxWidth: 'calc(100% - 110px)',
          }}>
            <p style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginBottom: 2, letterSpacing: '0.06em' }}>
              次の配達先
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-serif)', marginBottom: 3 }} className="truncate">
              {navInfo.name}
            </p>
            <p style={{ fontSize: 13, color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {formatDistance(navInfo.distance)}
              <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                {formatDuration(navInfo.duration)}
              </span>
            </p>
          </div>
        )}

        {/* Legend overlay */}
        <div style={{ background: 'rgba(254,252,248,0.92)', border: '1px solid var(--border)', borderRadius: 10 }}
          className="absolute top-2 right-2 z-10 px-3 py-2 text-xs backdrop-blur-sm">
          {[
            { color: 'var(--ink)', label: '通常' },
            { color: 'var(--cool)', label: '冷蔵' },
            { color: 'var(--frozen)', label: '冷凍' },
            { color: 'var(--delivered)', label: '配達済' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 mb-0.5">
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${color}` }} />
              <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          ))}
          {packages.some(p => p.timeSlot) && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              {Object.entries(TIME_SLOT_COLORS).filter(([slot]) => packages.some(p => p.timeSlot === slot)).map(([slot, color]) => (
                <div key={slot} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 9 }}>{slot}</span>
                </div>
              ))}
            </div>
          )}
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

const STATUS_OPTIONS: DeliveryStatus[] = ['delivered', 'absent', 'redelivery'];

function PackagePopup({ pkg, routeNo, onStatusChange }: {
  pkg: Package; routeNo: number; onStatusChange: (id: string, s: DeliveryStatus) => void;
}) {
  const color = markerColor(pkg);
  const status = getEffectiveStatus(pkg);
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: 210 }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${color}`, background: status !== 'pending' ? color : 'transparent', color: status !== 'pending' ? '#fff' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
          {status !== 'pending' ? DELIVERY_STATUS_ICONS[status] : routeNo}
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontWeight: 700 }}>{pkg.customerName}</span>
      </div>
      <p style={{ color: 'var(--ink-muted)', fontSize: 11 }} className="mb-2">{pkg.address}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {pkg.nekoposu
          ? <Tag>ネコポス</Tag>
          : pkg.kogire
            ? <><Tag accent="#6B7280">小物</Tag><Tag>{pkg.size}s</Tag></>
            : <Tag>{pkg.size}s</Tag>
        }
        {pkg.cool !== 'none' && <Tag accent={pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)'}>{COOL_LABELS[pkg.cool]}</Tag>}
        {pkg.collect && <Tag accent="var(--accent)">コレクト{pkg.collectAmount ? ` ¥${pkg.collectAmount.toLocaleString()}` : ''}</Tag>}
        {pkg.cashOnDelivery && <Tag accent="#555">着払い{pkg.cashOnDeliveryAmount ? ` ¥${pkg.cashOnDeliveryAmount.toLocaleString()}` : ''}</Tag>}
        {pkg.timeSlot && <Tag accent={TIME_SLOT_COLORS[pkg.timeSlot]}>{TIME_SLOT_LABELS[pkg.timeSlot]}</Tag>}
      </div>
      {pkg.notes && <p style={{ color: 'var(--ink-muted)', fontSize: 11 }} className="mb-2">📝 {pkg.notes}</p>}
      <div style={{ display: 'flex', gap: 4 }}>
        {STATUS_OPTIONS.map(s => {
          const active = status === s;
          const col = DELIVERY_STATUS_COLORS[s];
          return (
            <button key={s}
              onClick={() => onStatusChange(pkg.id, active ? 'pending' : s)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: active ? 700 : 400,
                background: active ? col : 'transparent',
                color: active ? '#fff' : col,
                border: `1.5px solid ${col}`,
                cursor: 'pointer',
              }}>
              {DELIVERY_STATUS_ICONS[s]} {DELIVERY_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>
      {status !== 'pending' && (
        <button onClick={() => onStatusChange(pkg.id, 'pending')}
          style={{ width: '100%', marginTop: 4, padding: '4px 0', borderRadius: 8, fontSize: 10, color: 'var(--ink-muted)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
          未配達に戻す
        </button>
      )}
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
