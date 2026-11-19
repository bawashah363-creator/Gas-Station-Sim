import {
  BusinessUnlockId,
  CustomHudLayout,
  DayPhase,
  EmployeeRecord,
  GameHUDState,
  GameTask,
} from './types';

export interface LevelMilestone {
  level: number;
  title: string;
  unlocks: BusinessUnlockId[];
  summary: string;
  bonusCoins: number;
}

export interface UnlockDefinition {
  id: BusinessUnlockId;
  name: string;
  level: number;
  cost: number;
  prerequisite: BusinessUnlockId | null;
  summary: string;
  category: 'pump' | 'business' | 'expansion';
}

export const UNLOCK_CATALOG: UnlockDefinition[] = [
  {
    id: 'pump_1',
    name: 'Petrol Pump 1',
    level: 1,
    cost: 0,
    prerequisite: null,
    summary: 'Starter fueling bay. Operate Pump 1 personally and serve incoming vehicles.',
    category: 'pump',
  },
  {
    id: 'pump_2',
    name: 'Petrol Pump 2',
    level: 2,
    cost: 220,
    prerequisite: 'pump_1',
    summary: 'Adds a second active fueling bay and enables hiring a Petrol Pump Attendant.',
    category: 'pump',
  },
  {
    id: 'shop',
    name: 'Convenience Shop',
    level: 3,
    cost: 420,
    prerequisite: 'pump_2',
    summary: 'Opens retail shelves, product inventory, customer checkouts & Shop Cashier hiring.',
    category: 'business',
  },
  {
    id: 'pump_3',
    name: 'Petrol Pump 3',
    level: 4,
    cost: 620,
    prerequisite: 'shop',
    summary: 'Expands forecourt to 3 pumps and unlocks the Delivery & Logistics Worker.',
    category: 'pump',
  },
  {
    id: 'car_wash',
    name: 'Automatic Car Wash',
    level: 5,
    cost: 900,
    prerequisite: 'pump_3',
    summary: 'Activates wash bay, live customer vehicle washes & Car Wash Worker hiring.',
    category: 'business',
  },
  {
    id: 'pump_4',
    name: 'Petrol Pump 4',
    level: 6,
    cost: 1250,
    prerequisite: 'car_wash',
    summary: 'Completes full 4-pump station capacity for high-volume highway traffic.',
    category: 'pump',
  },
  {
    id: 'rooms',
    name: 'Rooms for Rent',
    level: 7,
    cost: 1700,
    prerequisite: 'pump_4',
    summary: 'Opens roadside motel rooms, guest rentals, room cleaning & Housekeeping staff.',
    category: 'business',
  },
  {
    id: 'shop_deluxe',
    name: 'Supermart Shelves Expansion',
    level: 8,
    cost: 2300,
    prerequisite: 'rooms',
    summary: 'Adds +20 store shelf capacity, gourmet snacks & +35% shop checkout payouts.',
    category: 'expansion',
  },
  {
    id: 'wash_pro',
    name: 'Hydro-Jet Wash Machinery',
    level: 9,
    cost: 3000,
    prerequisite: 'shop_deluxe',
    summary: 'Upgrades wash bay with high-pressure jets, faster cycles & +40% wash payouts.',
    category: 'expansion',
  },
  {
    id: 'rooms_wing',
    name: 'Executive Motel & Tank Wing',
    level: 10,
    cost: 4200,
    prerequisite: 'wash_pro',
    summary: 'Adds +400L underground fuel capacity and VIP guest suites (+45% room revenue).',
    category: 'expansion',
  },
];

export const LEVEL_ROADMAP: LevelMilestone[] = UNLOCK_CATALOG.map((u) => ({
  level: u.level,
  title: u.name,
  unlocks: [u.id],
  summary: u.summary,
  bonusCoins: u.level === 1 ? 0 : u.level * 80,
}));

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 450,
  2: 850,
  3: 1400,
  4: 2150,
  5: 3100,
  6: 4300,
  7: 5800,
  8: 7600,
  9: 9800,
  10: 12500,
};

export function getXpRequiredForLevel(level: number): number {
  const safeLv = Math.max(1, Math.floor(level));
  if (LEVEL_XP_REQUIREMENTS[safeLv]) {
    return LEVEL_XP_REQUIREMENTS[safeLv];
  }
  return Math.round(12500 * Math.pow(1.28, safeLv - 10));
}

export const BUSINESS_UNLOCK_LEVEL: Record<BusinessUnlockId, number> = {
  pump_1: 1,
  pump_2: 2,
  shop: 3,
  pump_3: 4,
  car_wash: 5,
  pump_4: 6,
  rooms: 7,
  shop_deluxe: 8,
  wash_pro: 9,
  rooms_wing: 10,
};

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'attendant',
    name: 'Samir',
    roleLabel: 'Petrol Pump Attendant',
    unlockLevel: 2,
    requiredBusiness: 'pump_2',
    hireCost: 450,
    salaryPerDay: 85,
    hired: false,
    assigned: true,
    level: 1,
    maxLevel: 5,
  },
  {
    id: 'cashier',
    name: 'Nadia',
    roleLabel: 'Shop Cashier',
    unlockLevel: 3,
    requiredBusiness: 'shop',
    hireCost: 650,
    salaryPerDay: 110,
    hired: false,
    assigned: true,
    level: 1,
    maxLevel: 5,
  },
  {
    id: 'delivery',
    name: 'Bilal',
    roleLabel: 'Delivery & Logistics Worker',
    unlockLevel: 4,
    requiredBusiness: 'pump_3',
    hireCost: 900,
    salaryPerDay: 140,
    hired: false,
    assigned: true,
    level: 1,
    maxLevel: 5,
  },
  {
    id: 'washer',
    name: 'Tariq',
    roleLabel: 'Car Wash Worker',
    unlockLevel: 5,
    requiredBusiness: 'car_wash',
    hireCost: 1050,
    salaryPerDay: 155,
    hired: false,
    assigned: true,
    level: 1,
    maxLevel: 5,
  },
  {
    id: 'housekeeper',
    name: 'Ayesha',
    roleLabel: 'Room Service & Maintenance',
    unlockLevel: 7,
    requiredBusiness: 'rooms',
    hireCost: 1350,
    salaryPerDay: 185,
    hired: false,
    assigned: true,
    level: 1,
    maxLevel: 5,
  },
];

