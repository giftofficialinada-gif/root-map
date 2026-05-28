export type CoolType = 'none' | 'refrigerated' | 'frozen';
export type PackageSize = 60 | 80 | 100 | 120 | 140 | 160 | 180 | 200;
export type TabType = 'home' | 'map' | 'packages' | 'route' | 'history';

export interface Package {
  id: string;
  userId: string;      // 所有者のユーザー名
  date: string;        // YYYY-MM-DD
  customerName: string;
  address: string;
  size: PackageSize;
  cool: CoolType;
  collect: boolean;
  collectAmount?: number;
  lat?: number;
  lng?: number;
  delivered: boolean;
  routeOrder: number;
  notes?: string;
}

export interface User {
  name: string;
  pin: string;
}

export const PACKAGE_SIZES: PackageSize[] = [60, 80, 100, 120, 140, 160, 180, 200];

export const COOL_LABELS: Record<CoolType, string> = {
  none: 'なし',
  refrigerated: '冷蔵',
  frozen: '冷凍',
};
