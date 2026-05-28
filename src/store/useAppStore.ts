import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { Package, PackageSize, CoolType, TabType, User } from '../types';
import { writeToCloud, isCloudSyncEnabled } from '../lib/sync';

interface AppStore {
  // Auth
  currentUser: string | null;
  users: User[];
  login: (name: string, pin: string) => boolean;
  logout: () => void;
  register: (name: string, pin: string) => { ok: boolean; error?: string };
  deleteUser: (name: string) => void;

  // Admin
  adminId: string;
  adminPassword: string;
  isAdminLoggedIn: boolean;
  adminLogin: (id: string, password: string) => boolean;
  adminLogout: () => void;
  updateAdminCredentials: (newId: string, newPassword: string) => void;

  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Date
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Packages
  packages: Package[];
  addPackage: (pkg: Omit<Package, 'id' | 'routeOrder' | 'userId'>) => void;
  updatePackage: (id: string, updates: Partial<Omit<Package, 'id' | 'userId'>>) => void;
  deletePackage: (id: string) => void;
  movePackage: (id: string, direction: 'up' | 'down') => void;
  setDelivered: (id: string, delivered: boolean) => void;

  // Cloud sync
  applyCloudData: (data: { adminId: string; adminPassword: string; users: User[]; packages: Package[] }) => void;

  // Map
  lastLocation: [number, number] | null;
  setLastLocation: (loc: [number, number]) => void;

  // Helpers
  getByDate: (date: string) => Package[];
  getAllForUser: () => Package[];
}

function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

function cloudSync(state: Pick<AppStore, 'adminId' | 'adminPassword' | 'users' | 'packages'>) {
  if (!isCloudSyncEnabled) return;
  writeToCloud({
    adminId: state.adminId,
    adminPassword: state.adminPassword,
    users: state.users,
    packages: state.packages,
  });
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      activeTab: 'home',
      selectedDate: today(),
      packages: [],
      adminId: 'admin',
      adminPassword: 'admin1234',
      isAdminLoggedIn: false,
      lastLocation: null,

      login: (name, pin) => {
        const user = get().users.find((u) => u.name === name && u.pin === pin);
        if (user) { set({ currentUser: name, activeTab: 'home' }); return true; }
        return false;
      },

      logout: () => set({ currentUser: null }),

      register: (name, pin) => {
        if (!name.trim()) return { ok: false, error: '名前を入力してください' };
        if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'パスワードは4桁の数字で入力してください' };
        if (get().users.find((u) => u.name === name))
          return { ok: false, error: 'この名前はすでに登録されています' };
        set((s) => {
          const users = [...s.users, { name, pin }];
          cloudSync({ ...s, users });
          return { users, currentUser: name, activeTab: 'home' };
        });
        return { ok: true };
      },

      deleteUser: (name) => {
        set((s) => {
          const users = s.users.filter((u) => u.name !== name);
          const packages = s.packages.filter((p) => p.userId !== name);
          cloudSync({ ...s, users, packages });
          return { users, packages };
        });
      },

      adminLogin: (id, password) => {
        if (id === get().adminId && password === get().adminPassword) {
          set({ isAdminLoggedIn: true });
          return true;
        }
        return false;
      },

      adminLogout: () => set({ isAdminLoggedIn: false }),

      updateAdminCredentials: (newId, newPassword) => {
        set((s) => {
          cloudSync({ ...s, adminId: newId, adminPassword: newPassword });
          return { adminId: newId, adminPassword: newPassword };
        });
      },

      applyCloudData: ({ adminId, adminPassword, users, packages }) => {
        set({ adminId, adminPassword, users: users ?? [], packages: packages ?? [] });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setLastLocation: (loc) => set({ lastLocation: loc }),

      addPackage: (pkg) => {
        const userId = get().currentUser!;
        const date = pkg.date;
        const existing = get().packages.filter((p) => p.date === date && p.userId === userId);
        const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.routeOrder)) : -1;
        const newPkg: Package = {
          ...pkg,
          userId,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          routeOrder: maxOrder + 1,
        };
        set((s) => {
          const packages = [...s.packages, newPkg];
          cloudSync({ ...s, packages });
          return { packages };
        });
      },

      updatePackage: (id, updates) => {
        set((s) => {
          const packages = s.packages.map((p) => (p.id === id ? { ...p, ...updates } : p));
          cloudSync({ ...s, packages });
          return { packages };
        });
      },

      deletePackage: (id) => {
        set((s) => {
          const packages = s.packages.filter((p) => p.id !== id);
          cloudSync({ ...s, packages });
          return { packages };
        });
      },

      movePackage: (id, direction) => {
        const state = get();
        const pkg = state.packages.find((p) => p.id === id);
        if (!pkg) return;
        const dayPkgs = state.packages
          .filter((p) => p.date === pkg.date && p.userId === pkg.userId)
          .sort((a, b) => a.routeOrder - b.routeOrder);
        const idx = dayPkgs.findIndex((p) => p.id === id);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= dayPkgs.length) return;
        const a = dayPkgs[idx]; const b = dayPkgs[swapIdx];
        set((s) => {
          const packages = s.packages.map((p) => {
            if (p.id === a.id) return { ...p, routeOrder: b.routeOrder };
            if (p.id === b.id) return { ...p, routeOrder: a.routeOrder };
            return p;
          });
          cloudSync({ ...s, packages });
          return { packages };
        });
      },

      setDelivered: (id, delivered) => {
        set((s) => {
          const packages = s.packages.map((p) => (p.id === id ? { ...p, delivered } : p));
          cloudSync({ ...s, packages });
          return { packages };
        });
      },

      getByDate: (date) => {
        const userId = get().currentUser;
        return get()
          .packages.filter((p) => p.date === date && p.userId === userId)
          .sort((a, b) => a.routeOrder - b.routeOrder);
      },

      getAllForUser: () => {
        const userId = get().currentUser;
        return get().packages.filter((p) => p.userId === userId);
      },
    }),
    { name: 'haisha-map-v1' }
  )
);

export type { PackageSize, CoolType };
