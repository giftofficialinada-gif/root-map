import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { Package, PackageSize, CoolType, TabType, User } from '../types';

interface AppStore {
  // Auth
  currentUser: string | null;
  users: User[];
  login: (name: string, pin: string) => boolean;
  logout: () => void;
  register: (name: string, pin: string) => { ok: boolean; error?: string };
  deleteUser: (name: string) => void;

  // Admin
  adminPassword: string;
  isAdminLoggedIn: boolean;
  adminLogin: (id: string, password: string) => boolean;
  adminLogout: () => void;
  updateAdminPassword: (newPassword: string) => void;

  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Date
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Packages
  packages: Package[];
  addPackage: (pkg: Omit<Package, 'id' | 'routeOrder'>) => void;
  updatePackage: (id: string, updates: Partial<Omit<Package, 'id'>>) => void;
  deletePackage: (id: string) => void;
  movePackage: (id: string, direction: 'up' | 'down') => void;
  setDelivered: (id: string, delivered: boolean) => void;

  // Map
  lastLocation: [number, number] | null;
  setLastLocation: (loc: [number, number]) => void;

  // Helpers
  getByDate: (date: string) => Package[];
}

function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      activeTab: 'map',
      selectedDate: today(),
      packages: [],
      adminPassword: 'admin1234',
      isAdminLoggedIn: false,
      lastLocation: null,

      login: (name, pin) => {
        const user = get().users.find((u) => u.name === name && u.pin === pin);
        if (user) { set({ currentUser: name }); return true; }
        return false;
      },

      logout: () => set({ currentUser: null }),

      register: (name, pin) => {
        if (!name.trim()) return { ok: false, error: '名前を入力してください' };
        if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'パスワードは4桁の数字で入力してください' };
        if (get().users.find((u) => u.name === name))
          return { ok: false, error: 'この名前はすでに登録されています' };
        set((s) => ({ users: [...s.users, { name, pin }], currentUser: name }));
        return { ok: true };
      },

      deleteUser: (name) => {
        set((s) => ({ users: s.users.filter((u) => u.name !== name) }));
      },

      adminLogin: (id, password) => {
        if (id === 'admin' && password === get().adminPassword) {
          set({ isAdminLoggedIn: true });
          return true;
        }
        return false;
      },

      adminLogout: () => set({ isAdminLoggedIn: false }),

      updateAdminPassword: (newPassword) => set({ adminPassword: newPassword }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setLastLocation: (loc) => set({ lastLocation: loc }),

      addPackage: (pkg) => {
        const date = pkg.date;
        const existing = get().packages.filter((p) => p.date === date);
        const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.routeOrder)) : -1;
        const newPkg: Package = {
          ...pkg,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          routeOrder: maxOrder + 1,
        };
        set((s) => ({ packages: [...s.packages, newPkg] }));
      },

      updatePackage: (id, updates) => {
        set((s) => ({
          packages: s.packages.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deletePackage: (id) => {
        set((s) => ({ packages: s.packages.filter((p) => p.id !== id) }));
      },

      movePackage: (id, direction) => {
        const state = get();
        const pkg = state.packages.find((p) => p.id === id);
        if (!pkg) return;
        const dayPkgs = state.packages
          .filter((p) => p.date === pkg.date)
          .sort((a, b) => a.routeOrder - b.routeOrder);
        const idx = dayPkgs.findIndex((p) => p.id === id);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= dayPkgs.length) return;
        const a = dayPkgs[idx]; const b = dayPkgs[swapIdx];
        set((s) => ({
          packages: s.packages.map((p) => {
            if (p.id === a.id) return { ...p, routeOrder: b.routeOrder };
            if (p.id === b.id) return { ...p, routeOrder: a.routeOrder };
            return p;
          }),
        }));
      },

      setDelivered: (id, delivered) => {
        set((s) => ({
          packages: s.packages.map((p) => (p.id === id ? { ...p, delivered } : p)),
        }));
      },

      getByDate: (date) => {
        return get()
          .packages.filter((p) => p.date === date)
          .sort((a, b) => a.routeOrder - b.routeOrder);
      },
    }),
    { name: 'haisha-map-v1' }
  )
);

export type { PackageSize, CoolType };
