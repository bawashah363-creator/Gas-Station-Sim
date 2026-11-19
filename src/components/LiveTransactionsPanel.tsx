import { ChevronLeft, ChevronRight, Fuel, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LiveFuelState, LiveShopSaleState } from '../game/types';
import { soundFx } from '../utils/soundFx';

interface LiveTransactionsPanelProps {
  liveFuel: LiveFuelState | null;
  lastShopSale: LiveShopSaleState | null;
  shopIncome: number;
  shopUnlocked: boolean;
}

export function LiveTransactionsPanel({
  liveFuel,
  lastShopSale,
  shopIncome,
  shopUnlocked,
}: LiveTransactionsPanelProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [shopFlash, setShopFlash] = useState(false);

  useEffect(() => {
    if (!lastShopSale) return;
    setShopFlash(true);
    const timer = window.setTimeout(() => setShopFlash(false), 1800);
    return () => window.clearTimeout(timer);
  }, [lastShopSale?.txId]);

  const fuelPct =
    liveFuel && liveFuel.targetLitres > 0
      ? Math.min(100, Math.round((liveFuel.litresFilled / liveFuel.targetLitres) * 100))
      : 0;

  const isFueling = liveFuel?.status === 'fueling';
  const isFuelDone = liveFuel?.status === 'completed';
  const hasUnreadActivity = Boolean(isFueling || shopFlash);

  return (
    <div
      style={{
        top: 'calc(max(6px, var(--safe-top)) + 50px)',
        transform: isHidden
          ? 'translateX(calc(-100% + 22px + var(--safe-left)))'
          : 'translateX(max(8px, var(--safe-left)))',
      }}
      className="fixed left-0 z-20 pointer-events-none flex items-center transition-transform duration-300 ease-out"
    >
      {/* Compact Vertical Cream Live Transactions Card */}
      <div className="pointer-events-none w-[134px] sm:w-[148px] rounded-xl bg-[#FAF3E3]/94 backdrop-blur-[2px] border border-[#D6C4A3] shadow-[0_3px_0_#B9A37E,0_6px_14px_rgba(46,34,29,0.16)] text-[#2E221D] px-2 py-1.5 flex flex-col gap-1.5">
        {/* LIVE FUELING SECTION */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 font-display font-extrabold text-[9.5px] sm:text-[10px] tracking-wide text-[#2E221D]">
              <Fuel className="w-3 h-3 text-[#DC2626] shrink-0" />
              <span>FUELING</span>
            </span>
            {isFueling ? (
              <span className="px-1 py-[1px] rounded bg-[#22C55E] text-white font-display font-extrabold text-[7.5px] leading-none animate-pulse">
                LIVE
              </span>
            ) : isFuelDone ? (
              <span className="px-1 py-[1px] rounded bg-[#FFC815] border border-[#D97706] text-[#2E221D] font-display font-extrabold text-[7.5px] leading-none">
                PAID
              </span>
            ) : (
              <span className="px-1 py-[1px] rounded bg-[#E6D7BC] text-[#6B5A4E] font-display font-bold text-[7.5px] leading-none">
                IDLE
              </span>
            )}
          </div>

          <div className="text-[8.5px] font-semibold text-[#6B5A4E] leading-tight truncate">
            {liveFuel
              ? `${liveFuel.pumpLabel}${liveFuel.byWorker ? ' · Staff' : ''}`
              : 'Ready for vehicle'}
          </div>

          <div className="mt-0.5 flex items-center justify-between text-[9.5px] sm:text-[10px] leading-tight">
            <span className="text-[#6B5A4E] font-semibold">Price:</span>
            <span className="font-mono-nums font-bold text-[#2E221D]">
              {liveFuel ? `$${liveFuel.pricePerLitre.toFixed(2)}/L` : '--/L'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] leading-tight">
            <span className="text-[#6B5A4E] font-semibold">Litres:</span>
            <span className="font-mono-nums font-bold text-[#DC2626]">
              {liveFuel ? `${liveFuel.litresFilled.toFixed(1)} L` : '0.0 L'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] leading-tight">
            <span className="text-[#6B5A4E] font-semibold">Total:</span>
            <span className="font-mono-nums font-extrabold text-[#16A34A]">
              {liveFuel ? `$${liveFuel.totalAmount.toFixed(2)}` : '$0.00'}
            </span>
          </div>

          <div className="mt-0.5 h-[3px] w-full rounded-full bg-[#E6D7BC] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isFuelDone ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
              }`}
              style={{ width: `${fuelPct}%` }}
            />
          </div>
        </div>

        <div className="border-t border-[#D6C4A3]/80" />

        {/* SHOP SALE SECTION */}
        <div
          className={`flex flex-col gap-0.5 rounded-md transition-colors duration-300 ${
            shopFlash ? 'bg-[#DCFCE7]/70 -mx-1 px-1 py-0.5' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 font-display font-extrabold text-[9.5px] sm:text-[10px] tracking-wide text-[#2E221D]">
              <ShoppingCart className="w-3 h-3 text-[#2563EB] shrink-0" />
              <span>SHOP SALE</span>
            </span>
            {shopFlash && (
              <span className="px-1 py-[1px] rounded bg-[#16A34A] text-white font-display font-extrabold text-[7.5px] leading-none">
                NEW
              </span>
            )}
          </div>

          <div className="text-[8.5px] font-semibold text-[#6B5A4E] leading-tight truncate">
            {lastShopSale
              ? lastShopSale.customerLabel
              : shopUnlocked
                ? 'Awaiting buyer'
                : 'Unlocks at Lv.3'}
          </div>

          <div className="mt-0.5 flex items-center justify-between text-[9.5px] sm:text-[10px] leading-tight">
            <span className="text-[#6B5A4E] font-semibold">Income:</span>
            <span className="font-mono-nums font-extrabold text-[#16A34A]">
              {lastShopSale ? `+$${lastShopSale.amount.toFixed(2)}` : '+$0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] sm:text-[9.5px] leading-tight">
            <span className="text-[#6B5A4E] font-semibold">Shop Sum:</span>
            <span className="font-mono-nums font-bold text-[#2E221D]">
              ${shopIncome.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tiny Attached Edge Hide / Recall Arrow Tab */}
      <button
        type="button"
        onClick={() => {
          soundFx.playTap();
          setIsHidden((prev) => !prev);
        }}
        aria-label={isHidden ? 'Show Live Transactions Panel' : 'Hide Live Transactions Panel'}
        title={isHidden ? 'Show Live Panel' : 'Hide Live Panel'}
        className="pointer-events-auto -ml-[1px] w-[22px] h-11 rounded-r-lg bg-[#FAF3E3]/95 hover:bg-[#FFFDF7] active:scale-95 border border-[#D6C4A3] shadow-[2px_2px_0_#B9A37E] flex flex-col items-center justify-center gap-0.5 text-[#2E221D] transition-all"
      >
        {isHidden && hasUnreadActivity && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        )}
        {isHidden ? (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.6]" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.6]" />
        )}
      </button>
    </div>
  );
}
