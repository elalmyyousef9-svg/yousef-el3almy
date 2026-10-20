import React, { useState } from 'react';
import {
  Shirt,
  Plus,
  Search,
  Filter,
  Layers,
  Barcode,
  Tag,
  Check,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { ClothingModel, Color, Size, Variant } from '../types';
import { AppStorage } from '../services/storage';
import { formatCurrency } from '../utils/formatters';

interface CatalogScreenProps {
  onSelectVariantForPrint?: (v: Variant) => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  onSelectVariantForPrint,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<ClothingModel | null>(data.models[0] || null);
  const [showNewModelModal, setShowNewModelModal] = useState(false);

  // New model form state
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(data.categories[0]?.id || '');
  const [newPrice, setNewPrice] = useState(350);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>(['COL-BLK', 'COL-WHT']);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>(['SZ-M', 'SZ-L', 'SZ-XL']);

  // Filter models
  const filteredModels = data.models.filter(m => {
    const matchesCategory = selectedCategory === 'all' || m.categoryId === selectedCategory;
    const matchesSearch = 
      m.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle create model and auto-generate variant matrix (Docs 08 Screen #4)
  const handleCreateModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newNameAr.trim()) return;

    const modelId = `MOD-${newCode.trim().toUpperCase()}`;
    const newModel: ClothingModel = {
      id: modelId,
      code: newCode.trim().toUpperCase(),
      name: newNameAr,
      nameAr: newNameAr,
      categoryId: newCategoryId,
      basePrice: newPrice,
      colorIds: selectedColorIds,
      sizeIds: selectedSizeIds,
      createdAt: new Date().toISOString(),
    };

    data.models.push(newModel);

    // Auto-generate variants matrix for all Color × Size combinations
    selectedColorIds.forEach(colId => {
      const color = data.colors.find(c => c.id === colId);
      selectedSizeIds.forEach(szId => {
        const size = data.sizes.find(s => s.id === szId);
        if (color && size) {
          const sku = `${newModel.code}-${color.code}-${size.code}`;
          const barcode = `20${String(data.nextDocSeq.BARCODE++).padStart(10, '0')}`;
          data.variants.push({
            id: `VAR-${sku}`,
            modelId: newModel.id,
            colorId: color.id,
            sizeId: size.id,
            sku,
            barcode,
            reorderLevel: 5,
            active: true,
          });
        }
      });
    });

    storage.save();
    setSelectedModel(newModel);
    setShowNewModelModal(false);
    setNewCode('');
    setNewNameAr('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <Shirt className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">كتالوج الموديلات ومصفوفة المقاسات (Variant Matrix)</h2>
          </div>
          <p className="text-xs text-slate-400">
            إدارة الموديلات وتوليد مصفوفة الألوان × المقاسات، أكواد SKU، وتعيين باركود Code 128 لكل صنف.
          </p>
        </div>

        <button
          onClick={() => setShowNewModelModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>موديل جديد ومصفوفة مقاسات</span>
        </button>
      </div>

      {/* Main Grid: Left side models list, Right side Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Models List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بكود الموديل أو الاسم..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-200 outline-none focus:border-amber-400"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  selectedCategory === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                }`}
              >
                الكل
              </button>
              {data.categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                    selectedCategory === cat.id ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>

          {/* Models List */}
          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {filteredModels.map(model => {
              const category = data.categories.find(c => c.id === model.categoryId);
              const modelVariants = data.variants.filter(v => v.modelId === model.id);
              const isSelected = selectedModel?.id === model.id;

              return (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{model.code}</span>
                      <span className="text-xs font-semibold">{model.nameAr}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>{category?.nameAr}</span>
                      <span>•</span>
                      <span>{modelVariants.length} صنف (Variant)</span>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs font-bold text-slate-200">
                    {formatCurrency(model.basePrice)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Variant Matrix Grid (Screen #4) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          {selectedModel ? (
            <>
              {/* Selected Model Details */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                      {selectedModel.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">{selectedModel.nameAr}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedModel.description || 'لا يوجد وصف إضافي'}</p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xs text-slate-400">سعر البيع الأساسي</div>
                  <div className="text-lg font-extrabold text-amber-400">{formatCurrency(selectedModel.basePrice)}</div>
                </div>
              </div>

              {/* Variant Matrix Table: Rows = Colors, Columns = Sizes (Screen #4 spec) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>مصفوفة المقاسات والألوان (Matrix View)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    الصفوف = الألوان، الأعمدة = المقاسات
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3 font-bold">اللون / المقاس</th>
                        {selectedModel.sizeIds.map(sId => {
                          const size = data.sizes.find(s => s.id === sId);
                          return (
                            <th key={sId} className="p-3 font-bold text-center font-mono">
                              {size?.code} ({size?.nameAr})
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedModel.colorIds.map(cId => {
                        const color = data.colors.find(c => c.id === cId);
                        return (
                          <tr key={cId} className="hover:bg-slate-800/30">
                            <td className="p-3 bg-slate-950/60 font-semibold text-slate-200">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-700"
                                  style={{ backgroundColor: color?.hex }}
                                />
                                <span>{color?.nameAr}</span>
                                <span className="font-mono text-[10px] text-slate-500">({color?.code})</span>
                              </div>
                            </td>

                            {selectedModel.sizeIds.map(sId => {
                              const size = data.sizes.find(s => s.id === sId);
                              const variant = data.variants.find(
                                v => v.modelId === selectedModel.id && v.colorId === cId && v.sizeId === sId
                              );

                              if (!variant) {
                                return (
                                  <td key={sId} className="p-2 text-center text-slate-600 font-mono text-[11px]">
                                    غير متوفر
                                  </td>
                                );
                              }

                              return (
                                <td key={sId} className="p-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                                    <div className="font-mono font-bold text-amber-400">{variant.sku}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{variant.barcode}</div>
                                    <div className="text-[10px] text-slate-500">
                                      حد الطلب: {variant.reorderLevel}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              اختر موديلاً من القائمة لعرض تفاصيل مصفوفة الألوان والمقاسات.
            </div>
          )}
        </div>
      </div>

      {/* New Model Modal */}
      {showNewModelModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateModel} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Shirt className="w-5 h-5 text-amber-400" />
                <span>إضافة موديل جديد وتوليد مصفوفة المقاسات</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModelModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">كود الموديل (مثل SH102):</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="SH102"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">التصنيف:</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  {data.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">اسم الموديل (عربي):</label>
                <input
                  type="text"
                  required
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="مثال: قميص كتان تركي كم طويل"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">سعر البيع الأساسي (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>
            </div>

            {/* Colors picker */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-400 font-semibold">اختر الألوان للمصفوفة:</label>
              <div className="flex flex-wrap gap-2">
                {data.colors.map(col => {
                  const isChecked = selectedColorIds.includes(col.id);
                  return (
                    <button
                      type="button"
                      key={col.id}
                      onClick={() => {
                        setSelectedColorIds(prev => 
                          isChecked ? prev.filter(id => id !== col.id) : [...prev, col.id]
                        );
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        isChecked ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.hex }} />
                      <span>{col.nameAr}</span>
                      {isChecked && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes picker */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-400 font-semibold">اختر المقاسات للمصفوفة:</label>
              <div className="flex flex-wrap gap-2">
                {data.sizes.map(sz => {
                  const isChecked = selectedSizeIds.includes(sz.id);
                  return (
                    <button
                      type="button"
                      key={sz.id}
                      onClick={() => {
                        setSelectedSizeIds(prev => 
                          isChecked ? prev.filter(id => id !== sz.id) : [...prev, sz.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                        isChecked ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {sz.code} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 text-[11px] text-slate-400 border border-slate-800">
              سيقوم النظام بإنشاء <strong>{selectedColorIds.length * selectedSizeIds.length}</strong> صنف فرعي (SKU)، وتوليد باركود Code 128 لكل مقاس ولون تلقائياً.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModelModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={selectedColorIds.length === 0 || selectedSizeIds.length === 0}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                توليد الموديل والمصفوفة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