export const INITIAL_TASKS: GameTask[] = [
  {
    id: 't_first_5',
    title: 'Serve your first 8 fuel customers',
    category: 'fuel',
    current: 0,
    target: 8,
    rewardCoins: 140,
    rewardXp: 85,
    rewardDiamonds: 3,
    claimed: false,
  },
  {
    id: 't_earn_1000',
    title: 'Earn 1,500 Coins total revenue',
    category: 'earn',
    current: 0,
    target: 1500,
    rewardCoins: 220,
    rewardXp: 120,
    rewardDiamonds: 4,
    claimed: false,
  },
  {
    id: 't_upgrade_pump',
    title: 'Upgrade your first Petrol Pump',
    category: 'upgrade',
    current: 0,
    target: 1,
    rewardCoins: 160,
    rewardXp: 95,
    rewardDiamonds: 3,
    claimed: false,
  },
  {
    id: 't_hire_worker',
    title: 'Hire your first employee (Lv. 2)',
    category: 'hire',
    current: 0,
    target: 1,
    rewardCoins: 240,
    rewardXp: 130,
    rewardDiamonds: 5,
    claimed: false,
  },
  {
    id: 't_refuel_10',
    title: 'Refuel 25 vehicles total',
    category: 'fuel',
    current: 0,
    target: 25,
    rewardCoins: 340,
    rewardXp: 180,
    rewardDiamonds: 5,
    claimed: false,
  },
  {
    id: 't_shop_sales',
    title: 'Complete 10 Convenience Shop sales (Lv. 3)',
    category: 'shop',
    current: 0,
    target: 10,
    rewardCoins: 380,
    rewardXp: 210,
    rewardDiamonds: 6,
    claimed: false,
  },
  {
    id: 't_wash_cars',
    title: 'Complete 6 Car Wash cycles (Lv. 5)',
    category: 'wash',
    current: 0,
    target: 6,
    rewardCoins: 480,
    rewardXp: 260,
    rewardDiamonds: 8,
    claimed: false,
  },
  {
    id: 't_rent_rooms',
    title: 'Check in 5 Room Guests (Lv. 7)',
    category: 'rooms',
    current: 0,
    target: 5,
    rewardCoins: 650,
    rewardXp: 340,
    rewardDiamonds: 10,
    claimed: false,
  },
];

export const DEFAULT_CUSTOM_HUD: CustomHudLayout = {
  joystick: { xPct: 8, yPct: 81, scale: 0.9 },
  actionButton: { xPct: 88, yPct: 82, scale: 0.92 },
  zoomControls: { xPct: 17.5, yPct: 81, scale: 0.88 },
  opacity: 0.94,
};

export function createInitialGameState(): GameHUDState {
  return {
    playerName: 'Owner',
    level: 1,
    xp: 0,
    xpToNext: getXpRequiredForLevel(1),
    coins: 200,
    fuelLiters: 300,
    maxFuelLiters: 600,
    shopStock: 10,
    maxShopStock: 30,
    washSupplies: 100,
    maxWashSupplies: 100,
    roomNeedsClean: false,
    diamonds: 10,
    day: 1,
    gameMinutes: 8 * 60 + 30, // Start 08:30 AM Morning
    timeFormatted: '08:30 AM',
    dayPhase: 'Morning',
    isPaused: false,
    activePrompt: null,
    actionProgress: null,
    unlockedBusinesses: ['pump_1'],
    employees: INITIAL_EMPLOYEES.map((e) => ({ ...e })),
    tasks: INITIAL_TASKS.map((t) => ({ ...t })),
    upgrades: {
      pumpSpeedLevel: 1,
      tankCapacityLevel: 1,
      shopStockLevel: 1,
      carWashLevel: 1,
      roomsLevel: 1,
    },
    stats: {
      carsFueled: 0,
      carsWashed: 0,
      shopSales: 0,
      roomsRented: 0,
      totalEarned: 0,
    },
    toastMessage: null,
  };
}

export function getUnlockedForLevel(level: number): BusinessUnlockId[] {
  const unlocked: BusinessUnlockId[] = [];
  (Object.keys(BUSINESS_UNLOCK_LEVEL) as BusinessUnlockId[]).forEach((biz) => {
    if (level >= BUSINESS_UNLOCK_LEVEL[biz]) {
      unlocked.push(biz);
    }
  });
  return unlocked;
}

export function getDayPhase(minutes: number): DayPhase {
  const hour = Math.floor(minutes / 60);
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  if (hour >= 18 && hour < 21) return 'Evening';
  return 'Night';
}

export function formatClock(minutes: number): string {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}
