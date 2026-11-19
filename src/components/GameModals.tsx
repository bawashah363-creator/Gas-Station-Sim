import {
  CheckCircle2,
  Coins,
  Droplets,
  Fuel,
  Gem,
  Lock,
  Maximize2,
  Music,
  Package,
  Play,
  RotateCcw,
  Sliders,
  Trash2,
  Trees,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { UNLOCK_CATALOG } from '../game/progression';
import {
  BusinessUnlockId,
  EmployeeRoleId,
  GameHUDState,
  GameSettings,
  UpgradeState,
} from '../game/types';
import { ModalType } from './GameHUD';

interface GameModalsProps {
  activeModal: ModalType;
  hud: GameHUDState;
  settings: GameSettings;
  isFullscreen: boolean;
  onClose: () => void;
  onClaimTask: (taskId: string) => void;
  onBuyUpgrade: (key: keyof UpgradeState, cost: number) => void;
  onHireEmployee: (id: EmployeeRoleId) => void;
  onUpgradeEmployee: (id: EmployeeRoleId) => void;
  onToggleEmployeeAssign: (id: EmployeeRoleId) => void;
  onBuyFuelSupply: (liters: number, costCoins: number) => void;
  onBuyShopSupply: (units: number, costCoins: number) => void;
  onBuyWashSupply: (units: number, costCoins: number) => void;
  onUnlockBusiness: (id: BusinessUnlockId) => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onRestoreAudioDefaults: () => void;
  onEnterHudEdit: () => void;
  onResetSave: () => void;
  onToggleFullscreen: () => void;
  onResumeGame: () => void;
}

export function GameModals({
  activeModal,
  hud,
  settings,
  isFullscreen,
  onClose,
  onClaimTask,
  onBuyUpgrade,
  onHireEmployee,
  onUpgradeEmployee,
  onToggleEmployeeAssign,
  onBuyFuelSupply,
  onBuyShopSupply,
  onBuyWashSupply,
  onUnlockBusiness,
  onUpdateSettings,
  onRestoreAudioDefaults,
  onEnterHudEdit,
  onResetSave,
  onToggleFullscreen,
  onResumeGame,
}: GameModalsProps) {
  if (!activeModal && !hud.isPaused) return null;

  if (hud.isPaused && !activeModal) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#FAF3E3] border-2 border-[#D6C4A3] rounded-3xl p-6 shadow-2xl text-center text-[#2E221D]">
          <h2 className="font-display text-2xl font-extrabold mb-1">Shift Paused</h2>
          <p className="text-[#6B5A4E] text-sm mb-6 font-semibold">
            Day {hud.day} · {hud.timeFormatted} ({hud.dayPhase})
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onResumeGame}
              className="min-h-[48px] w-full rounded-xl bg-[#FFC815] hover:bg-[#FACC15] border-2 border-[#B45309] shadow-[0_3px_0_#B45309] text-[#2E221D] font-display font-extrabold text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-[#2E221D]" />
              Resume Shift
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="min-h-[46px] w-full rounded-xl bg-[#FFFDF7] hover:bg-[#F5EBD4] border-2 border-[#D6C4A3] text-[#2E221D] font-bold text-sm flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Landscape'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titleMap: Record<Exclude<ModalType, null>, string> = {
    tasks: 'Daily Missions & Objectives',
    staff: 'Employee Management',
    upgrades: 'Station Upgrades',
    shop: 'Fuel & Shop Inventory',
    roadmap: 'Business Unlock Roadmap',
    settings: 'Settings & Controls',
    stats: 'Business Overview',
  };

  const upgradeItems: Array<{
    key: keyof UpgradeState;
    name: string;
    desc: string;
    baseCost: number;
    unlocked: boolean;
    reqLabel?: string;
  }> = [
    {
      key: 'pumpSpeedLevel',
      name: 'High-Flow Fuel Nozzles',
      desc: 'Refuels faster and boosts fuel service payouts by +20% per level.',
      baseCost: 220,
      unlocked: true,
    },
    {
      key: 'tankCapacityLevel',
      name: 'Fuel Storage Capacity',
      desc: 'Expands main underground tank capacity by +400 L.',
      baseCost: 280,
      unlocked: true,
    },
    {
      key: 'shopStockLevel',
      name: 'Store Shelves & Coolers',
      desc: 'Expands shop capacity (+15 stock) and boosts checkout profits.',
      baseCost: 420,
      unlocked: hud.unlockedBusinesses.includes('shop'),
      reqLabel: 'Unlocks Lv.3',
    },
    {
      key: 'carWashLevel',
      name: 'Turbo Wash Rollers',
      desc: 'Speeds up wash cycle and increases wash revenue.',
      baseCost: 560,
      unlocked: hud.unlockedBusinesses.includes('car_wash'),
      reqLabel: 'Unlock Car Wash',
    },
    {
      key: 'roomsLevel',
      name: 'Deluxe Room Furnishings',
      desc: 'Increases overnight room rental income by +30% per level.',
      baseCost: 750,
      unlocked: hud.unlockedBusinesses.includes('rooms'),
      reqLabel: 'Unlock Rooms',
    },
  ];

  const totalDailySalary = hud.employees
    .filter((e) => e.hired && e.assigned)
    .reduce((sum, e) => sum + e.salaryPerDay, 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] bg-[#FAF3E3] border-2 border-[#D6C4A3] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#2E221D]"
      >
        {/* Cream Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F3E7CD] border-b-2 border-[#D6C4A3]">
          <h2 className="font-display text-lg font-extrabold">
            {activeModal ? titleMap[activeModal] : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#FFFDF7] hover:bg-[#EFE5CE] border border-[#CBB692] text-[#2E221D] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-3">
          {activeModal === 'tasks' &&
            hud.tasks.map((task) => {
              const complete = task.current >= task.target;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1] shadow-sm"
                >
                  <div>
                    <div className="font-display font-bold text-sm">{task.title}</div>
                    <div className="text-xs text-[#6B5A4E] mt-1 flex flex-wrap items-center gap-2 font-mono-nums font-semibold">
                      <span>
                        {Math.min(task.current, task.target)} / {task.target}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#B45309]">+${task.rewardCoins}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#15803D]">+{task.rewardXp} XP</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#0369A1]">+{task.rewardDiamonds} Gems</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!complete || task.claimed}
                    onClick={() => onClaimTask(task.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs whitespace-nowrap border ${
                      task.claimed
                        ? 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                        : complete
                          ? 'bg-[#22C55E] hover:bg-[#16A34A] border-[#15803D] text-white shadow-[0_2px_0_#15803D]'
                          : 'bg-[#F5EBD4] border-[#DFCFB1] text-[#8C7A6B]'
                    }`}
                  >
                    {task.claimed ? 'Claimed' : complete ? 'Claim' : 'In Progress'}
                  </button>
                </div>
              );
            })}

          {activeModal === 'staff' && (
            <>
              <div className="flex items-center justify-between bg-[#F3E7CD] rounded-2xl px-4 py-2.5 text-xs font-bold border border-[#D6C4A3]">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2563EB]" />
                  Active Payroll: {hud.employees.filter((e) => e.hired && e.assigned).length} Staff
                </span>
                <span className="font-mono-nums text-[#B45309]">
                  Daily Salary: ${totalDailySalary}/day
                </span>
              </div>
              {hud.employees.map((emp) => {
                const isUnlocked =
                  hud.level >= emp.unlockLevel &&
                  hud.unlockedBusinesses.includes(emp.requiredBusiness);
                const upgradeCost = Math.round(emp.hireCost * 0.7 * emp.level);

                return (
                  <div
                    key={emp.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]"
                  >
                    <div>
                      <div className="font-display font-bold text-sm flex items-center gap-2">
                        <span>{emp.roleLabel}</span>
                        {emp.hired && (
                          <span className="text-xs font-mono-nums text-[#B45309]">
                            · {emp.name} (Lv.{emp.level})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B5A4E] mt-1 font-mono-nums">
                        {isUnlocked ? (
                          <span>
                            Salary: ${emp.salaryPerDay}/day · Speed +{emp.level * 20}%
                          </span>
                        ) : (
                          <span className="text-[#DC2626] font-semibold">
                            Requires Level {emp.unlockLevel}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isUnlocked ? (
                      <span className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] border border-[#D6C4A3] text-[#6B5A4E] text-xs font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Lv.{emp.unlockLevel}
                      </span>
                    ) : !emp.hired ? (
                      <button
                        type="button"
                        disabled={hud.coins < emp.hireCost}
                        onClick={() => onHireEmployee(emp.id)}
                        className={`min-h-[44px] px-4 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 whitespace-nowrap border ${
                          hud.coins >= emp.hireCost
                            ? 'bg-[#FFC815] hover:bg-[#FACC15] border-[#B45309] text-[#2E221D] shadow-[0_2px_0_#B45309]'
                            : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                        }`}
                      >
                        Hire · ${emp.hireCost}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleEmployeeAssign(emp.id)}
                          className={`min-h-[40px] px-3 rounded-xl font-bold text-xs border ${
                            emp.assigned
                              ? 'bg-[#22C55E] border-[#15803D] text-white'
                              : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#6B5A4E]'
                          }`}
                        >
                          {emp.assigned ? 'Working' : 'Resting'}
                        </button>
                        {emp.level < emp.maxLevel && (
                          <button
                            type="button"
                            disabled={hud.coins < upgradeCost}
                            onClick={() => onUpgradeEmployee(emp.id)}
                            className={`min-h-[40px] px-3 rounded-xl font-bold text-xs border whitespace-nowrap ${
                              hud.coins >= upgradeCost
                                ? 'bg-[#FFC815] border-[#B45309] text-[#2E221D]'
                                : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                            }`}
                          >
                            Train ${upgradeCost}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeModal === 'upgrades' &&
            upgradeItems.map((item) => {
              const level = hud.upgrades[item.key];
              const cost = Math.round(item.baseCost * Math.pow(1.45, level - 1));
              const canAfford = item.unlocked && hud.coins >= cost;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]"
                >
                  <div>
                    <div className="font-display font-bold text-sm">
                      {item.name} · <span className="text-[#B45309]">Lv.{level}</span>
                    </div>
                    <p className="text-xs text-[#6B5A4E] mt-1">{item.desc}</p>
                  </div>
                  {!item.unlocked ? (
                    <span className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] text-[#6B5A4E] text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                      <Lock className="w-3.5 h-3.5" />
                      {item.reqLabel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyUpgrade(item.key, cost)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 whitespace-nowrap border ${
                        canAfford
                          ? 'bg-[#FFC815] hover:bg-[#FACC15] border-[#B45309] text-[#2E221D] shadow-[0_2px_0_#B45309]'
                          : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span className="font-mono-nums">${cost.toLocaleString()}</span>
                    </button>
                  )}
                </div>
              );
            })}

          {activeModal === 'shop' && (
            <div className="space-y-3">
              {[
                { liters: 250, cost: 110, label: 'Emergency Fuel Drum (+250 L)' },
                { liters: 600, cost: 240, label: 'Standard Fuel Delivery (+600 L)' },
                { liters: 1500, cost: 560, label: 'Full Tanker Refill (+1,500 L)' },
              ].map((pack) => {
                const canAfford = hud.coins >= pack.cost;
                return (
                  <div
                    key={pack.liters}
                    className="flex items-center justify-between gap-4 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-[#DC2626] flex items-center justify-center">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm">{pack.label}</div>
                        <div className="text-xs text-[#6B5A4E] font-mono-nums">
                          Tank: {hud.fuelLiters} / {hud.maxFuelLiters} L
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyFuelSupply(pack.liters, pack.cost)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 whitespace-nowrap border ${
                        canAfford
                          ? 'bg-[#22C55E] hover:bg-[#16A34A] border-[#15803D] text-white'
                          : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                      }`}
                    >
                      <span className="font-mono-nums">${pack.cost}</span>
                    </button>
                  </div>
                );
              })}

              {hud.unlockedBusinesses.includes('shop') && (
                <div className="flex items-center justify-between gap-4 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm">
                        Convenience Shop Crate (+15 Stock)
                      </div>
                      <div className="text-xs text-[#6B5A4E] font-mono-nums">
                        Stock: {hud.shopStock} / {hud.maxShopStock} units
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={hud.coins < 150}
                    onClick={() => onBuyShopSupply(15, 150)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs whitespace-nowrap border ${
                      hud.coins >= 150
                        ? 'bg-[#FFC815] hover:bg-[#FACC15] border-[#B45309] text-[#2E221D]'
                        : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                    }`}
                  >
                    $150
                  </button>
                </div>
              )}

              {hud.unlockedBusinesses.includes('car_wash') && (
                <div className="flex items-center justify-between gap-4 bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 text-[#0284C7] flex items-center justify-center">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm">
                        Car Wash Foam & Water Pack (+50%)
                      </div>
                      <div className="text-xs text-[#6B5A4E] font-mono-nums">
                        Wash Tank: {hud.washSupplies} / {hud.maxWashSupplies}%
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={hud.coins < 45}
                    onClick={() => onBuyWashSupply(50, 45)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs whitespace-nowrap border ${
                      hud.coins >= 45
                        ? 'bg-[#0EA5E9] hover:bg-[#0284C7] border-[#0369A1] text-white'
                        : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                    }`}
                  >
                    $45
                  </button>
                </div>
              )}
            </div>
          )}

          {activeModal === 'roadmap' && (
            <div className="space-y-3">
              <div className="bg-[#F3E7CD] rounded-2xl p-3.5 border border-[#D6C4A3]">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span>
                    Station Expansion Progress · Lv.{hud.level}
                  </span>
                  <span className="font-mono-nums text-[#B45309]">
                    {hud.unlockedBusinesses.length} / {UNLOCK_CATALOG.length} Unlocked
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#E6D7BC] rounded-full overflow-hidden border border-[#CDBB99]">
                  <div
                    className="h-full bg-[#22C55E] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (hud.unlockedBusinesses.length / UNLOCK_CATALOG.length) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {UNLOCK_CATALOG.map((item) => {
                const isUnlocked = hud.unlockedBusinesses.includes(item.id);
                const levelMet = hud.level >= item.level;
                const prereqDef = item.prerequisite
                  ? UNLOCK_CATALOG.find((p) => p.id === item.prerequisite)
                  : null;
                const prereqMet =
                  !item.prerequisite || hud.unlockedBusinesses.includes(item.prerequisite);
                const canBuy = !isUnlocked && levelMet && prereqMet && hud.coins >= item.cost;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-4 rounded-2xl p-4 border ${
                      isUnlocked
                        ? 'bg-[#FFFDF7] border-[#22C55E]'
                        : levelMet && prereqMet
                          ? 'bg-[#FFFDF7] border-[#F59E0B] shadow-sm'
                          : 'bg-[#F5EBD4]/80 border-[#DFCFB1]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-display font-extrabold text-sm flex flex-wrap items-center gap-2">
                        <span>{item.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#EFE5CE] text-[#6B5A4E] text-[10px] font-mono-nums">
                          Lv.{item.level}
                        </span>
                        {isUnlocked && <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />}
                      </div>
                      <p className="text-xs text-[#6B5A4E] mt-1">{item.summary}</p>
                      {!isUnlocked && prereqDef && !prereqMet && (
                        <p className="text-[11px] font-semibold text-[#B45309] mt-1">
                          Requires: {prereqDef.name}
                        </p>
                      )}
                    </div>

                    {isUnlocked ? (
                      <span className="min-h-[40px] px-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        ✓ Unlocked
                      </span>
                    ) : !levelMet ? (
                      <span className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] border border-[#D6C4A3] text-[#6B5A4E] text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        <Lock className="w-3.5 h-3.5" />
                        Need Lv.{item.level}
                      </span>
                    ) : !prereqMet ? (
                      <span className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] border border-[#D6C4A3] text-[#6B5A4E] text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => onUnlockBusiness(item.id)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-extrabold text-xs flex items-center gap-1.5 whitespace-nowrap border ${
                          canBuy
                            ? 'bg-[#FFC815] hover:bg-[#FACC15] border-[#B45309] text-[#2E221D] shadow-[0_2px_0_#B45309]'
                            : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#8C7A6B]'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span className="font-mono-nums">
                          {item.cost === 0 ? 'Free' : `Unlock $${item.cost.toLocaleString()}`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'settings' && (
            <div className="space-y-3">
              {/* Dedicated Cream Audio Settings Section */}
              <div className="bg-[#FFFDF7] rounded-2xl p-4 border-2 border-[#DFCFB1] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EFE5CE]">
                  <div className="flex items-center gap-2">
                    {settings.muteAll ? (
                      <VolumeX className="w-5 h-5 text-[#DC2626]" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-[#16A34A]" />
                    )}
                    <div>
                      <div className="font-display font-extrabold text-sm">Audio Settings</div>
                      <div className="text-[11px] text-[#6B5A4E]">
                        Master, SFX, Music & Ambient mixer
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ muteAll: !settings.muteAll })}
                      className={`min-h-[38px] px-3 rounded-xl font-bold text-xs border transition-colors ${
                        settings.muteAll
                          ? 'bg-[#EF4444] border-[#B91C1C] text-white'
                          : 'bg-[#22C55E] border-[#15803D] text-white'
                      }`}
                    >
                      {settings.muteAll ? 'All Muted' : 'Audio Active'}
                    </button>
                    <button
                      type="button"
                      onClick={onRestoreAudioDefaults}
                      aria-label="Restore Default Audio"
                      title="Restore Default Audio"
                      className="min-h-[38px] px-2.5 rounded-xl bg-[#F5EBD4] hover:bg-[#EFE5CE] border border-[#D6C4A3] text-[#2E221D] text-xs font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Master Volume */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#D97706]" />
                      Master Volume
                    </span>
                    <span className="font-mono-nums text-[#B45309]">
                      {settings.muteAll ? 'Muted' : `${Math.round(settings.masterVolume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.masterVolume * 100)}
                    onChange={(e) =>
                      onUpdateSettings({
                        masterVolume: Number(e.target.value) / 100,
                        muteAll: false,
                      })
                    }
                    className="w-full h-2.5 rounded-full bg-[#EFE5CE] accent-[#F59E0B] cursor-pointer"
                  />
                </div>

                {/* Sound Effects */}
                <div className="space-y-1.5 pt-1 border-t border-[#F3E7CD]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Coins className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Sound Effects</span>
                      <span className="font-mono-nums text-[#6B5A4E]">
                        ({Math.round(settings.sfxVolume * 100)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                      className={`min-h-[32px] px-3 rounded-lg font-bold text-[11px] border ${
                        settings.soundEnabled
                          ? 'bg-[#22C55E] border-[#15803D] text-white'
                          : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#6B5A4E]'
                      }`}
                    >
                      {settings.soundEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    disabled={!settings.soundEnabled}
                    value={Math.round(settings.sfxVolume * 100)}
                    onChange={(e) =>
                      onUpdateSettings({ sfxVolume: Number(e.target.value) / 100 })
                    }
                    className="w-full h-2 rounded-full bg-[#EFE5CE] accent-[#22C55E] cursor-pointer disabled:opacity-45"
                  />
                </div>

                {/* Background Music */}
                <div className="space-y-1.5 pt-1 border-t border-[#F3E7CD]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Music className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Background Music</span>
                      <span className="font-mono-nums text-[#6B5A4E]">
                        ({Math.round(settings.musicVolume * 100)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
                      className={`min-h-[32px] px-3 rounded-lg font-bold text-[11px] border ${
                        settings.musicEnabled
                          ? 'bg-[#22C55E] border-[#15803D] text-white'
                          : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#6B5A4E]'
                      }`}
                    >
                      {settings.musicEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    disabled={!settings.musicEnabled}
                    value={Math.round(settings.musicVolume * 100)}
                    onChange={(e) =>
                      onUpdateSettings({ musicVolume: Number(e.target.value) / 100 })
                    }
                    className="w-full h-2 rounded-full bg-[#EFE5CE] accent-[#2563EB] cursor-pointer disabled:opacity-45"
                  />
                </div>

                {/* Environment / Ambient Volume */}
                <div className="space-y-1.5 pt-1 border-t border-[#F3E7CD]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Trees className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Environment & Crowd</span>
                      <span className="font-mono-nums text-[#6B5A4E]">
                        ({Math.round(settings.ambientVolume * 100)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ambientEnabled: !settings.ambientEnabled })}
                      className={`min-h-[32px] px-3 rounded-lg font-bold text-[11px] border ${
                        settings.ambientEnabled
                          ? 'bg-[#22C55E] border-[#15803D] text-white'
                          : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#6B5A4E]'
                      }`}
                    >
                      {settings.ambientEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    disabled={!settings.ambientEnabled}
                    value={Math.round(settings.ambientVolume * 100)}
                    onChange={(e) =>
                      onUpdateSettings({ ambientVolume: Number(e.target.value) / 100 })
                    }
                    className="w-full h-2 rounded-full bg-[#EFE5CE] accent-[#059669] cursor-pointer disabled:opacity-45"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]">
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-[#D97706]" />
                  <div>
                    <div className="font-display font-bold text-sm">Custom HUD Layout</div>
                    <div className="text-xs text-[#6B5A4E]">
                      Drag, resize & adjust joystick and button transparency
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onEnterHudEdit}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FFC815] hover:bg-[#FACC15] border border-[#B45309] text-[#2E221D] font-display font-bold text-xs whitespace-nowrap"
                >
                  Edit HUD
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]">
                <div>
                  <div className="font-display font-bold text-sm">Virtual Joystick</div>
                  <div className="text-xs text-[#6B5A4E]">Show on-screen movement stick</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ showVirtualJoystick: !settings.showVirtualJoystick })
                  }
                  className={`min-h-[44px] px-4 rounded-xl font-bold text-xs border ${
                    settings.showVirtualJoystick
                      ? 'bg-[#22C55E] border-[#15803D] text-white'
                      : 'bg-[#EFE5CE] border-[#D6C4A3] text-[#6B5A4E]'
                  }`}
                >
                  {settings.showVirtualJoystick ? 'Shown' : 'Hidden'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-[#DC2626]" />
                  <div>
                    <div className="font-display font-bold text-sm">Reset Career Progress</div>
                    <div className="text-xs text-[#6B5A4E]">Start fresh from Level 1 ($250)</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onResetSave}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FEE2E2] hover:bg-[#FECACA] border border-[#EF4444] text-[#991B1B] font-bold text-xs whitespace-nowrap"
                >
                  Reset Save
                </button>
              </div>
            </div>
          )}

          {activeModal === 'stats' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Vehicles Refueled', value: hud.stats.carsFueled, color: 'text-[#DC2626]' },
                { label: 'Shop Sales', value: hud.stats.shopSales, color: 'text-[#2563EB]' },
                { label: 'Cars Washed', value: hud.stats.carsWashed, color: 'text-[#0284C7]' },
                { label: 'Rooms Rented', value: hud.stats.roomsRented, color: 'text-[#7C3AED]' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#FFFDF7] rounded-2xl p-4 border border-[#DFCFB1]"
                >
                  <div className="text-xs text-[#6B5A4E] font-semibold">{stat.label}</div>
                  <div className={`font-display font-extrabold text-2xl mt-1 font-mono-nums ${stat.color}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
              <div className="col-span-2 bg-[#F3E7CD] rounded-2xl p-4 flex items-center justify-between border border-[#D6C4A3]">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Coins className="w-4 h-4 text-[#D97706]" />
                  <span>Total Revenue Earned</span>
                </div>
                <div className="flex items-center gap-2 font-mono-nums font-extrabold text-sm">
                  <span>${hud.stats.totalEarned.toLocaleString()}</span>
                  <span aria-hidden="true">·</span>
                  <Gem className="w-4 h-4 text-[#0284C7]" />
                  <span>{hud.diamonds}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
