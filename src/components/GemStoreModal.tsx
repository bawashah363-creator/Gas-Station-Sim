import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  Check,
  Clock,
  Coins,
  Gem,
  History,
  Lock,
  Palette,
  Shirt,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  FUTURE_IAP_CATALOG,
  GEM_STORE_CATALOG,
  StoreCategory,
  StoreItemDefinition,
} from '../game/catalog';
import { GameHUDState, LobbyProfileMeta } from '../game/types';

type StoreTab = StoreCategory | 'future_iap' | 'ledger';

interface GemStoreModalProps {
  hud: GameHUDState;
  meta: LobbyProfileMeta;
  onClose: () => void;
  onPurchaseItem: (item: StoreItemDefinition) => void;
  onEquipItem: (item: StoreItemDefinition) => void;
}

export function GemStoreModal({
  hud,
  meta,
  onClose,
  onPurchaseItem,
  onEquipItem,
}: GemStoreModalProps) {
  const [tab, setTab] = useState<StoreTab>('player');

  const tabs: Array<{ id: StoreTab; label: string; icon: React.ReactNode }> = [
    { id: 'player', label: 'Player', icon: <Shirt className="w-3.5 h-3.5" /> },
    { id: 'vehicle', label: 'Vehicles', icon: <Car className="w-3.5 h-3.5" /> },
    { id: 'station', label: 'Station', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'special', label: 'Specials', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'future_iap', label: 'Future Packs', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'ledger', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const filteredItems = GEM_STORE_CATALOG.filter((i) => i.category === tab);

  const isEquipped = (item: StoreItemDefinition): boolean => {
    if (!item.equipSlot || !item.equipValue) return false;
    return meta.equipped[item.equipSlot] === item.equipValue;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#040E1E]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] rounded-3xl bg-[#07162B] border border-amber-400/40 shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B203D] border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-display font-bold uppercase tracking-[0.22em] text-sky-300">
              ZAIDI INTERACTIVE BOUTIQUE
            </div>
            <h2 className="font-display font-black text-xl text-white flex items-center gap-2">
              <Gem className="w-5 h-5 text-sky-400" />
              <span>Gem Store & Cosmetics</span>
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-[#07162B] border border-amber-400/35 flex items-center gap-1.5 font-mono-nums text-xs font-bold text-amber-200">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>${hud.coins.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#07162B] border border-sky-400/50 flex items-center gap-1.5 font-mono-nums text-xs font-extrabold text-sky-200">
              <Gem className="w-3.5 h-3.5 text-sky-400" />
              <span>{meta.gemWallet.balance.toLocaleString()} Gems</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Gem Store"
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/80 text-slate-200 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-5 py-2.5 bg-[#061224] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-colors border ${
                  active
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-[#071428] border-amber-200'
                    : 'bg-[#0B203D] hover:bg-[#102B52] text-slate-300 border-slate-700/80'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3">
          {tab !== 'future_iap' && tab !== 'ledger' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const owned = !item.consumable && meta.ownedItems.includes(item.id);
                const equipped = isEquipped(item);
                const canAfford = meta.gemWallet.balance >= item.gemPrice;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-colors ${
                      equipped
                        ? 'bg-[#0D2547] border-amber-400/70'
                        : 'bg-[#0B1E38] border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Multi-tone Color Swatch Preview */}
                      <div
                        className="w-12 h-12 rounded-xl border border-white/20 shrink-0 relative overflow-hidden shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${item.previewPrimary} 0%, ${item.previewSecondary} 100%)`,
                        }}
                      >
                        <div
                          className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full border border-black/30"
                          style={{ backgroundColor: item.previewAccent }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/90">
                      <span className="font-mono-nums text-xs font-bold text-sky-300 flex items-center gap-1">
                        {owned ? (
                          <span className="text-emerald-300">Owned</span>
                        ) : (
                          <>
                            <Gem className="w-3.5 h-3.5 text-sky-400" />
                            <span>{item.gemPrice === 0 ? 'Starter' : `${item.gemPrice} Gems`}</span>
                          </>
                        )}
                      </span>

                      {equipped ? (
                        <span className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-display font-bold text-xs flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped</span>
                        </span>
                      ) : owned ? (
                        <button
                          type="button"
                          onClick={() => onEquipItem(item)}
                          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#041322] font-display font-extrabold text-xs"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onPurchaseItem(item)}
                          className={`px-4 py-2 rounded-xl font-display font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-105 text-[#071428]'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Gem className="w-3.5 h-3.5" />
                          <span>
                            {item.consumable ? `Buy & Use · ${item.gemPrice}` : `Unlock · ${item.gemPrice}`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'future_iap' && (
            <div className="space-y-3">
              <div className="rounded-2xl p-4 bg-[#0B203D] border border-sky-400/35 flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-sm text-white">
                    Future Google Play Billing Architecture
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    These SKUs are pre-wired for upcoming Google Play Billing integration in native Android releases. Right now all store items are unlockable using Gems earned fairly through gameplay, daily check-ins, tasks, and achievements.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FUTURE_IAP_CATALOG.map((pkg) => (
                  <div
                    key={pkg.sku}
                    className="rounded-2xl p-4 bg-[#0B1E38]/80 border border-slate-700/80 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="text-[10px] font-display font-bold uppercase tracking-wider text-amber-300">
                        {pkg.badgeText}
                      </div>
                      <div className="font-display font-bold text-sm text-white mt-0.5">
                        {pkg.name}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{pkg.summary}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="font-mono-nums text-[10px] text-slate-400">{pkg.sku}</span>
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-display font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{pkg.targetPriceLabel}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'ledger' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl p-3 bg-[#0B1E38] border border-slate-700/80">
                  <div className="text-[11px] text-slate-400 font-semibold">Current Balance</div>
                  <div className="font-mono-nums font-black text-lg text-sky-300 mt-0.5">
                    {meta.gemWallet.balance.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-2xl p-3 bg-[#0B1E38] border border-slate-700/80">
                  <div className="text-[11px] text-slate-400 font-semibold">Total Earned</div>
                  <div className="font-mono-nums font-black text-lg text-emerald-300 mt-0.5">
                    +{meta.gemWallet.totalEarned.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-2xl p-3 bg-[#0B1E38] border border-slate-700/80">
                  <div className="text-[11px] text-slate-400 font-semibold">Total Spent</div>
                  <div className="font-mono-nums font-black text-lg text-amber-300 mt-0.5">
                    -{meta.gemWallet.totalSpent.toLocaleString()}
                  </div>
                </div>
              </div>

              {meta.gemWallet.transactions.length === 0 ? (
                <div className="rounded-2xl p-6 text-center bg-[#0B1E38] border border-slate-800 text-xs text-slate-400">
                  No gem transactions recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {meta.gemWallet.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl px-4 py-2.5 bg-[#0B1E38] border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.type === 'earn'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tx.type === 'earn' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {tx.source}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-nums">
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono-nums font-extrabold text-xs ${
                            tx.type === 'earn' ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {tx.type === 'earn' ? `+${tx.amount}` : `-${tx.amount}`} Gems
                        </div>
                        <div className="font-mono-nums text-[10px] text-slate-400">
                          Bal: {tx.balanceAfter}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
