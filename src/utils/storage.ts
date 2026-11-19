import { STARTER_OWNED_ITEMS } from '../game/catalog';
import {
  createInitialGameState,
  DEFAULT_CUSTOM_HUD,
  getUnlockedForLevel,
  getXpRequiredForLevel,
} from '../game/progression';
import {
  CustomHudLayout,
  EquippedCosmetics,
  GameHUDState,
  GameSettings,
  GemTransaction,
  LobbyProfileMeta,
} from '../game/types';

const SAVE_KEY = 'gas_station_sim_save_v2';
const HUD_KEY = 'gas_station_sim_hud_v3';
const SETTINGS_KEY = 'gas_station_sim_settings_v2';
const META_KEY = 'gas_station_sim_meta_v1';

export const DEFAULT_EQUIPPED_COSMETICS: EquippedCosmetics = {
  playerOutfit: 'default',
  vehicleSkin: 'default',
  stationTheme: 'default',
  stationDecor: 'default',
};

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hasExistingCareerSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<GameHUDState>;
    return Boolean(
      (parsed.level && parsed.level > 1) ||
        (parsed.xp && parsed.xp > 0) ||
        (parsed.stats && parsed.stats.totalEarned > 0) ||
        (Array.isArray(parsed.unlockedBusinesses) && parsed.unlockedBusinesses.length > 1)
    );
  } catch {
    return false;
  }
}

export function loadGameState(): GameHUDState {
  const base = createInitialGameState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameHUDState>;
    const level = typeof parsed.level === 'number' && parsed.level >= 1 ? parsed.level : 1;
    const xpToNext = Math.max(
      typeof parsed.xpToNext === 'number' ? parsed.xpToNext : 0,
      getXpRequiredForLevel(level)
    );

    const savedUnlocks = Array.isArray(parsed.unlockedBusinesses)
      ? Array.from(new Set(['pump_1' as const, ...parsed.unlockedBusinesses]))
      : getUnlockedForLevel(level);

    return {
      ...base,
      ...parsed,
      level,
      xpToNext,
      isPaused: false,
      activePrompt: null,
      actionProgress: null,
      toastMessage: null,
      unlockedBusinesses: savedUnlocks,
      upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      employees: base.employees.map((def) => {
        const saved = parsed.employees?.find((e) => e.id === def.id);
        return saved
          ? {
              ...def,
              hired: saved.hired,
              assigned: saved.assigned,
              level: saved.level,
            }
          : def;
      }),
      tasks: base.tasks.map((def) => {
        const saved = parsed.tasks?.find((t) => t.id === def.id);
        return saved
          ? {
              ...def,
              current: saved.current,
              claimed: saved.claimed,
            }
          : def;
      }),
    };
  } catch {
    return base;
  }
}

