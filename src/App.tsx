/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD, ModalType } from './components/GameHUD';
import { GameModals } from './components/GameModals';
import { GemStoreModal } from './components/GemStoreModal';
import { HudEditOverlay } from './components/HudEditOverlay';
import { OrientationGuard } from './components/OrientationGuard';
import { StoreItemDefinition } from './game/catalog';
import { PhaserGame, PhaserGameHandle } from './game/PhaserGame';
import {
  applyRatingFeedback,
  calculateServiceCoins,
  calculateServiceXp,
  createDefaultPricing,
  formatClock,
  getDayPhase,
  getXpRequiredForLevel,
  LEVEL_ROADMAP,
  MAX_FUEL_PRICE,
  MIN_FUEL_PRICE,
  roundCents,
  SHOP_PRODUCTS,
  UNLOCK_CATALOG,
} from './game/progression';
import {
  ActiveServicePrompt,
  BusinessUnlockId,
  CustomerFeedbackEvent,
  CustomHudLayout,
  EmployeeRoleId,
  GameHUDState,
  GameSettings,
  JoystickVector,
  LiveFuelState,
  LiveShopSaleState,
  LobbyProfileMeta,
  ShopProductId,
  UpgradeState,
} from './game/types';
import {
  isFullscreenActive,
  isPortraitViewport,
  notifyAndroidImmersive,
  toggleFullscreenLandscape,
} from './utils/androidFullscreen';
import { soundFx } from './utils/soundFx';
import {
  clearGameSave,
  creditGems,
  debitGems,
  DEFAULT_GAME_SETTINGS,
  hasExistingCareerSave,
  loadCustomHud,
  loadGameState,
  loadLobbyMeta,
  loadSettings,
  saveCustomHud,
  saveGameState,
  saveLobbyMeta,
  saveSettings,
} from './utils/storage';

