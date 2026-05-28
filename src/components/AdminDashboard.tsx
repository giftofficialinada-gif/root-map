import { useState, useMemo } from 'react';
import { LogOut, Users, Package as PackageIcon, ChevronDown, ChevronUp, Trash2, Pencil, KeyRound, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';
import PackageModal from './PackageModal';

type AdminTab = 'packages' | 'users' | 'settings';

export default function AdminDashboard() {
  const { adminLogout, packages, users, deletePackage, updatePackage, deleteUser, updateAdminCredentials, adminId, adminPassword } = useAppStore();
  const [tab, setTab] = useState<AdminTab>('packages');
  const [editTarget, setEditTarget] = useState<Package | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [confirmDeletePkg, setConfirmDeletePkg] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => ({
    total: packages.length,
    delivered: packages.filter(p => p.delivered).length,
    users: users.length,
    dates: new Set(packages.map(p => p.date)).size,
  }), [packages, users]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return [...packages]
      .sort((a, b) => b.date.localeCompare(a.date) || a.routeOrder - b.routeOrder)
      .filter(p =>
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.date.includes(q)
      );
  }, [packages, searchQuery]);

  const handleSave = (data: Omit<Package, 'id' | 'routeOrder' | 'userId'>) => {
    if (editTarget) updatePackage(editTarget.id, data);
    setShowModal(false);
    setEditTarget(undefined);
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-screen">
      {/* Header */}
      <div style={{ background: 'var(--ink)', color: '#fff' }} className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.15em', opacity: 0.6 }}>ADMIN PANEL</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700 }}>管理者ダッシュボード</h1>
        </div>
        <button onClick={adminLogout}
          style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 12 }}
          className="flex items-center gap-1.5 px-3 py-1.5">
          <LogOut size={14} />
          ログアウト
        </button>
      </div>

      {/* Stats */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '総荷物数', value: stats.total, color: 'var(--ink)' },
            { label: '配達済', value: stats.delivered, color: 'var(--delivered)' },
            { label: '稼働日数', value: stats.dates, color: 'var(--ink-muted)' },
            { label: 'ユーザー', value: stats.users, color: 'var(--accent)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--washi)' }}
              className="text-center py-2">
              <div style={{ fontFamily: 'var(--font-mono)', color, fontSize: 20, lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="flex flex-shrink-0">
        {([
          { id: 'packages' as AdminTab, label: '荷物管理', Icon: PackageIcon },
          { id: 'users' as AdminTab, label: 'ユーザー', Icon: Users },
          { id: 'settings' as AdminTab, label: '設定', Icon: KeyRound },
        ]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, fontFamily: 'var(--font-sans)', fontSize: 12,
              color: tab === id ? 'var(--accent)' : 'var(--ink-muted)',
              borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
            }}
            className="flex items-center justify-center gap-1.5 py-2.5">
            <Icon size={14} strokeWidth={tab === id ? 2 : 1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'packages' && (
          <PackagesTab
            packages={filteredPackages}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onEdit={(pkg) => { setEditTarget(pkg); setShowModal(true); }}
            onDelete={(id) => setConfirmDeletePkg(id)}
          />
        )}
        {tab === 'users' && (
          <UsersTab users={users} packages={packages} onDelete={(name) => setConfirmDeleteUser(name)} />
        )}
        {tab === 'settings' && (
          <SettingsTab currentId={adminId} currentPassword={adminPassword} onSave={updateAdminCredentials} />
        )}
      </div>

      {/* Modals */}
      {showModal && editTarget && (
        <PackageModal pkg={editTarget} defaultDate={editTarget.date}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }} />
      )}
      {confirmDeletePkg && (
        <ConfirmDialog
          message="この荷物を削除しますか？"
          onConfirm={() => { deletePackage(confirmDeletePkg); setConfirmDeletePkg(null); }}
          onCancel={() => setConfirmDeletePkg(null)} />
      )}
      {confirmDeleteUser && (
        <ConfirmDialog
          message={`「${confirmDeleteUser}」を削除しますか？`}
          onConfirm={() => { deleteUser(confirmDeleteUser); setConfirmDeleteUser(null); }}
          onCancel={() => setConfirmDeleteUser(null)} />
      )}
    </div>
  );
}

