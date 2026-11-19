export type CharacterRole =
  | 'player'
  | 'worker_pump'
  | 'cashier'
  | 'worker_wash'
  | 'worker_rooms'
  | 'customer_male'
  | 'customer_female'
  | 'customer_suit'
  | 'guest_male'
  | 'guest_female'
  | 'delivery_driver';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'work'
  | 'carry'
  | 'interact'
  | 'wait';

export type VehicleType =
  | 'sedan_red'
  | 'sedan_white'
  | 'car_blue'
  | 'car_yellow'
  | 'suv_green'
  | 'van_white'
  | 'suv_black'
  | 'hatch_orange'
  | 'truck_delivery'
  | 'motorcycle';

export type ServiceZoneId =
  | 'pump_1'
  | 'pump_2'
  | 'pump_3'
  | 'pump_4'
  | 'shop'
  | 'car_wash'
  | 'rooms'
  | 'fuel_tank';

export type BusinessUnlockId =
  | 'pump_1'
  | 'pump_2'
  | 'pump_3'
  | 'pump_4'
  | 'shop'
  | 'car_wash'
  | 'rooms'
  | 'shop_deluxe'
  | 'wash_pro'
  | 'rooms_wing';

export type EmployeeRoleId =
  | 'attendant'
  | 'cashier'
  | 'washer'
  | 'housekeeper'
  | 'delivery';

export interface EmployeeRecord {
  id: EmployeeRoleId;
  name: string;
  roleLabel: string;
  unlockLevel: number;
  requiredBusiness: BusinessUnlockId;
  hireCost: number;
  salaryPerDay: number;
  hired: boolean;
  assigned: boolean;
  level: number;
  maxLevel: number;
}

export interface ActiveServicePrompt {
  zoneId: ServiceZoneId;
  title: string;
  actionLabel: string;
  category: 'fuel' | 'shop' | 'wash' | 'rooms' | 'supply';
  rewardCoins: number;
  rewardXp: number;
  fuelCost: number;
  shopStockCost?: number;
  washSupplyCost?: number;
  isRoomClean?: boolean;
  ready: boolean;
  lockedReason?: string;
  durationSec?: number;
}

export interface GameTask {
  id: string;
  title: string;
  category: 'fuel' | 'shop' | 'wash' | 'rooms' | 'earn' | 'upgrade' | 'hire';
  current: number;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  rewardDiamonds: number;
  claimed: boolean;
}

export interface UpgradeState {
  pumpSpeedLevel: number;
  tankCapacityLevel: number;
  shopStockLevel: number;
  carWashLevel: number;
  roomsLevel: number;
}

export interface HudElementPosition {
  xPct: number; // 0..100 within safe screen
  yPct: number; // 0..100 within safe screen
  scale: number; // 0.75..1.35
}

export interface CustomHudLayout {
  joystick: HudElementPosition;
  actionButton: HudElementPosition;
  zoomControls: HudElementPosition;
  opacity: number; // 0.55..1.0
}

export type DayPhase = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface GameHUDState {
  playerName: string;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  fuelLiters: number;
  maxFuelLiters: number;
  shopStock: number;
  maxShopStock: number;
  washSupplies: number;
  maxWashSupplies: number;
  roomNeedsClean: boolean;
  diamonds: number;
  day: number;
  gameMinutes: number;
  timeFormatted: string;
  dayPhase: DayPhase;
  isPaused: boolean;
  activePrompt: ActiveServicePrompt | null;
  actionProgress: number | null; // 0..1 while player is actively fueling/washing/etc.
  unlockedBusinesses: BusinessUnlockId[];
  employees: EmployeeRecord[];
  tasks: GameTask[];
  upgrades: UpgradeState;
  stats: {
    carsFueled: number;
    carsWashed: number;
    shopSales: number;
    roomsRented: number;
    totalEarned: number;
  };
  toastMessage: string | null;
}

export interface JoystickVector {
  x: number;
  y: number;
  active: boolean;
}

export type PlayerOutfitId = 'default' | 'royal_gold' | 'cyan_tech' | 'midnight_vip';
export type VehicleSkinId = 'default' | 'gold_edition' | 'cyber_cyan' | 'ruby_chrome';
export type StationThemeId = 'default' | 'navy_gold' | 'emerald_eco';
export type StationDecorId = 'default' | 'festive_lights' | 'cyan_beacons';

export interface EquippedCosmetics {
  playerOutfit: PlayerOutfitId;
  vehicleSkin: VehicleSkinId;
  stationTheme: StationThemeId;
  stationDecor: StationDecorId;
}

export interface GemTransaction {
  id: string;
  timestamp: string;
  type: 'earn' | 'spend';
  amount: number;
  source: string;
  balanceAfter: number;
}

export interface GemWalletState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: GemTransaction[];
}

export interface DailyRewardsState {
  streakDay: number; // 0..6 (next day index to claim)
  lastClaimDate: string | null; // YYYY-MM-DD local date
  claimedDays: number[]; // indices claimed in current 7-day cycle
}

export type AchievementCategory =
  | 'fuel'
  | 'shop'
  | 'wash'
  | 'rooms'
  | 'growth'
  | 'progression';

export interface LobbyProfileMeta {
  hasStartedCareer: boolean;
  gemWallet: GemWalletState;
  ownedItems: string[];
  equipped: EquippedCosmetics;
  dailyRewards: DailyRewardsState;
  claimedAchievements: string[];
  claimedEvents: string[];
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  ambientEnabled: boolean;
  muteAll: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
  showVirtualJoystick: boolean;
  highQualityShadows: boolean;
  graphicsQuality: 'high' | 'balanced';
  cameraSensitivity: number;
  language: 'en' | 'ur';
}

