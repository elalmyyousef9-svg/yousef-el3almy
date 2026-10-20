import React, { useState, useRef, useEffect } from 'react';
import { Barcode, Search, Building2, Boxes, Tag, X } from 'lucide-react';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency } from '../utils/formatters';
import { normalizeBarcodeScan } from '../utils/scanner';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const data = AppStorage.getInstance().getData();
  const engine = new InventoryEngine();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = normalizeBarcodeScan(inputVal);
  const foundVariant = trimmed
    ? data.variants.find(
        v => v.barcode === trimmed || v.sku.toLowerCase() === trimmed.toLowerCase()
      )
    : null;

  const model = foundVariant ? data.models.find(m => m.id === foundVariant.modelId) : null;
  const color = foundVariant ? data.colors.find(c => c.id === foundVariant.colorId) : null;
  const size = foundVariant ? data.sizes.find(s => s.id === foundVariant.sizeId) : null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-slate-100">فحص واستعلام الباركود السريع</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="امسح الباركود أو اكتب الكود مثل 200000001001 أو SH101-WHT-M..."
            className="w-full bg-slate-950 border-2 border-amber-500/50 rounded-xl px-4 py-3 pl-10 text-xs font-mono text-slate-100 outline-none focus:border-amber-400 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {foundVariant && model && color && size ? (
          <div className="space-y-4 pt-2">
            {/* Details Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{model.nameAr}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {color.nameAr} • مقاس {size.code}
                  </div>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-400">سعر البيع:</span>
                  <div className="text-base font-bold text-amber-400">
                    {formatCurrency(foundVariant.priceOverride || model.basePrice)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <span>SKU: <strong className="text-slate-200">{foundVariant.sku}</strong></span>
                <span>•</span>
                <span>الباركود: <strong className="text-slate-200">{foundVariant.barcode}</strong></span>
              </div>
            </div>

            {/* Balances across all locations */}
            <div className="space-y-2">
              <h5 className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>الرصيد المتاح في جميع الفروع والمستودعات:</span>
              </h5>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.locations.map(loc => {
                  const bal = engine.getBalance(foundVariant.id, loc.id);
                  const isTransit = loc.type === 'IN_TRANSIT';

                  return (
                    <div
                      key={loc.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        bal.onHand > 0
                          ? isTransit
                            ? 'bg-cyan-950/20 border-cyan-500/30'
                            : 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950 border-slate-800 opacity-60'
                      }`}
                    >
                      <span className="text-slate-300 truncate max-w-[140px]">{loc.nameAr}</span>
                      <span className={`font-mono font-bold ${
                        bal.onHand > 0 ? (isTransit ? 'text-cyan-400' : 'text-emerald-400') : 'text-slate-500'
                      }`}>
                        {bal.onHand} قطعة
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : trimmed ? (
          <div className="py-8 text-center text-rose-400 text-xs bg-rose-950/20 rounded-xl border border-rose-500/20">
            لم يتم العثور على أي صنف بهذا الباركود أو الكود [{trimmed}]
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            قم بمسح الباركود باستخدام قارئ الباركود أو اكتب الكود لعرض الرصيد الفوري بجميع الفروع.
          </div>
        )}
      </div>
    </div>
  );
};