/* ── Packages Tab ── */
function PackagesTab({ packages, searchQuery, onSearch, onEdit, onDelete }: {
  packages: Package[];
  searchQuery: string;
  onSearch: (q: string) => void;
  onEdit: (pkg: Package) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map: Record<string, Package[]> = {};
    for (const pkg of packages) {
      if (!map[pkg.date]) map[pkg.date] = [];
      map[pkg.date].push(pkg);
    }
    return map;
  }, [packages]);

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-3 space-y-2">
      {/* Search */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
        className="flex items-center gap-2 px-3 py-2">
        <Search size={14} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="名前・住所・日付で検索…"
          style={{ flex: 1, background: 'transparent', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}
        />
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">
            {searchQuery ? '検索結果がありません' : '荷物がありません'}
          </p>
        </div>
      ) : dates.map((date) => {
        const dayPkgs = byDate[date];
        const expanded = expandedDate === date;
        const d = parseISO(date);
        const dlv = dayPkgs.filter(p => p.delivered).length;

        return (
          <div key={date} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedDate(expanded ? null : date)}
              style={{ background: 'transparent' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>
                    {format(d, 'yyyy年M月d日（EEE）', { locale: ja })}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                  {dayPkgs.length}件　配達済 <span style={{ color: 'var(--delivered)' }}>{dlv}</span>件
                </div>
              </div>
              {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-muted)' }} />}
            </button>

            {expanded && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {dayPkgs.map((pkg) => (
                  <div key={pkg.id}
                    style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, textDecoration: pkg.delivered ? 'line-through' : 'none', opacity: pkg.delivered ? 0.5 : 1 }}
                          className="truncate">{pkg.customerName}</span>
                        {pkg.delivered && <span style={{ fontSize: 10, color: 'var(--delivered)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>✓</span>}
                      </div>
                      <p style={{ color: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }} className="truncate">{pkg.address}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{pkg.size}s</span>
                        {pkg.cool !== 'none' && <span style={{ fontSize: 10, color: pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)', fontFamily: 'var(--font-sans)' }}>{COOL_LABELS[pkg.cool]}</span>}
                        {pkg.collect && <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>コレクト{pkg.collectAmount ? ` ¥${pkg.collectAmount.toLocaleString()}` : ''}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => onEdit(pkg)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(pkg.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Users Tab ── */
function UsersTab({ users, packages, onDelete }: {
  users: { name: string; pin: string }[];
  packages: Package[];
  onDelete: (name: string) => void;
}) {
  return (
    <div className="p-3 space-y-2">
      {users.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">登録ユーザーがいません</p>
        </div>
      ) : users.map((user) => {
        const count = packages.filter(p => p.date).length;
        return (
          <div key={user.name}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--washi)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} style={{ color: 'var(--ink-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 15, fontWeight: 600 }}>{user.name}</p>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11 }}>
                PIN: {'•'.repeat(4)}　総登録荷物: {count}件
              </p>
            </div>
            <button onClick={() => onDelete(user.name)}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Settings Tab ── */
function SettingsTab({ currentId, onSave }: {
  currentId: string;
  currentPassword: string;
  onSave: (newId: string, newPassword: string) => void;
}) {
  const [newId, setNewId] = useState(currentId);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim()) { setIsError(true); setMsg('IDを入力してください'); return; }
    if (!pw.trim()) { setIsError(true); setMsg('新しいパスワードを入力してください'); return; }
    if (pw !== pw2) { setIsError(true); setMsg('パスワードが一致しません'); return; }
    onSave(newId.trim(), pw);
    setIsError(false);
    setMsg('ログイン情報を変更しました');
    setPw(''); setPw2('');
  };

  return (
    <div className="p-4 space-y-4">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)' }} className="px-4 py-3">
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 15, fontWeight: 700 }}>管理者ログイン情報の変更</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, marginTop: 2 }}>現在のID: {currentId}</p>
        </div>
        <form onSubmit={handleChange} className="p-4 space-y-3">
          <SField label="新しいID">
            <input type="text" value={newId} onChange={e => setNewId(e.target.value)}
              placeholder="新しいID"
              style={{ width: '100%', background: 'transparent', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', padding: '10px 14px' }} />
          </SField>
          <SField label="新しいパスワード">
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="新しいパスワード"
              style={{ width: '100%', background: 'transparent', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', padding: '10px 14px' }} />
          </SField>
          <SField label="パスワード確認">
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder="もう一度入力"
              style={{ width: '100%', background: 'transparent', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', padding: '10px 14px' }} />
          </SField>
          {msg && <p style={{ color: isError ? 'var(--accent)' : 'var(--delivered)', fontFamily: 'var(--font-sans)', fontSize: 12, textAlign: 'center' }}>{msg}</p>}
          <button type="submit"
            style={{ width: '100%', background: 'var(--ink)', color: '#fff', borderRadius: 12, padding: '12px 0', fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.08em' }}>
            変更する
          </button>
        </form>
      </div>
    </div>
  );
}

function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em' }}
        className="block mb-1 uppercase">{label}</label>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--washi)' }}>{children}</div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ background: 'rgba(28,25,23,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }} className="p-6 max-w-sm w-full">
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', textAlign: 'center' }} className="mb-6 text-base">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>キャンセル</button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-sans)' }}>削除する</button>
        </div>
      </div>
    </div>
  );
}
