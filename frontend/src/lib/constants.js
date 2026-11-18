// Central place for campus data, categories and design tokens.

export const APP_NAME = 'LostLink';
export const APP_TAGLINE = 'Campus Lost & Found, matched by meaning — not keywords.';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://flatxeqlvqzupupunmza.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nJ3JX3eTTonuRLzxduPSVA_AW3mZL-y';
export const API_BASE = import.meta.env.VITE_API_URL || 'https://lostlink-en0i.onrender.com';
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

export const CATEGORIES = [
  { id: 'Electronics', icon: 'Smartphone', hue: 199 },
  { id: 'Wallets & Bags', icon: 'Wallet', hue: 268 },
  { id: 'Documents', icon: 'FileText', hue: 35 },
  { id: 'Keys', icon: 'KeyRound', hue: 48 },
  { id: 'Books & Stationery', icon: 'BookOpen', hue: 152 },
  { id: 'Clothing', icon: 'Shirt', hue: 330 },
  { id: 'Accessories', icon: 'Glasses', hue: 288 },
  { id: 'Sports & Fitness', icon: 'Dumbbell', hue: 12 },
  { id: 'Others', icon: 'Package', hue: 215 },
];

export const catHue = (cat) => (CATEGORIES.find((c) => c.id === cat)?.hue ?? 215);

/** Campus zones — used for the loss heatmap + location-aware scoring. */
export const ZONES = [
  { id: 'library', label: 'Library', aliases: ['library', 'liberary', 'lib', 'reading room', 'study'] },
  { id: 'canteen', label: 'Canteen / Mess', aliases: ['canteen', 'mess', 'cafeteria', 'food court', 'nescafe'] },
  { id: 'lab', label: 'Labs', aliases: ['lab', 'laboratory', 'computer lab', 'workshop', 'practical'] },
  { id: 'classroom', label: 'Classrooms', aliases: ['class', 'classroom', 'lecture hall', 'room'] },
  { id: 'hostel', label: 'Hostel', aliases: ['hostel', 'room', 'warden', 'dorm'] },
  { id: 'ground', label: 'Ground / Sports', aliases: ['ground', 'field', 'playground', 'court', 'stadium', 'gym'] },
  { id: 'parking', label: 'Parking', aliases: ['parking', 'bike stand', 'stand', 'garage'] },
  { id: 'admin', label: 'Admin Block', aliases: ['admin', 'office', 'reception', 'accounts', 'fees'] },
  { id: 'bus', label: 'Bus / Gate', aliases: ['bus', 'gate', 'entrance', 'stop', 'transport'] },
];

export const QUICK_CHIPS = [
  'black earbuds',
  'my ID card',
  'steel wristwatch',
  'bottle',
  'charger',
  'wallet with notes',
];

export const STATUS_TONE = {
  active: 'emerald',
  matched: 'amber',
  resolved: 'sky',
};
