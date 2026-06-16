export type CoolType = 'none' | 'refrigerated' | 'frozen';
export type PackageSize = 60 | 80 | 100 | 120 | 140 | 160 | 180 | 200;
export type TabType = 'home' | 'map' | 'packages' | 'route' | 'history';
export type TimeSlot = 'morning' | '14-16' | '16-18' | '18-20' | '19-21';

export interface Package {
  id: string;
  userId: string;
  date: string;
  customerName: string;
  address: string;
  size: PackageSize;
  cool: CoolType;
  nekoposu: boolean;
  collect: boolean;
  collectAmount?: number;
  cashOnDelivery: boolean;
  cashOnDeliveryAmount?: number;
  timeSlot?: TimeSlot;
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

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  'morning': '午前中',
  '14-16':   '14〜16時',
  '16-18':   '16〜18時',
  '18-20':   '18〜20時',
  '19-21':   '19〜21時',
};

export const TIME_SLOT_COLORS: Record<TimeSlot, string> = {
  'morning': '#3AABDB',
  '14-16':   '#D4AC0D',
  '16-18':   '#27AE60',
  '18-20':   '#E67E22',
  '19-21':   '#8E44AD',
};

// 時間帯の優先順位（自動ルート組み用）
export const TIME_SLOT_ORDER: TimeSlot[] = ['morning', '14-16', '16-18', '18-20', '19-21'];
