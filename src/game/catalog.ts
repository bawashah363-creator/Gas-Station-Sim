import {
  AchievementCategory,
  EquippedCosmetics,
  GameHUDState,
  PlayerOutfitId,
  StationDecorId,
  StationThemeId,
  VehicleSkinId,
  VehicleType,
} from './types';

export type StoreCategory = 'player' | 'vehicle' | 'station' | 'special';

export interface StoreItemDefinition {
  id: string;
  category: StoreCategory;
  name: string;
  description: string;
  gemPrice: number;
  consumable?: boolean;
  previewPrimary: string;
  previewSecondary: string;
  previewAccent: string;
  equipSlot?: keyof EquippedCosmetics;
  equipValue?: PlayerOutfitId | VehicleSkinId | StationThemeId | StationDecorId;
  effectPayload?: {
    fuelLiters?: number;
    coins?: number;
    xp?: number;
    washSupplies?: number;
    shopStock?: number;
  };
}

export const STARTER_OWNED_ITEMS = [
  'outfit_default',
  'veh_skin_default',
  'theme_default',
  'decor_default',
];

export const GEM_STORE_CATALOG: StoreItemDefinition[] = [
  // A. PLAYER CUSTOMIZATION
  {
    id: 'outfit_default',
    category: 'player',
    name: 'Classic Crew Red',
    description: 'Standard highway gas station operator uniform with red cap and dark slacks.',
    gemPrice: 0,
    previewPrimary: '#E02424',
    previewSecondary: '#1E293B',
    previewAccent: '#FFC815',
    equipSlot: 'playerOutfit',
    equipValue: 'default',
  },
  {
    id: 'outfit_royal_gold',
    category: 'player',
    name: 'Zaidi Gold Executive',
    description: 'Signature golden-amber jacket, navy trousers, and gold crest cap with golden ring glow.',
    gemPrice: 18,
    previewPrimary: '#F59E0B',
    previewSecondary: '#0F172A',
    previewAccent: '#FDE047',
    equipSlot: 'playerOutfit',
    equipValue: 'royal_gold',
  },
  {
    id: 'outfit_cyan_tech',
    category: 'player',
    name: 'Cyan Tech Specialist',
    description: 'Electric cyan engineering vest, graphite pants, and technical visor.',
    gemPrice: 24,
    previewPrimary: '#0EA5E9',
    previewSecondary: '#1E293B',
    previewAccent: '#38BDF8',
    equipSlot: 'playerOutfit',
    equipValue: 'cyan_tech',
  },
  {
    id: 'outfit_midnight_vip',
    category: 'player',
    name: 'Midnight VIP Manager',
    description: 'Deep navy tailored blazer, crimson tie, and gold executive trim.',
    gemPrice: 32,
    previewPrimary: '#1E3A8A',
    previewSecondary: '#09090B',
    previewAccent: '#FBBF24',
    equipSlot: 'playerOutfit',
    equipValue: 'midnight_vip',
  },

  // B. VEHICLE COLLECTION SKINS
  {
    id: 'veh_skin_default',
    category: 'vehicle',
    name: 'Factory Gloss Fleet',
    description: 'Clean original showroom paint across all station and highway vehicles.',
    gemPrice: 0,
    previewPrimary: '#E12D2D',
    previewSecondary: '#2563EB',
    previewAccent: '#F8FAFC',
    equipSlot: 'vehicleSkin',
    equipValue: 'default',
  },
  {
    id: 'veh_skin_gold_edition',
    category: 'vehicle',
    name: 'Royal Gold Coating',
    description: 'Applies a warm sunlit gold sheen across visiting station vehicles and car wash showcase.',
    gemPrice: 28,
    previewPrimary: '#F59E0B',
    previewSecondary: '#92400E',
    previewAccent: '#FEF08A',
    equipSlot: 'vehicleSkin',
    equipValue: 'gold_edition',
  },
  {
    id: 'veh_skin_cyber_cyan',
    category: 'vehicle',
    name: 'Azure Cyan Finish',
    description: 'Cool electric cyan metallic tint applied across incoming vehicles.',
    gemPrice: 25,
    previewPrimary: '#0284C7',
    previewSecondary: '#0F172A',
    previewAccent: '#38BDF8',
    equipSlot: 'vehicleSkin',
    equipValue: 'cyber_cyan',
  },
  {
    id: 'veh_skin_ruby_chrome',
    category: 'vehicle',
    name: 'Ruby Chrome Clearcoat',
    description: 'Rich crimson showroom clearcoat effect on fleet cars and car wash entries.',
    gemPrice: 22,
    previewPrimary: '#BE123C',
    previewSecondary: '#4C0519',
    previewAccent: '#FDA4AF',
    equipSlot: 'vehicleSkin',
    equipValue: 'ruby_chrome',
  },

  // C. STATION CUSTOMIZATION (THEMES & DECORATIVE LIGHTS)
  {
    id: 'theme_default',
    category: 'station',
    name: 'Classic Forecourt',
    description: 'Original crimson & golden canopy lighting and standard station atmosphere.',
    gemPrice: 0,
    previewPrimary: '#E02424',
    previewSecondary: '#FFC815',
    previewAccent: '#FFFDF7',
    equipSlot: 'stationTheme',
    equipValue: 'default',
  },
  {
    id: 'theme_navy_gold',
    category: 'station',
    name: 'ZAIDI Navy & Gold Prestige',
    description: 'Equips golden canopy perimeter lanterns and royal navy ambiance accents across your lot.',
    gemPrice: 36,
    previewPrimary: '#0A192F',
    previewSecondary: '#F59E0B',
    previewAccent: '#38BDF8',
    equipSlot: 'stationTheme',
    equipValue: 'navy_gold',
  },
  {
    id: 'theme_emerald_eco',
    category: 'station',
    name: 'Eco Oasis Pavilion',
    description: 'Adds soft emerald garden uplights around perimeter trees and station forecourt.',
    gemPrice: 28,
    previewPrimary: '#16A34A',
    previewSecondary: '#4ADE80',
    previewAccent: '#FEF08A',
    equipSlot: 'stationTheme',
    equipValue: 'emerald_eco',
  },
  {
    id: 'decor_default',
    category: 'station',
    name: 'Standard Lighting',
    description: 'Clean daytime station illumination with regular streetlamps.',
    gemPrice: 0,
    previewPrimary: '#64748B',
    previewSecondary: '#CBD5E1',
    previewAccent: '#FDE047',
    equipSlot: 'stationDecor',
    equipValue: 'default',
  },
  {
    id: 'decor_festive_lights',
    category: 'station',
    name: 'Golden Gala Lanterns',
    description: 'Installs animated glowing golden & amber decorative lights along the canopy and shop roof.',
    gemPrice: 26,
    previewPrimary: '#F59E0B',
    previewSecondary: '#EA580C',
    previewAccent: '#FEF08A',
    equipSlot: 'stationDecor',
    equipValue: 'festive_lights',
  },
  {
    id: 'decor_cyan_beacons',
    category: 'station',
    name: 'Cyan Beacon Pylons',
    description: 'Places glowing cyan accent beacons beside the fuel pumps, car wash bay, and price sign.',
    gemPrice: 34,
    previewPrimary: '#0EA5E9',
    previewSecondary: '#0369A1',
    previewAccent: '#7DD3FC',
    equipSlot: 'stationDecor',
    equipValue: 'cyan_beacons',
  },

  // D. SPECIAL CONSUMABLE ITEMS
  {
    id: 'special_tanker_voucher',
    category: 'special',
    name: 'Emergency Tanker +400L',
    description: 'Instant express underground fuel drop (+400L) directly into your station storage tank.',
    gemPrice: 12,
    consumable: true,
    previewPrimary: '#DC2626',
    previewSecondary: '#FACC15',
    previewAccent: '#FEF2F2',
    effectPayload: {
      fuelLiters: 400,
    },
  },
  {
    id: 'special_manager_grant',
    category: 'special',
    name: 'Operations Grant Crate',
    description: 'Adds +180 Cash, +12 Shop Stock, and +120 XP toward your next station level.',
    gemPrice: 16,
    consumable: true,
    previewPrimary: '#F59E0B',
    previewSecondary: '#22C55E',
    previewAccent: '#FFFBEB',
    effectPayload: {
      coins: 180,
      shopStock: 12,
      xp: 120,
    },
  },
];

