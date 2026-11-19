import { useRef, useState } from 'react';
import { Check, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { DEFAULT_CUSTOM_HUD } from '../game/progression';
import { CustomHudLayout } from '../game/types';

interface HudEditOverlayProps {
  layout: CustomHudLayout;
  onApply: (next: CustomHudLayout) => void;
  onCancel: () => void;
}

type DragTarget = 'joystick' | 'actionButton' | 'zoomControls' | null;

export function HudEditOverlay({ layout, onApply, onCancel }: HudEditOverlayProps) {
  const [draft, setDraft] = useState<CustomHudLayout>(() =>
    JSON.parse(JSON.stringify(layout))
  );
  const [selected, setSelected] = useState<DragTarget>('joystick');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<DragTarget>(null);

  const handleDragMove = (clientX: number, clientY: number) => {
    const key = draggingRef.current;
    if (!key || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawXPct = ((clientX - rect.left) / rect.width) * 100;
    const rawYPct = ((clientY - rect.top) / rect.height) * 100;

    // Clamp inside safe playable boundaries so controls never clip off-screen or cover top bar
    const xPct = Math.min(91, Math.max(7, rawXPct));
    const yPct = Math.min(86, Math.max(22, rawYPct));

    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        xPct,
        yPct,
      },
    }));
  };

  const activeControl = selected ? draft[selected] : draft.joystick;

  return (
    <div
      ref={containerRef}
      onPointerMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onPointerUp={() => {
        draggingRef.current = null;
      }}
      onPointerCancel={() => {
        draggingRef.current = null;
      }}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] hud-safe-container flex flex-col justify-between select-none touch-none"
    >
      {/* Safe-Area Visible Edit Boundary */}
      <div className="absolute inset-4 top-16 bottom-4 border-2 border-dashed border-amber-300/70 rounded-3xl pointer-events-none" />

      {/* Top Edit Toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-[#FAF3E3] border-2 border-[#D6C4A3] rounded-2xl px-4 py-2.5 shadow-[0_4px_0_#B9A37E] text-[#2E221D]">
        <div>
          <h2 className="font-display font-extrabold text-sm leading-tight">
            HUD Edit Mode
          </h2>
          <p className="text-[11px] text-[#6B5A4E]">
            Drag controls anywhere inside the dashed safe boundary
          </p>
        </div>

        {/* Size & Opacity Sliders */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {selected && (
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">
                {selected === 'joystick'
                  ? 'Joystick Size'
                  : selected === 'actionButton'
                    ? 'Action Size'
                    : 'Zoom Size'}
              </span>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={activeControl.scale}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDraft((prev) => ({
                    ...prev,
                    [selected]: { ...prev[selected], scale: val },
                  }));
                }}
                className="w-24 accent-amber-500"
              />
            </label>
          )}

          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Opacity</span>
            <input
              type="range"
              min={0.55}
              max={1}
              step={0.05}
              value={draft.opacity}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
              }
              className="w-20 accent-amber-500"
            />
          </label>
        </div>

        {/* Reset / Cancel / Apply */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft(JSON.parse(JSON.stringify(DEFAULT_CUSTOM_HUD)))}
            className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] hover:bg-[#E5D7B7] border border-[#CBB692] text-[#2E221D] font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-3 rounded-xl bg-[#EFE5CE] hover:bg-[#E5D7B7] border border-[#CBB692] text-[#2E221D] font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="min-h-[40px] px-4 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] border border-[#15803D] text-white font-display font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_0_#15803D] whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>

      {/* Draggable Joystick Preview */}
      <div
        style={{
          left: `${draft.joystick.xPct}%`,
          top: `${draft.joystick.yPct}%`,
          transform: `translate(-50%, -50%) scale(${draft.joystick.scale})`,
          opacity: draft.opacity,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = 'joystick';
          setSelected('joystick');
        }}
        className={`absolute w-20 h-20 rounded-full bg-[#FAF3E3] border-2 flex items-center justify-center cursor-move touch-none shadow-xl ${
          selected === 'joystick' ? 'border-amber-500 ring-4 ring-amber-400/40' : 'border-[#CBB692]'
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-[#FFC815] border-2 border-[#B45309] flex items-center justify-center text-[9px] font-bold text-[#2E221D]">
          MOVE
        </div>
      </div>

      {/* Draggable Zoom Controls Preview */}
      <div
        style={{
          left: `${draft.zoomControls.xPct}%`,
          top: `${draft.zoomControls.yPct}%`,
          transform: `translate(-50%, -50%) scale(${draft.zoomControls.scale})`,
          opacity: draft.opacity,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = 'zoomControls';
          setSelected('zoomControls');
        }}
        className={`absolute flex flex-col gap-1 p-1 rounded-xl bg-[#FAF3E3] border-2 cursor-move touch-none shadow-xl ${
          selected === 'zoomControls'
            ? 'border-amber-500 ring-4 ring-amber-400/40'
            : 'border-[#CBB692]'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-[#FFFDF7] border border-[#D6C4A3] flex items-center justify-center text-[#2E221D]">
          <ZoomIn className="w-3.5 h-3.5" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#FFFDF7] border border-[#D6C4A3] flex items-center justify-center text-[#2E221D]">
          <ZoomOut className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Draggable Action Button Preview */}
      <div
        style={{
          left: `${draft.actionButton.xPct}%`,
          top: `${draft.actionButton.yPct}%`,
          transform: `translate(-50%, -50%) scale(${draft.actionButton.scale})`,
          opacity: draft.opacity,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = 'actionButton';
          setSelected('actionButton');
        }}
        className={`absolute px-3 py-2 rounded-xl bg-[#FFC815] border-2 text-[#2E221D] font-display font-extrabold text-[11px] cursor-move touch-none shadow-xl whitespace-nowrap ${
          selected === 'actionButton'
            ? 'border-white ring-4 ring-amber-400/60'
            : 'border-[#B45309]'
        }`}
      >
        ⛽ ACTION
      </div>
    </div>
  );
}
