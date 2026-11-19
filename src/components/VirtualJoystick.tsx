import { useRef, useState } from 'react';
import { JoystickVector } from '../game/types';

interface VirtualJoystickProps {
  onChange: (vec: JoystickVector) => void;
  scale?: number;
  opacity?: number;
}

export function VirtualJoystick({
  onChange,
  scale = 0.9,
  opacity = 0.94,
}: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const maxRadius = 28 * scale;

  const updateStick = (clientX: number, clientY: number, active: boolean) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnob({ x: dx, y: dy, active });
    onChange({
      x: dx / maxRadius,
      y: dy / maxRadius,
      active,
    });
  };

  const resetStick = () => {
    activePointerIdRef.current = null;
    setKnob({ x: 0, y: 0, active: false });
    onChange({ x: 0, y: 0, active: false });
  };

  return (
    <div
      ref={baseRef}
      style={{
        transform: `scale(${scale})`,
        opacity,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (activePointerIdRef.current !== null) return;
        activePointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        updateStick(e.clientX, e.clientY, true);
      }}
      onPointerMove={(e) => {
        if (activePointerIdRef.current !== e.pointerId || !knob.active) return;
        e.stopPropagation();
        updateStick(e.clientX, e.clientY, true);
      }}
      onPointerUp={(e) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        e.stopPropagation();
        resetStick();
      }}
      onPointerCancel={(e) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        resetStick();
      }}
      aria-label="Movement thumbstick"
      className="relative w-20 h-20 rounded-full bg-[#FAF3E3]/92 border-[1.5px] border-[#CBB692] shadow-[0_3px_0_#A6906A] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing origin-center"
    >
      <div className="absolute inset-2.5 rounded-full border border-[#D8C7AA] pointer-events-none" />
      <div
        style={{
          transform: `translate3d(${knob.x / scale}px, ${knob.y / scale}px, 0)`,
        }}
        className={`w-9 h-9 rounded-full shadow-md border-[1.5px] transition-colors pointer-events-none ${
          knob.active
            ? 'bg-[#FFC815] border-[#B45309]'
            : 'bg-[#FFFDF7] border-[#C9B38C]'
        }`}
      />
    </div>
  );
}