export function saveGameState(state: GameHUDState): void {
  try {
    const serializable = {
      playerName: state.playerName,
      level: state.level,
      xp: state.xp,
      xpToNext: state.xpToNext,
      coins: state.coins,
      fuelLiters: state.fuelLiters,
      maxFuelLiters: state.maxFuelLiters,
      shopStock: state.shopStock,
      maxShopStock: state.maxShopStock,
      washSupplies: state.washSupplies,
      maxWashSupplies: state.maxWashSupplies,
      roomNeedsClean: state.roomNeedsClean,
      diamonds: state.diamonds,
      day: state.day,
      gameMinutes: state.gameMinutes,
      timeFormatted: state.timeFormatted,
      dayPhase: state.dayPhase,
      unlockedBusinesses: state.unlockedBusinesses,
      employees: state.employees,
      tasks: state.tasks,
      upgrades: state.upgrades,
      stats: state.stats,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearGameSave(): GameHUDState {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore
  }
  return createInitialGameState();
}

export function createDefaultLobbyMeta(
  initialGemBalance: number,
  hasStartedCareer: boolean
): LobbyProfileMeta {
  const safeBalance = Math.max(0, Math.floor(Number.isFinite(initialGemBalance) ? initialGemBalance : 0));
  return {
    hasStartedCareer,
    gemWallet: {
      balance: safeBalance,
      totalEarned: safeBalance,
      totalSpent: 0,
      transactions:
        safeBalance > 0
          ? [
              {
                id: 'tx_starter',
                timestamp: new Date().toISOString(),
                type: 'earn',
                amount: safeBalance,
                source: 'Existing Station Gem Reserve',
                balanceAfter: safeBalance,
              },
            ]
          : [],
    },
    ownedItems: [...STARTER_OWNED_ITEMS],
    equipped: { ...DEFAULT_EQUIPPED_COSMETICS },
    dailyRewards: {
      streakDay: 0,
      lastClaimDate: null,
      claimedDays: [],
    },
    claimedAchievements: [],
    claimedEvents: [],
  };
}

export function loadLobbyMeta(
  currentSaveGems: number,
  detectedCareer: boolean
): LobbyProfileMeta {
  const base = createDefaultLobbyMeta(currentSaveGems, detectedCareer);
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<LobbyProfileMeta>;
    const savedWallet = parsed.gemWallet;
    const syncedBalance =
      typeof savedWallet?.balance === 'number' && Number.isFinite(savedWallet.balance)
        ? Math.max(0, Math.floor(savedWallet.balance))
        : Math.max(0, Math.floor(currentSaveGems));

    return {
      hasStartedCareer: Boolean(parsed.hasStartedCareer || detectedCareer),
      gemWallet: {
        balance: syncedBalance,
        totalEarned:
          typeof savedWallet?.totalEarned === 'number'
            ? Math.max(syncedBalance, Math.floor(savedWallet.totalEarned))
            : Math.max(syncedBalance, base.gemWallet.totalEarned),
        totalSpent:
          typeof savedWallet?.totalSpent === 'number'
            ? Math.max(0, Math.floor(savedWallet.totalSpent))
            : 0,
        transactions: Array.isArray(savedWallet?.transactions)
          ? savedWallet.transactions.slice(0, 40)
          : base.gemWallet.transactions,
      },
      ownedItems: Array.from(
        new Set([...STARTER_OWNED_ITEMS, ...(Array.isArray(parsed.ownedItems) ? parsed.ownedItems : [])])
      ),
      equipped: {
        ...DEFAULT_EQUIPPED_COSMETICS,
        ...(parsed.equipped ?? {}),
      },
      dailyRewards: {
        streakDay:
          typeof parsed.dailyRewards?.streakDay === 'number'
            ? Math.min(6, Math.max(0, Math.floor(parsed.dailyRewards.streakDay)))
            : 0,
        lastClaimDate: parsed.dailyRewards?.lastClaimDate ?? null,
        claimedDays: Array.isArray(parsed.dailyRewards?.claimedDays)
          ? parsed.dailyRewards.claimedDays
          : [],
      },
      claimedAchievements: Array.isArray(parsed.claimedAchievements)
        ? parsed.claimedAchievements
        : [],
      claimedEvents: Array.isArray(parsed.claimedEvents) ? parsed.claimedEvents : [],
    };
  } catch {
    return base;
  }
}

export function saveLobbyMeta(meta: LobbyProfileMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

export function creditGems(
  meta: LobbyProfileMeta,
  rawAmount: number,
  source: string
): LobbyProfileMeta {
  const amount = Math.floor(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return meta;
  const nextBalance = meta.gemWallet.balance + amount;
  const tx: GemTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: 'earn',
    amount,
    source,
    balanceAfter: nextBalance,
  };
  return {
    ...meta,
    gemWallet: {
      balance: nextBalance,
      totalEarned: meta.gemWallet.totalEarned + amount,
      totalSpent: meta.gemWallet.totalSpent,
      transactions: [tx, ...meta.gemWallet.transactions].slice(0, 40),
    },
  };
}

export function debitGems(
  meta: LobbyProfileMeta,
  rawAmount: number,
  source: string
): { ok: boolean; meta: LobbyProfileMeta; error?: string } {
  const amount = Math.floor(rawAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, meta, error: 'Invalid gem transaction amount.' };
  }
  if (amount === 0) {
    return { ok: true, meta };
  }
  if (meta.gemWallet.balance < amount) {
    return { ok: false, meta, error: 'Not enough Gems! Earn more via Daily Rewards, Tasks, or Achievements.' };
  }
  const nextBalance = meta.gemWallet.balance - amount;
  const tx: GemTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: 'spend',
    amount,
    source,
    balanceAfter: nextBalance,
  };
  return {
    ok: true,
    meta: {
      ...meta,
      gemWallet: {
        balance: nextBalance,
        totalEarned: meta.gemWallet.totalEarned,
        totalSpent: meta.gemWallet.totalSpent + amount,
        transactions: [tx, ...meta.gemWallet.transactions].slice(0, 40),
      },
    },
  };
}