export default function App() {
  const gameRef = useRef<PhaserGameHandle | null>(null);
  const [hud, setHud] = useState<GameHUDState>(() => loadGameState());
  const hudRef = useRef<GameHUDState>(hud);
  hudRef.current = hud;

  const [meta, setMeta] = useState<LobbyProfileMeta>(() =>
    loadLobbyMeta(hud.diamonds, hasExistingCareerSave())
  );
  const metaRef = useRef<LobbyProfileMeta>(meta);
  metaRef.current = meta;

  const [hudLayout, setHudLayout] = useState<CustomHudLayout>(() => loadCustomHud());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [storeOpenInGame, setStoreOpenInGame] = useState(false);
  const [isEditingHud, setIsEditingHud] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [liveFuel, setLiveFuel] = useState<LiveFuelState | null>(null);
  const [lastShopSale, setLastShopSale] = useState<LiveShopSaleState | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const lastAwardedLevelRef = useRef<number>(hud.level);
  const shopTxCounterRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setHud((prev) => ({ ...prev, toastMessage: msg }));
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setHud((prev) => ({ ...prev, toastMessage: null }));
    }, 3200);
  }, []);

  // Keep hud.diamonds synchronized with Gem Wallet balance
  useEffect(() => {
    saveLobbyMeta(meta);
    setHud((prev) =>
      prev.diamonds !== meta.gemWallet.balance
        ? { ...prev, diamonds: meta.gemWallet.balance }
        : prev
    );
  }, [meta]);

  // Award Gems cleanly once per level-up
  useEffect(() => {
    if (hud.level > lastAwardedLevelRef.current) {
      const gainedLevels = hud.level - lastAwardedLevelRef.current;
      const reachedLevel = hud.level;
      lastAwardedLevelRef.current = reachedLevel;
      const milestone = LEVEL_ROADMAP.find((m) => m.level === reachedLevel);
      const gemBonus = gainedLevels * 5 + (milestone ? 5 : 0);
      setMeta((prev) => creditGems(prev, gemBonus, `Reached Level ${reachedLevel}`));
    } else if (hud.level < lastAwardedLevelRef.current) {
      lastAwardedLevelRef.current = hud.level;
    }
  }, [hud.level]);

  // Sync audio & visual settings
  useEffect(() => {
    soundFx.updateSettings(settings);
    saveSettings(settings);
    gameRef.current?.setVisualSettings(
      settings.cameraSensitivity,
      settings.graphicsQuality
    );
  }, [settings]);

  // Sync equipped cosmetics to Phaser scene
  useEffect(() => {
    gameRef.current?.setCosmetics(meta.equipped);
  }, [meta.equipped]);

  // Persist HUD progress reliably
  useEffect(() => {
    saveGameState(hud);
  }, [
    hud.level,
    hud.xp,
    hud.coins,
    hud.fuelLiters,
    hud.shopStock,
    hud.washSupplies,
    hud.roomNeedsClean,
    hud.diamonds,
    hud.day,
    hud.unlockedBusinesses,
    hud.employees,
    hud.tasks,
    hud.upgrades,
    hud.stats,
    hud.ratings,
    hud.pricing,
  ]);

  // Sync Phaser scene whenever unlocks, employees, upgrades, stock, ratings, pricing, or dayPhase change
  useEffect(() => {
    gameRef.current?.syncProgress(
      hud.unlockedBusinesses,
      hud.employees,
      hud.upgrades,
      hud.dayPhase,
      hud.washSupplies,
      hud.roomNeedsClean,
      hud.shopStock,
      hud.ratings,
      hud.pricing
    );
  }, [
    hud.unlockedBusinesses,
    hud.employees,
    hud.upgrades,
    hud.dayPhase,
    hud.washSupplies,
    hud.roomNeedsClean,
    hud.shopStock,
    hud.ratings,
    hud.pricing,
  ]);

  // Android fullscreen, orientation & visibility resume handling
  useEffect(() => {
    const syncViewport = () => {
      setIsFullscreen(isFullscreenActive());
      setIsPortrait(isPortraitViewport());
    };

    const handleVisibility = () => {
      if (document.hidden) {
        soundFx.setTabHidden(true);
        setHud((prev) => ({ ...prev, isPaused: true }));
        gameRef.current?.setPaused(true);
      } else {
        soundFx.setTabHidden(false);
        notifyAndroidImmersive(true);
        syncViewport();
      }
    };

    syncViewport();
    notifyAndroidImmersive(true);

    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    document.addEventListener('fullscreenchange', syncViewport);
    document.addEventListener('webkitfullscreenchange', syncViewport);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      document.removeEventListener('fullscreenchange', syncViewport);
      document.removeEventListener('webkitfullscreenchange', syncViewport);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Day & Night Cycle Clock
  useEffect(() => {
    if (hud.isPaused || activeModal || storeOpenInGame || isEditingHud) {
      return;
    }
    const timer = window.setInterval(() => {
      setHud((prev) => {
        const nextMinutes = (prev.gameMinutes + 2) % (24 * 60);
        const rolledDay = nextMinutes < prev.gameMinutes;
        const nextDay = rolledDay ? prev.day + 1 : prev.day;
        const nextPhase = getDayPhase(nextMinutes);

        let nextCoins = prev.coins;
        let toast = prev.toastMessage;

        if (rolledDay) {
          const payroll = prev.employees
            .filter((e) => e.hired && e.assigned)
            .reduce((sum, e) => sum + e.salaryPerDay, 0);
          if (payroll > 0) {
            nextCoins = roundCents(Math.max(0, nextCoins - payroll));
            toast = `Day ${nextDay} · Paid $${payroll} staff wages`;
          } else {
            toast = `Day ${nextDay} Started!`;
          }
        }

        return {
          ...prev,
          gameMinutes: nextMinutes,
          timeFormatted: formatClock(nextMinutes),
          dayPhase: nextPhase,
          day: nextDay,
          coins: nextCoins,
          toastMessage: toast,
        };
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [hud.isPaused, activeModal, storeOpenInGame, isEditingHud]);

  const applyXpAndLevels = (
    prev: GameHUDState,
    earnedXp: number,
    earnedCoins: number
  ) => {
    let nextXp = prev.xp + earnedXp;
    let nextLevel = prev.level;
    let nextXpReq = prev.xpToNext;
    let bonusCoins = 0;
    let leveledUp = false;

    while (nextXp >= nextXpReq) {
      nextXp -= nextXpReq;
      nextLevel += 1;
      nextXpReq = getXpRequiredForLevel(nextLevel);
      leveledUp = true;
      const milestone = LEVEL_ROADMAP.find((m) => m.level === nextLevel);
      bonusCoins += milestone?.bonusCoins ?? nextLevel * 85;
    }

    if (leveledUp) {
      soundFx.playLevelUp();
      gameRef.current?.triggerLevelUpCelebration(nextLevel);
      const milestone = LEVEL_ROADMAP.find((m) => m.level === nextLevel);
      if (milestone) {
        soundFx.playNewMissionAvailable();
      }
      showToast(
        milestone
          ? `Level ${nextLevel}! New Unlock Ready: ${milestone.title} (+$${bonusCoins})`
          : `Reached Level ${nextLevel}! (+$${bonusCoins})`
      );
    }

    return {
      nextXp,
      nextLevel,
      nextXpReq,
      nextCoins: roundCents(prev.coins + earnedCoins + bonusCoins),
      unlockedBusinesses: prev.unlockedBusinesses,
    };
  };

  const handlePromptChange = useCallback((prompt: ActiveServicePrompt | null) => {
    setHud((prev) => ({ ...prev, activePrompt: prompt }));
  }, []);

  const handleActionProgress = useCallback((progress: number | null) => {
    setHud((prev) => ({ ...prev, actionProgress: progress }));
  }, []);

  const handleLiveFuelChange = useCallback((fuel: LiveFuelState | null) => {
    setLiveFuel(fuel);
  }, []);

  const handleCustomerFeedback = useCallback(
    (fb: CustomerFeedbackEvent) => {
      setHud((prev) => ({
        ...prev,
        ratings: {
          ...prev.ratings,
          [fb.business]: applyRatingFeedback(prev.ratings[fb.business], fb),
        },
      }));
      if (!fb.served) {
        showToast(
          fb.business === 'fuel'
            ? '😡 Fuel customer left angry! Fuel rating dropped.'
            : '😡 Shop customer left angry! Shop rating dropped.'
        );
      }
    },
    [showToast]
  );

  const handleUpdateFuelPrice = useCallback((nextPrice: number) => {
    const clamped = roundCents(Math.min(MAX_FUEL_PRICE, Math.max(MIN_FUEL_PRICE, nextPrice)));
    soundFx.playTap();
    setHud((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        fuelPricePerLitre: clamped,
      },
    }));
  }, []);

  const handleUpdateShopProductPrice = useCallback(
    (productId: ShopProductId, nextPrice: number) => {
      const def = SHOP_PRODUCTS.find((p) => p.id === productId);
      if (!def) return;
      const clamped = roundCents(Math.min(def.maxPrice, Math.max(def.minPrice, nextPrice)));
      soundFx.playTap();
      setHud((prev) => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          shopProductPrices: {
            ...prev.pricing.shopProductPrices,
            [productId]: clamped,
          },
        },
      }));
    },
    []
  );

  const handleResetDefaultPrices = useCallback(() => {
    soundFx.playTap();
    setHud((prev) => ({
      ...prev,
      pricing: createDefaultPricing(),
    }));
    showToast('Restored all prices to Market Rate!');
  }, [showToast]);

  const handleServiceExecute = useCallback(
    (prompt: ActiveServicePrompt, byWorker = false): boolean => {
      const cur = hudRef.current;
      if (prompt.fuelCost > 0 && cur.fuelLiters < prompt.fuelCost) {
        return false;
      }
      if (
        prompt.shopStockCost &&
        prompt.shopStockCost > 0 &&
        cur.shopStock < prompt.shopStockCost
      ) {
        return false;
      }
      if (
        prompt.washSupplyCost &&
        prompt.washSupplyCost > 0 &&
        cur.washSupplies < prompt.washSupplyCost
      ) {
        return false;
      }
      if (prompt.rewardCoins < 0 && cur.coins < Math.abs(prompt.rewardCoins)) {
        return false;
      }

      setHud((prev) => {
        if (prompt.fuelCost > 0 && prev.fuelLiters < prompt.fuelCost) {
          return prev;
        }
        if (
          prompt.shopStockCost &&
          prompt.shopStockCost > 0 &&
          prev.shopStock < prompt.shopStockCost
        ) {
          return prev;
        }
        if (
          prompt.washSupplyCost &&
          prompt.washSupplyCost > 0 &&
          prev.washSupplies < prompt.washSupplyCost
        ) {
          return prev;
        }
        if (prompt.rewardCoins < 0 && prev.coins < Math.abs(prompt.rewardCoins)) {
          return prev;
        }

        const coinDelta = calculateServiceCoins(
          prompt.category,
          prompt.rewardCoins,
          prev.upgrades,
          prev.unlockedBusinesses,
          byWorker
        );
        const earnedXp = calculateServiceXp(prompt.category, prompt.rewardXp, byWorker);
        const nextFuel = Math.min(
          prev.maxFuelLiters,
          Math.max(0, prev.fuelLiters - prompt.fuelCost)
        );
        const nextStock = Math.min(
          prev.maxShopStock,
          Math.max(0, prev.shopStock - (prompt.shopStockCost ?? 0))
        );
        const nextWashSupplies = Math.min(
          prev.maxWashSupplies,
          Math.max(0, prev.washSupplies - (prompt.washSupplyCost ?? 0))
        );
        const nextRoomNeedsClean =
          prompt.category === 'rooms'
            ? prompt.isRoomClean
              ? false
              : true
            : prev.roomNeedsClean;

        const isWashRefill =
          prompt.category === 'wash' &&
          typeof prompt.washSupplyCost === 'number' &&
          prompt.washSupplyCost < 0;
        const isRoomCleaningAction = prompt.category === 'rooms' && Boolean(prompt.isRoomClean);

        const nextStats = {
          ...prev.stats,
          totalEarned: roundCents(prev.stats.totalEarned + Math.max(0, coinDelta)),
        };
        if (prompt.category === 'fuel') nextStats.carsFueled += 1;
        if (prompt.category === 'wash' && !isWashRefill) nextStats.carsWashed += 1;
        if (prompt.category === 'shop') {
          nextStats.shopSales += 1;
          nextStats.shopIncome = roundCents(
            (nextStats.shopIncome ?? 0) + Math.max(0, coinDelta)
          );
        }
        if (prompt.category === 'rooms' && !isRoomCleaningAction) nextStats.roomsRented += 1;

        let newlyCompletedTaskCategory: string | null = null;
        const nextTasks = prev.tasks.map((t) => {
          const matchesAction =
            t.category === prompt.category &&
            !(prompt.category === 'wash' && isWashRefill) &&
            !(prompt.category === 'rooms' && isRoomCleaningAction);
          let nextCurrent = t.current;
          if (matchesAction && t.current < t.target) {
            nextCurrent = t.current + 1;
          } else if (t.category === 'earn') {
            nextCurrent = Math.min(t.target, Math.floor(nextStats.totalEarned));
          }
          if (t.current < t.target && nextCurrent >= t.target) {
            newlyCompletedTaskCategory = t.category;
          }
          return nextCurrent !== t.current ? { ...t, current: nextCurrent } : t;
        });

        if (newlyCompletedTaskCategory === 'earn') {
          soundFx.playAchievementUnlocked();
        } else if (newlyCompletedTaskCategory) {
          soundFx.playTaskCompleted();
        }

        const lvlResult = applyXpAndLevels(prev, earnedXp, coinDelta);

        return {
          ...prev,
          coins: lvlResult.nextCoins,
          fuelLiters: nextFuel,
          shopStock: nextStock,
          washSupplies: nextWashSupplies,
          roomNeedsClean: nextRoomNeedsClean,
          xp: lvlResult.nextXp,
          level: lvlResult.nextLevel,
          xpToNext: lvlResult.nextXpReq,
          unlockedBusinesses: lvlResult.unlockedBusinesses,
          stats: nextStats,
          tasks: nextTasks,
        };
      });

      if (prompt.category === 'shop') {
        const shopSaleCoins = calculateServiceCoins(
          'shop',
          prompt.rewardCoins,
          cur.upgrades,
          cur.unlockedBusinesses,
          byWorker
        );
        if (shopSaleCoins > 0) {
          shopTxCounterRef.current += 1;
          const basketSummary =
            prompt.shopBasket && prompt.shopBasket.length > 0
              ? `${prompt.shopBasket
                  .slice(0, 2)
                  .map((b) => (b.qty > 1 ? `${b.qty}x ${b.name}` : b.name))
                  .join(', ')}${prompt.shopBasket.length > 2 ? ` +${prompt.shopBasket.length - 2}` : ''}`
              : byWorker
                ? 'Cashier Checkout'
                : 'Customer Purchase';
          setLastShopSale({
            txId: shopTxCounterRef.current,
            amount: shopSaleCoins,
            byWorker,
            customerLabel: basketSummary,
            timestamp: Date.now(),
          });
        }
      }

      return true;
    },
    [showToast]
  );

  const handlePurchaseStoreItem = (item: StoreItemDefinition) => {
    const curMeta = metaRef.current;
    if (!item.consumable && curMeta.ownedItems.includes(item.id)) {
      showToast(`${item.name} is already owned.`);
      return;
    }

    const res = debitGems(curMeta, item.gemPrice, `Store: ${item.name}`);
    if (!res.ok) {
      soundFx.playLocked();
      showToast(res.error ?? 'Insufficient Gems.');
      return;
    }

    soundFx.playUnlockPurchase();

    if (item.consumable && item.effectPayload) {
      setMeta(res.meta);
      const payload = item.effectPayload;
      setHud((prev) => {
        const lvl = payload.xp ? applyXpAndLevels(prev, payload.xp, payload.coins ?? 0) : null;
        return {
          ...prev,
          coins: lvl ? lvl.nextCoins : prev.coins + (payload.coins ?? 0),
          xp: lvl ? lvl.nextXp : prev.xp,
          level: lvl ? lvl.nextLevel : prev.level,
          xpToNext: lvl ? lvl.nextXpReq : prev.xpToNext,
          fuelLiters: Math.min(
            prev.maxFuelLiters,
            prev.fuelLiters + (payload.fuelLiters ?? 0)
          ),
          shopStock: Math.min(
            prev.maxShopStock,
            prev.shopStock + (payload.shopStock ?? 0)
          ),
          washSupplies: Math.min(
            prev.maxWashSupplies,
            prev.washSupplies + (payload.washSupplies ?? 0)
          ),
        };
      });
      showToast(`Activated ${item.name}!`);
      return;
    }

    const nextEquipped =
      item.equipSlot && item.equipValue
        ? { ...res.meta.equipped, [item.equipSlot]: item.equipValue }
        : res.meta.equipped;

    setMeta({
      ...res.meta,
      ownedItems: Array.from(new Set([...res.meta.ownedItems, item.id])),
      equipped: nextEquipped,
    });
    showToast(`Unlocked & Equipped ${item.name}!`);
  };

  const handleEquipStoreItem = (item: StoreItemDefinition) => {
    if (!item.equipSlot || !item.equipValue) return;
    if (!metaRef.current.ownedItems.includes(item.id)) return;
    soundFx.playTap();
    setMeta((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [item.equipSlot!]: item.equipValue!,
      },
    }));
    showToast(`Equipped ${item.name}!`);
  };

  const handleToggleFullscreen = async () => {
    soundFx.playTap();
    const active = await toggleFullscreenLandscape();
    setIsFullscreen(active);
  };

  const handleTogglePause = () => {
    soundFx.playTap();
    setHud((prev) => {
      const nextPaused = !prev.isPaused;
      gameRef.current?.setPaused(nextPaused);
      soundFx.setPaused(nextPaused);
      return { ...prev, isPaused: nextPaused };
    });
  };

  const handleOpenModal = (modal: ModalType) => {
    soundFx.playTap();
    setActiveModal(modal);
    gameRef.current?.setPaused(modal !== null);
    soundFx.setPaused(modal !== null || hudRef.current.isPaused);
  };

  const handleCloseModal = () => {
    soundFx.playTap();
    setActiveModal(null);
    if (!hud.isPaused && !isEditingHud && !storeOpenInGame) {
      gameRef.current?.setPaused(false);
      soundFx.setPaused(false);
    }
  };

  const handleClaimTask = (taskId: string) => {
    const target = hudRef.current.tasks.find((t) => t.id === taskId);
    if (!target || target.claimed || target.current < target.target) return;

    soundFx.playRewardCollected();

    if (target.rewardDiamonds > 0) {
      setMeta((prev) =>
        creditGems(prev, target.rewardDiamonds, `Daily Task: ${target.title}`)
      );
    }

    setHud((prev) => {
      const tCur = prev.tasks.find((t) => t.id === taskId);
      if (!tCur || tCur.claimed || tCur.current < tCur.target) return prev;
      const lvl = applyXpAndLevels(prev, tCur.rewardXp, tCur.rewardCoins);
      const nextTasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, claimed: true } : t
      );
      if (nextTasks.every((t) => t.claimed)) {
        soundFx.playDailyMissionCompleted();
      }
      return {
        ...prev,
        coins: lvl.nextCoins,
        xp: lvl.nextXp,
        level: lvl.nextLevel,
        xpToNext: lvl.nextXpReq,
        unlockedBusinesses: lvl.unlockedBusinesses,
        tasks: nextTasks,
      };
    });
  };

  const handleBuyUpgrade = (key: keyof UpgradeState, cost: number) => {
    soundFx.playUpgradePurchase();
    setHud((prev) => {
      if (prev.coins < cost) return prev;
      const nextUpgrades = { ...prev.upgrades, [key]: prev.upgrades[key] + 1 };
      const nextMaxFuel =
        key === 'tankCapacityLevel' ? prev.maxFuelLiters + 400 : prev.maxFuelLiters;
      const nextMaxShop =
        key === 'shopStockLevel' ? prev.maxShopStock + 15 : prev.maxShopStock;

      let completedTask = false;
      const nextTasks = prev.tasks.map((t) => {
        if (t.category === 'upgrade' && t.current < t.target) {
          const nextCurrent = t.current + 1;
          if (nextCurrent >= t.target) completedTask = true;
          return { ...t, current: nextCurrent };
        }
        return t;
      });
      if (completedTask) soundFx.playTaskCompleted();

      showToast('Upgrade Installed!');
      return {
        ...prev,
        coins: roundCents(prev.coins - cost),
        maxFuelLiters: nextMaxFuel,
        maxShopStock: nextMaxShop,
        upgrades: nextUpgrades,
        tasks: nextTasks,
      };
    });
  };

  const handleHireEmployee = (id: EmployeeRoleId) => {
    soundFx.playUpgradePurchase();
    setHud((prev) => {
      const emp = prev.employees.find((e) => e.id === id);
      if (!emp || emp.hired || prev.coins < emp.hireCost) return prev;

      const nextEmployees = prev.employees.map((e) =>
        e.id === id ? { ...e, hired: true, assigned: true } : e
      );
      let completedTask = false;
      const nextTasks = prev.tasks.map((t) => {
        if (t.category === 'hire' && t.current < t.target) {
          const nextCurrent = t.current + 1;
          if (nextCurrent >= t.target) completedTask = true;
          return { ...t, current: nextCurrent };
        }
        return t;
      });
      if (completedTask) soundFx.playTaskCompleted();

      showToast(`Hired ${emp.name} (${emp.roleLabel})!`);
      return {
        ...prev,
        coins: roundCents(prev.coins - emp.hireCost),
        employees: nextEmployees,
        tasks: nextTasks,
      };
    });
  };

  const handleUpgradeEmployee = (id: EmployeeRoleId) => {
    soundFx.playUpgradePurchase();
    setHud((prev) => {
      const emp = prev.employees.find((e) => e.id === id);
      if (!emp || !emp.hired || emp.level >= emp.maxLevel) return prev;
      const cost = Math.round(emp.hireCost * 0.7 * emp.level);
      if (prev.coins < cost) return prev;

      showToast(`${emp.name} trained to Lv.${emp.level + 1}!`);
      return {
        ...prev,
        coins: roundCents(prev.coins - cost),
        employees: prev.employees.map((e) =>
          e.id === id ? { ...e, level: e.level + 1 } : e
        ),
      };
    });
  };

  const handleToggleEmployeeAssign = (id: EmployeeRoleId) => {
    soundFx.playTap();
    setHud((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === id ? { ...e, assigned: !e.assigned } : e
      ),
    }));
  };

  const handleBuyFuelSupply = (liters: number, costCoins: number) => {
    soundFx.playTankRefill();
    setHud((prev) => {
      if (prev.coins < costCoins) return prev;
      showToast(`Delivered +${liters} L Fuel!`);
      return {
        ...prev,
        coins: roundCents(prev.coins - costCoins),
        fuelLiters: Math.min(prev.maxFuelLiters, prev.fuelLiters + liters),
      };
    });
  };

  const handleBuyShopSupply = (units: number, costCoins: number) => {
    soundFx.playCashRegister();
    setHud((prev) => {
      if (prev.coins < costCoins) return prev;
      showToast(`Restocked +${units} Store Items!`);
      return {
        ...prev,
        coins: roundCents(prev.coins - costCoins),
        shopStock: Math.min(prev.maxShopStock, prev.shopStock + units),
      };
    });
  };

  const handleBuyWashSupply = (units: number, costCoins: number) => {
    soundFx.playWashRefill();
    setHud((prev) => {
      if (prev.coins < costCoins) return prev;
      showToast(`Refilled +${units} Wash Soap & Water!`);
      return {
        ...prev,
        coins: roundCents(prev.coins - costCoins),
        washSupplies: Math.min(prev.maxWashSupplies, prev.washSupplies + units),
      };
    });
  };

  const handleUnlockBusiness = (id: BusinessUnlockId) => {
    const def = UNLOCK_CATALOG.find((u) => u.id === id);
    if (!def) return;
    const cur = hudRef.current;
    const prereqMet = !def.prerequisite || cur.unlockedBusinesses.includes(def.prerequisite);
    if (
      cur.unlockedBusinesses.includes(id) ||
      cur.level < def.level ||
      !prereqMet ||
      cur.coins < def.cost
    ) {
      return;
    }

    soundFx.playUnlockPurchase();
    setHud((prev) => {
      if (prev.unlockedBusinesses.includes(id) || prev.coins < def.cost) return prev;
      const nextMaxShop = id === 'shop_deluxe' ? prev.maxShopStock + 20 : prev.maxShopStock;
      const nextShopStock =
        id === 'shop_deluxe' ? Math.min(nextMaxShop, prev.shopStock + 10) : prev.shopStock;
      const nextMaxFuel = id === 'rooms_wing' ? prev.maxFuelLiters + 400 : prev.maxFuelLiters;

      return {
        ...prev,
        coins: roundCents(prev.coins - def.cost),
        maxShopStock: nextMaxShop,
        shopStock: nextShopStock,
        maxFuelLiters: nextMaxFuel,
        unlockedBusinesses: [...prev.unlockedBusinesses, id],
      };
    });
    showToast(`Unlocked ${def.name}!`);
  };

  const handleResetSave = () => {
    soundFx.playTap();
    const fresh = clearGameSave();
    lastAwardedLevelRef.current = fresh.level;
    setHud({ ...fresh, diamonds: metaRef.current.gemWallet.balance });
    setLiveFuel(null);
    setLastShopSale(null);
    setActiveModal(null);
    gameRef.current?.setPaused(false);
    showToast('Started fresh career at Level 1!');
  };

  const handleJoystickChange = useCallback((vec: JoystickVector) => {
    gameRef.current?.setJoystick(vec);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 touch-none select-none">
      {/* Phaser 3 2.5D Isometric World */}
      <PhaserGame
        ref={gameRef}
        initialUnlocked={hud.unlockedBusinesses}
        initialEmployees={hud.employees}
        initialUpgrades={hud.upgrades}
        initialDayPhase={hud.dayPhase}
        initialWashSupplies={hud.washSupplies}
        initialRoomNeedsClean={hud.roomNeedsClean}
        initialShopStock={hud.shopStock}
        initialRatings={hud.ratings}
        initialPricing={hud.pricing}
        initialEquipped={meta.equipped}
        initialSensitivity={settings.cameraSensitivity}
        initialGraphicsQuality={settings.graphicsQuality}
        onPromptChange={handlePromptChange}
        onActionProgress={handleActionProgress}
        onServiceExecute={handleServiceExecute}
        onLiveFuelChange={handleLiveFuelChange}
        onCustomerFeedback={handleCustomerFeedback}
      />

      {/* Warm Cream Mobile Simulator Gameplay HUD */}
      {!isEditingHud && (
        <GameHUD
          hud={hud}
          settings={settings}
          hudLayout={hudLayout}
          playerOutfit={meta.equipped.playerOutfit}
          liveFuel={liveFuel}
          lastShopSale={lastShopSale}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenModal={handleOpenModal}
          onOpenGemStore={() => {
            soundFx.playTap();
            setStoreOpenInGame(true);
            gameRef.current?.setPaused(true);
            soundFx.setPaused(true);
          }}
          onTogglePause={handleTogglePause}
          onServiceAction={() => gameRef.current?.triggerService()}
          onJoystickChange={handleJoystickChange}
          onZoom={(d) => gameRef.current?.adjustZoom(d)}
        />
      )}

      {/* Gem Store Modal (Opened via Gems chip in HUD) */}
      {storeOpenInGame && (
        <GemStoreModal
          hud={hud}
          meta={meta}
          onClose={() => {
            soundFx.playTap();
            setStoreOpenInGame(false);
            if (!hud.isPaused && !activeModal && !isEditingHud) {
              gameRef.current?.setPaused(false);
              soundFx.setPaused(false);
            }
          }}
          onPurchaseItem={handlePurchaseStoreItem}
          onEquipItem={handleEquipStoreItem}
        />
      )}

      {/* Gameplay Modals & Pause Overlay */}
      <GameModals
        activeModal={activeModal}
        hud={hud}
        settings={settings}
        isFullscreen={isFullscreen}
        onClose={handleCloseModal}
        onClaimTask={handleClaimTask}
        onBuyUpgrade={handleBuyUpgrade}
        onHireEmployee={handleHireEmployee}
        onUpgradeEmployee={handleUpgradeEmployee}
        onToggleEmployeeAssign={handleToggleEmployeeAssign}
        onBuyFuelSupply={handleBuyFuelSupply}
        onBuyShopSupply={handleBuyShopSupply}
        onBuyWashSupply={handleBuyWashSupply}
        onUnlockBusiness={handleUnlockBusiness}
        onUpdateFuelPrice={handleUpdateFuelPrice}
        onUpdateShopProductPrice={handleUpdateShopProductPrice}
        onResetDefaultPrices={handleResetDefaultPrices}
        onUpdateSettings={(partial) => {
          if (partial.muteAll !== true && partial.soundEnabled !== false) {
            soundFx.playTap();
          }
          setSettings((s) => ({ ...s, ...partial }));
        }}
        onRestoreAudioDefaults={() => {
          setSettings((s) => ({
            ...s,
            soundEnabled: DEFAULT_GAME_SETTINGS.soundEnabled,
            musicEnabled: DEFAULT_GAME_SETTINGS.musicEnabled,
            ambientEnabled: DEFAULT_GAME_SETTINGS.ambientEnabled,
            muteAll: DEFAULT_GAME_SETTINGS.muteAll,
            masterVolume: DEFAULT_GAME_SETTINGS.masterVolume,
            sfxVolume: DEFAULT_GAME_SETTINGS.sfxVolume,
            musicVolume: DEFAULT_GAME_SETTINGS.musicVolume,
            ambientVolume: DEFAULT_GAME_SETTINGS.ambientVolume,
          }));
          soundFx.playTap();
          showToast('Default Audio Settings Restored!');
        }}
        onEnterHudEdit={() => {
          setActiveModal(null);
          setIsEditingHud(true);
          gameRef.current?.setPaused(true);
        }}
        onResetSave={handleResetSave}
        onToggleFullscreen={handleToggleFullscreen}
        onResumeGame={handleTogglePause}
      />

      {/* Dedicated HUD Edit Mode */}
      {isEditingHud && (
        <HudEditOverlay
          layout={hudLayout}
          onApply={(next) => {
            soundFx.playLevelUp();
            setHudLayout(next);
            saveCustomHud(next);
            setIsEditingHud(false);
            if (!hud.isPaused) gameRef.current?.setPaused(false);
            showToast('Custom HUD Saved!');
          }}
          onCancel={() => {
            soundFx.playTap();
            setIsEditingHud(false);
            if (!hud.isPaused) gameRef.current?.setPaused(false);
          }}
        />
      )}

      {/* Android Portrait Orientation Guard */}
      <OrientationGuard
        isPortrait={isPortrait}
        onFullscreenEntered={() => {
          setIsFullscreen(isFullscreenActive());
          setIsPortrait(isPortraitViewport());
        }}
      />
    </main>
  );
}