export interface FutureBillingProduct {
  sku: string;
  category: 'gem_pack' | 'bundle' | 'cosmetic_pack' | 'seasonal' | 'vip';
  name: string;
  summary: string;
  badgeText: string;
  targetPriceLabel: string;
  status: 'coming_soon';
}

export const FUTURE_IAP_CATALOG: FutureBillingProduct[] = [
  {
    sku: 'zaidi_gems_handful_100',
    category: 'gem_pack',
    name: 'Handful of Gems (100 Gems)',
    summary: 'Starter gem top-up planned for Google Play Billing.',
    badgeText: 'Gem Package',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
  {
    sku: 'zaidi_gems_chest_550',
    category: 'gem_pack',
    name: 'Highway Vault (550 Gems)',
    summary: 'Best-value gem chest architecture reserved for native Android release.',
    badgeText: 'Gem Package',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
  {
    sku: 'zaidi_starter_tycoon_bundle',
    category: 'bundle',
    name: 'Station Tycoon Starter Bundle',
    summary: 'Includes executive outfit, station lantern kit, and bonus gem reserve.',
    badgeText: 'Premium Bundle',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
  {
    sku: 'zaidi_neon_cosmetic_pack',
    category: 'cosmetic_pack',
    name: 'ZAIDI Prestige Cosmetic Pack',
    summary: 'Exclusive themed livery and forecourt lighting collection.',
    badgeText: 'Cosmetic Pack',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
  {
    sku: 'zaidi_seasonal_highway_pass',
    category: 'seasonal',
    name: 'Highway Festival Seasonal Offer',
    summary: 'Limited-time seasonal decorations and celebration rewards.',
    badgeText: 'Seasonal Offer',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
  {
    sku: 'zaidi_vip_membership',
    category: 'vip',
    name: 'ZAIDI VIP Station Pass',
    summary: 'Optional VIP membership with daily gem stipends and cosmetic perks.',
    badgeText: 'VIP Membership',
    targetPriceLabel: 'Coming Soon',
    status: 'coming_soon',
  },
];

export interface DailyRewardSlot {
  dayIndex: number; // 0..6
  dayNumber: number;
  label: string;
  coins: number;
  gems: number;
  highlight?: boolean;
}

export const DAILY_REWARD_CALENDAR: DailyRewardSlot[] = [
  { dayIndex: 0, dayNumber: 1, label: 'Day 1', coins: 90, gems: 3 },
  { dayIndex: 1, dayNumber: 2, label: 'Day 2', coins: 120, gems: 4 },
  { dayIndex: 2, dayNumber: 3, label: 'Day 3', coins: 150, gems: 5 },
  { dayIndex: 3, dayNumber: 4, label: 'Day 4', coins: 180, gems: 6 },
  { dayIndex: 4, dayNumber: 5, label: 'Day 5', coins: 220, gems: 8 },
  { dayIndex: 5, dayNumber: 6, label: 'Day 6', coins: 260, gems: 10 },
  { dayIndex: 6, dayNumber: 7, label: 'Day 7 Jackpot', coins: 400, gems: 18, highlight: true },
];

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  target: number;
  rewardGems: number;
  rewardCoins: number;
  getProgress: (hud: GameHUDState) => number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  // Petrol Station
  {
    id: 'ach_fuel_10',
    category: 'fuel',
    title: 'First Shift Attendant',
    description: 'Refuel 10 customer vehicles at your pumps.',
    target: 10,
    rewardGems: 5,
    rewardCoins: 100,
    getProgress: (hud) => hud.stats.carsFueled,
  },
  {
    id: 'ach_fuel_50',
    category: 'fuel',
    title: 'Highway Fuel Master',
    description: 'Refuel 50 vehicles smoothly across your station bays.',
    target: 50,
    rewardGems: 12,
    rewardCoins: 280,
    getProgress: (hud) => hud.stats.carsFueled,
  },
  // Shop
  {
    id: 'ach_shop_10',
    category: 'shop',
    title: 'Quick Mart Clerk',
    description: 'Complete 10 Convenience Shop checkouts.',
    target: 10,
    rewardGems: 6,
    rewardCoins: 140,
    getProgress: (hud) => hud.stats.shopSales,
  },
  {
    id: 'ach_shop_35',
    category: 'shop',
    title: 'Retail Supermart',
    description: 'Ring up 35 Convenience Shop purchases.',
    target: 35,
    rewardGems: 14,
    rewardCoins: 350,
    getProgress: (hud) => hud.stats.shopSales,
  },
  // Car Wash
  {
    id: 'ach_wash_8',
    category: 'wash',
    title: 'Foam & Shine',
    description: 'Complete 8 Car Wash bay cycles.',
    target: 8,
    rewardGems: 8,
    rewardCoins: 180,
    getProgress: (hud) => hud.stats.carsWashed,
  },
  {
    id: 'ach_wash_25',
    category: 'wash',
    title: 'Hydro-Jet Specialist',
    description: 'Complete 25 Car Wash bay cycles.',
    target: 25,
    rewardGems: 16,
    rewardCoins: 420,
    getProgress: (hud) => hud.stats.carsWashed,
  },
  // Rooms for Rent
  {
    id: 'ach_rooms_5',
    category: 'rooms',
    title: 'Roadside Hospitality',
    description: 'Check in 5 overnight room guests.',
    target: 5,
    rewardGems: 9,
    rewardCoins: 220,
    getProgress: (hud) => hud.stats.roomsRented,
  },
  {
    id: 'ach_rooms_15',
    category: 'rooms',
    title: 'Executive Motel Host',
    description: 'Check in 15 motel room guests.',
    target: 15,
    rewardGems: 18,
    rewardCoins: 500,
    getProgress: (hud) => hud.stats.roomsRented,
  },
  // Business Growth
  {
    id: 'ach_unlock_4',
    category: 'growth',
    title: 'Growing Enterprise',
    description: 'Unlock 4 total station bays or businesses.',
    target: 4,
    rewardGems: 10,
    rewardCoins: 240,
    getProgress: (hud) => hud.unlockedBusinesses.length,
  },
  {
    id: 'ach_staff_2',
    category: 'growth',
    title: 'Crew Captain',
    description: 'Hire 2 staff members to run the station.',
    target: 2,
    rewardGems: 12,
    rewardCoins: 260,
    getProgress: (hud) => hud.employees.filter((e) => e.hired).length,
  },
  // Player Progression
  {
    id: 'ach_level_3',
    category: 'progression',
    title: 'Rising Operator',
    description: 'Reach Player Level 3 through service experience.',
    target: 3,
    rewardGems: 8,
    rewardCoins: 180,
    getProgress: (hud) => hud.level,
  },
  {
    id: 'ach_level_7',
    category: 'progression',
    title: 'Highway Empire Builder',
    description: 'Reach Player Level 7 through dedicated shifts.',
    target: 7,
    rewardGems: 20,
    rewardCoins: 600,
    getProgress: (hud) => hud.level,
  },
];

export interface EventChallengeDefinition {
  id: string;
  title: string;
  subtitle: string;
  target: number;
  rewardGems: number;
  rewardCoins: number;
  getProgress: (hud: GameHUDState) => number;
}

export const HIGHWAY_EVENTS_CATALOG: EventChallengeDefinition[] = [
  {
    id: 'evt_rush_hour',
    title: 'Highway Rush Hour Challenge',
    subtitle: 'Serve 12 fuel customers cleanly at your station pumps.',
    target: 12,
    rewardGems: 10,
    rewardCoins: 160,
    getProgress: (hud) => hud.stats.carsFueled,
  },
  {
    id: 'evt_grand_opening',
    title: 'Grand Service Milestone',
    subtitle: 'Generate $1,200 total revenue across any business.',
    target: 1200,
    rewardGems: 14,
    rewardCoins: 240,
    getProgress: (hud) => hud.stats.totalEarned,
  },
];

export interface GarageVehicleInfo {
  type: VehicleType;
  name: string;
  role: string;
  tankRange: string;
}

export const GARAGE_VEHICLE_LIST: GarageVehicleInfo[] = [
  { type: 'sedan_red', name: 'Crimson Sedan', role: 'Highway Commuter', tankRange: '18L' },
  { type: 'sedan_white', name: 'Pearl Executive', role: 'City Traveler', tankRange: '22L' },
  { type: 'car_blue', name: 'Cobalt Coupe', role: 'Wash & Fuel Visitor', tankRange: '20L' },
  { type: 'car_yellow', name: 'Taxi Compact', role: 'Express Patron', tankRange: '16L' },
  { type: 'suv_green', name: 'Forest Trail SUV', role: 'Heavy Cruiser', tankRange: '30L' },
  { type: 'van_white', name: 'Utility Cargo Van', role: 'Commercial Fleet', tankRange: '36L' },
  { type: 'suv_black', name: 'Obsidian Tourer', role: 'VIP Highway Cruiser', tankRange: '32L' },
  { type: 'hatch_orange', name: 'Sunset Hatchback', role: 'Local Shopper', tankRange: '15L' },
  { type: 'truck_delivery', name: 'Zaidi Supply Rig', role: 'Station Tanker', tankRange: 'Fleet' },
  { type: 'motorcycle', name: 'Redline Sportbike', role: 'Highway Traffic', tankRange: 'Sprint' },
];