export function loadCustomHud(): CustomHudLayout {
  try {
    const raw = localStorage.getItem(HUD_KEY);
    if (!raw) return DEFAULT_CUSTOM_HUD;
    const parsed = JSON.parse(raw) as Partial<CustomHudLayout>;
    return {
      joystick: { ...DEFAULT_CUSTOM_HUD.joystick, ...(parsed.joystick ?? {}) },
      actionButton: { ...DEFAULT_CUSTOM_HUD.actionButton, ...(parsed.actionButton ?? {}) },
      zoomControls: { ...DEFAULT_CUSTOM_HUD.zoomControls, ...(parsed.zoomControls ?? {}) },
      opacity:
        typeof parsed.opacity === 'number'
          ? Math.min(1, Math.max(0.5, parsed.opacity))
          : DEFAULT_CUSTOM_HUD.opacity,
    };
  } catch {
    return DEFAULT_CUSTOM_HUD;
  }
}

export function saveCustomHud(layout: CustomHudLayout): void {
  try {
    localStorage.setItem(HUD_KEY, JSON.stringify(layout));
  } catch {
    // Ignore
  }
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  ambientEnabled: true,
  muteAll: false,
  masterVolume: 0.85,
  sfxVolume: 0.85,
  musicVolume: 0.45,
  ambientVolume: 0.65,
  showVirtualJoystick: true,
  highQualityShadows: true,
  graphicsQuality: 'high',
  cameraSensitivity: 1.0,
  language: 'en',
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_GAME_SETTINGS,
      ...parsed,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.min(1, Math.max(0, parsed.masterVolume))
          : DEFAULT_GAME_SETTINGS.masterVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? Math.min(1, Math.max(0, parsed.sfxVolume))
          : DEFAULT_GAME_SETTINGS.sfxVolume,
      musicVolume:
        typeof parsed.musicVolume === 'number'
          ? Math.min(1, Math.max(0, parsed.musicVolume))
          : DEFAULT_GAME_SETTINGS.musicVolume,
      ambientVolume:
        typeof parsed.ambientVolume === 'number'
          ? Math.min(1, Math.max(0, parsed.ambientVolume))
          : DEFAULT_GAME_SETTINGS.ambientVolume,
      cameraSensitivity:
        typeof parsed.cameraSensitivity === 'number'
          ? Math.min(1.8, Math.max(0.5, parsed.cameraSensitivity))
          : DEFAULT_GAME_SETTINGS.cameraSensitivity,
      graphicsQuality: parsed.graphicsQuality === 'balanced' ? 'balanced' : 'high',
      language: parsed.language === 'ur' ? 'ur' : 'en',
    };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function resetAllSettings(): GameSettings {
  const defaults = { ...DEFAULT_GAME_SETTINGS };
  saveSettings(defaults);
  return defaults;
}
