import { Maximize2, RotateCw } from 'lucide-react';
import { enterFullscreenLandscape } from '../utils/androidFullscreen';

interface OrientationGuardProps {
  isPortrait: boolean;
  onFullscreenEntered: () => void;
}

export function OrientationGuard({
  isPortrait,
  onFullscreenEntered,
}: OrientationGuardProps) {
  if (!isPortrait) return null;

  const handleLandscapeClick = async () => {
    await enterFullscreenLandscape();
    onFullscreenEntered();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center mb-5 text-amber-400">
        <RotateCw className="w-10 h-10 animate-spin" style={{ animationDuration: '4s' }} />
      </div>
      <h2 className="font-display text-2xl font-bold text-white mb-2">
        Rotate Device to Landscape
      </h2>
      <p className="text-slate-300 text-sm max-w-xs mb-6 leading-relaxed">
        Gas Station Simulator runs in full-screen horizontal mode for clear isometric controls and zero HUD overlap.
      </p>
      <button
        type="button"
        onClick={handleLandscapeClick}
        className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-display font-bold text-sm flex items-center gap-2 shadow-lg transition-transform whitespace-nowrap"
      >
        <Maximize2 className="w-4 h-4" />
        Switch to Fullscreen Landscape
      </button>
    </div>
  );
}
