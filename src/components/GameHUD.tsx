import {
  BarChart3,
  BedDouble,
  ClipboardList,
  Coins,
  Droplets,
  Fuel,
  Gem,
  Map,
  Maximize2,
  Minimize2,
  Moon,
  Package,
  Pause,
  Play,
  Plus,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Sunrise,
  Sunset,
  Trophy,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { UNLOCK_CATALOG } from '../game/progression';
import {
  CustomHudLayout,
  GameHUDState,
  GameSettings,
  JoystickVector,
  PlayerOutfitId,
} from '../game/types';
import { PlayerAvatarSvg } from './PlayerAvatarSvg';
import { VirtualJoystick } from './VirtualJoystick';

export type ModalType =
  | 'tasks'
  | 'staff'
  | 'upgrades'
  | 'shop'
  | 'roadmap'
  | 'settings'
  | 'stats'
  | null;

interface GameHUDProps {
  hud: GameHUDState;
  settings: GameSettings;
  hudLayout: CustomHudLayout;
  playerOutfit: PlayerOutfitId;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenModal: (modal: ModalType) => void;
  onOpenGemStore: () => void;
  onTogglePause: () => void;
  onServiceAction: () => void;
  onJoystickChange: (vec: JoystickVector) => void;
  onZoom: (delta: number) => void;
}

export function GameHUD({
  hud,
  settings,
  hudLayout,
  playerOutfit,
  isFullscreen,
  onToggleFullscreen,
  onOpenModal,
  onOpenGemStore,
  onTogglePause,
  onServiceAction,
  onJoystickChange,
  onZoom,
}: GameHUDProps) {
  const xpPct = Math.min(100, Math.round((hud.xp / hud.xpToNext) * 100));
  const unclaimedTasks = hud.tasks.filter((t) => t.current >= t.target && !t.claimed).length;
  const readyUnlocks = UNLOCK_CATALOG.filter(
    (u) =>
      !hud.unlockedBusinesses.includes(u.id) &&
      hud.level >= u.level &&
      (!u.prerequisite || hud.unlockedBusinesses.includes(u.prerequisite)) &&
      hud.coins >= u.cost
  ).length;
  const shopUnlocked = hud.unlockedBusinesses.includes('shop');

  const renderPromptIcon = () => {
    if (!hud.activePrompt) return null;
    switch (hud.activePrompt.category) {
      case 'fuel':
      case 'supply':
        return <Fuel className="w-4 h-4" />;
      case 'shop':
        return <Store className="w-4 h-4" />;
      case 'wash':
        return <Droplets className="w-4 h-4" />;
      case 'rooms':
        return <BedDouble className="w-4 h-4" />;
    }
  };

  const renderPhaseIcon = () => {
    switch (hud.dayPhase) {
      case 'Morning':
        return <Sunrise className="w-3 h-3 text-amber-600" />;
      case 'Afternoon':
        return <Sun className="w-3 h-3 text-amber-500" />;
      case 'Evening':
        return <Sunset className="w-3 h-3 text-orange-600" />;
      case 'Night':
        return <Moon className="w-3 h-3 text-indigo-600" />;
    }
  };

  const creamPill =
    'bg-[#FAF3E3]/95 border border-[#D6C4A3] shadow-[0_2px_0_#B9A37E] text-[#2E221D]';
  const creamBtn =
    'bg-[#FAF3E3]/95 hover:bg-[#FFFDF7] active:translate-y-[1px] active:shadow-[0_1px_0_#B9A37E] border border-[#D6C4A3] shadow-[0_2px_0_#B9A37E] text-[#2E221D] transition-all';

  return (
    <div
      style={{
        paddingTop: 'max(6px, var(--safe-top))',
        paddingRight: 'max(10px, var(--safe-right))',
        paddingBottom: 'max(8px, var(--safe-bottom))',
        paddingLeft: 'max(10px, var(--safe-left))',
      }}
      className="fixed inset-0 z-20 pointer-events-none"
    >
      {/* SINGLE COMPACT TOP HUD STRIP */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        {/* Top-Left: Compact Player Profile & Level */}
        <div
          className={`pointer-events-auto flex items-center gap-2 rounded-xl px-1.5 py-1 pr-2.5 shrink-0 ${creamPill}`}
        >
          <div className="w-7 h-7 rounded-full border border-[#F59E0B] overflow-hidden shrink-0 bg-[#EFE5CE]">
            <PlayerAvatarSvg outfit={playerOutfit} />
          </div>
          <div className="min-w-[78px]">
            <div className="flex items-center justify-between gap-1.5 leading-none">
              <span className="font-display font-extrabold text-[11px] text-[#2E221D] whitespace-nowrap">
                {hud.playerName}
              </span>
              <span className="text-[10px] font-bold text-[#B45309] font-mono-nums whitespace-nowrap">
                Lv.{hud.level}
              </span>
            </div>
            <div className="mt-1 w-20 h-1.5 bg-[#E6D7BC] rounded-full overflow-hidden border border-[#CDBB99]">
              <div
                className="h-full bg-[#22C55E] rounded-full transition-all duration-200"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <div className="mt-0.5 text-[8.5px] leading-none font-mono-nums font-bold text-[#6B5A4E] whitespace-nowrap">
              {hud.xp.toLocaleString()}/{hud.xpToNext.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Top-Center: Compact Money, Fuel, Shop Stock, Gems, Day & Time */}
        <div className="pointer-events-auto flex items-center justify-center gap-1 flex-wrap">
          <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${creamPill}`}>
            <Coins className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span className="font-mono-nums font-extrabold text-[11px] whitespace-nowrap">
              ${hud.coins.toLocaleString()}
            </span>
          </div>

          <div className={`flex items-center gap-1 rounded-lg pl-2 pr-0.5 py-0.5 ${creamPill}`}>
            <Fuel className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            <span className="font-mono-nums font-bold text-[11px] whitespace-nowrap">
              {hud.fuelLiters}/{hud.maxFuelLiters}L
            </span>
            <button
              type="button"
              onClick={() => onOpenModal('shop')}
              aria-label="Order Fuel Supply"
              className="w-5 h-5 rounded-md bg-[#FFC815] hover:bg-[#FACC15] active:scale-95 text-[#2E221D] flex items-center justify-center border border-[#D99B00]"
            >
              <Plus className="w-3 h-3 stroke-[2.8]" />
            </button>
          </div>

          {shopUnlocked && (
            <div className={`flex items-center gap-1 rounded-lg pl-2 pr-0.5 py-0.5 ${creamPill}`}>
              <Package className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="font-mono-nums font-bold text-[11px] whitespace-nowrap">
                {hud.shopStock}/{hud.maxShopStock}
              </span>
              <button
                type="button"
                onClick={() => onOpenModal('shop')}
                aria-label="Restock Shop"
                className="w-5 h-5 rounded-md bg-[#FFC815] hover:bg-[#FACC15] active:scale-95 text-[#2E221D] flex items-center justify-center border border-[#D99B00]"
              >
                <Plus className="w-3 h-3 stroke-[2.8]" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenGemStore}
            title="Open ZAIDI Gem Store"
            className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 ${creamBtn}`}
          >
            <Gem className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
            <span className="font-mono-nums font-bold text-[11px] whitespace-nowrap">
              {hud.diamonds}
            </span>
          </button>

          <div className={`hidden md:flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold whitespace-nowrap ${creamPill}`}>
            {renderPhaseIcon()}
            <span>D{hud.day}</span>
            <span aria-hidden="true" className="text-[#A6906A]">·</span>
            <span className="font-mono-nums">{hud.timeFormatted}</span>
          </div>
        </div>

        {/* Top-Right: Compact Fullscreen, Trophy, Settings, Pause */}
        <div className="pointer-events-auto flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Landscape'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('stats')}
            aria-label="Station Stats"
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#D97706]" />
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('settings')}
            aria-label="Settings"
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label={hud.isPaused ? 'Resume Game' : 'Pause Game'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
          >
            {hud.isPaused ? <Play className="w-3.5 h-3.5 fill-[#2E221D]" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* TOAST BANNER (Compact top strip, clear of gameplay center) */}
      {hud.toastMessage && (
        <div className="mt-1.5 flex justify-center pointer-events-none">
          <div className="px-3 py-1 rounded-lg bg-[#FFC815] border border-[#B45309] text-[#2E221D] font-display font-bold text-[11px] shadow">
            {hud.toastMessage}
          </div>
        </div>
      )}

      {/* RIGHT SIDE RAIL: Compact Equally Spaced Menu Buttons */}
      <div
        style={{ right: 'max(8px, var(--safe-right))' }}
        className="pointer-events-auto fixed top-1/2 -translate-y-1/2 flex flex-col gap-1.5 items-end"
      >
        {[
          {
            id: 'tasks' as ModalType,
            label: 'Tasks',
            icon: <ClipboardList className="w-3.5 h-3.5 text-[#D97706] shrink-0" />,
            badge: unclaimedTasks > 0 ? unclaimedTasks : undefined,
          },
          {
            id: 'staff' as ModalType,
            label: 'Staff',
            icon: <Users className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />,
          },
          {
            id: 'upgrades' as ModalType,
            label: 'Upgrades',
            icon: <BarChart3 className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />,
          },
          {
            id: 'roadmap' as ModalType,
            label: 'Unlocks',
            icon: <Map className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />,
            badge: readyUnlocks > 0 ? readyUnlocks : undefined,
          },
          {
            id: 'shop' as ModalType,
            label: 'Supply',
            icon: <ShoppingCart className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />,
          },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => onOpenModal(btn.id)}
            className={`h-8 min-w-[90px] px-2.5 rounded-lg font-display font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap ${creamBtn}`}
          >
            {btn.icon}
            <span>{btn.label}</span>
            {btn.badge !== undefined && (
              <span className="ml-auto px-1 rounded bg-[#22C55E] text-white text-[9px] font-mono-nums font-extrabold">
                {btn.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CUSTOMIZABLE BOTTOM-LEFT JOYSTICK & ZOOM */}
      {settings.showVirtualJoystick && (
        <div
          style={{
            left: `${hudLayout.joystick.xPct}%`,
            top: `${hudLayout.joystick.yPct}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="pointer-events-auto fixed"
        >
          <VirtualJoystick
            onChange={onJoystickChange}
            scale={hudLayout.joystick.scale}
            opacity={hudLayout.opacity}
          />
        </div>
      )}

      <div
        style={{
          left: `${hudLayout.zoomControls.xPct}%`,
          top: `${hudLayout.zoomControls.yPct}%`,
          transform: `translate(-50%, -50%) scale(${hudLayout.zoomControls.scale})`,
          opacity: hudLayout.opacity,
        }}
        className="pointer-events-auto fixed flex flex-col gap-1"
      >
        <button
          type="button"
          onClick={() => onZoom(0.14)}
          aria-label="Zoom In"
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onZoom(-0.14)}
          aria-label="Zoom Out"
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${creamBtn}`}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* COMPACT SIDE INTERACTION BUTTON (Only visible when standing near an unlocked actionable station) */}
      {hud.activePrompt && hud.activePrompt.ready && (
        <div
          style={{
            left: `${hudLayout.actionButton.xPct}%`,
            top: `${hudLayout.actionButton.yPct}%`,
            transform: `translate(-50%, -50%) scale(${hudLayout.actionButton.scale})`,
            opacity: hudLayout.opacity,
          }}
          className="pointer-events-auto fixed"
        >
          <button
            type="button"
            onClick={onServiceAction}
            className="h-11 px-3 rounded-xl border border-[#B45309] bg-[#FFC815] hover:bg-[#FACC15] active:translate-y-[1px] shadow-[0_3px_0_#B45309] text-[#2E221D] font-display font-extrabold text-[11px] flex items-center gap-2 whitespace-nowrap transition-all"
          >
            <span className="w-6 h-6 rounded-lg bg-white/65 flex items-center justify-center shrink-0">
              {renderPromptIcon()}
            </span>
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[9px] font-bold opacity-80">
                {hud.activePrompt.title}
              </span>
              <span className="text-[11px] font-extrabold">
                {hud.actionProgress !== null
                  ? `${
                      hud.activePrompt.category === 'fuel'
                        ? 'Fueling'
                        : hud.activePrompt.category === 'wash'
                          ? 'Washing'
                          : hud.activePrompt.category === 'rooms'
                            ? 'Servicing'
                            : 'Working'
                    } ${Math.round(hud.actionProgress * 100)}%`
                  : hud.activePrompt.actionLabel}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
