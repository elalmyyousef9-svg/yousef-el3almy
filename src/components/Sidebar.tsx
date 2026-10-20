import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Shirt,
  Barcode,
  Boxes,
  ScrollText,
  Truck,
  PackageCheck,
  ClipboardCheck,
  Calculator,
  ShieldAlert,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { RoleId } from '../types';

export type TabType = 
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'catalog'
  | 'labels'
  | 'stock'
  | 'ledger'
  | 'transfers'
  | 'purchases'
  | 'stocktake'
  | 'accounting'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentRole: RoleId;
  alertCounts: {
    negativeStock: number;
    openProvisional: number;
    reorderAlerts: number;
    pendingTransfers: number;
    openStocktakes: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  alertCounts,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'الرئيسية والإنذارات',
      icon: LayoutDashboard,
      badge: (alertCounts.negativeStock + alertCounts.openProvisional + alertCounts.pendingTransfers) || undefined,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'pos' as TabType,
      label: 'الكاشير السريع (POS)',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      id: 'sales' as TabType,
      label: 'الفواتير والمرتجعات',
      icon: Receipt,
    },
    {
      id: 'catalog' as TabType,
      label: 'الموديلات والمصفوفة',
      icon: Shirt,
    },
    {
      id: 'labels' as TabType,
      label: 'طباعة الباركود (Code 128)',
      icon: Barcode,
    },
    {
      id: 'stock' as TabType,
      label: 'الأرصدة ولوطات FIFO',
      icon: Boxes,
      badge: alertCounts.reorderAlerts || undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'ledger' as TabType,
      label: 'دفتر حركات المخزون',
      icon: ScrollText,
    },
    {
      id: 'transfers' as TabType,
      label: 'التحويلات والترانزيت',
      icon: Truck,
      badge: alertCounts.pendingTransfers || undefined,
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'purchases' as TabType,
      label: 'المشتريات والاستلام',
      icon: PackageCheck,
    },
    {
      id: 'stocktake' as TabType,
      label: 'الجرد الأعمى والاعتماد',
      icon: ClipboardCheck,
      badge: alertCounts.openStocktakes || undefined,
      badgeColor: 'bg-purple-500',
    },
    {
      id: 'accounting' as TabType,
      label: 'الملخص المحاسبي والقيود',
      icon: Calculator,
      special: true, // Key feature of 06-accounting-rules.md
    },
    {
      id: 'audit' as TabType,
      label: 'سجل التدقيق والمطابقة',
      icon: ShieldAlert,
    },
    {
      id: 'settings' as TabType,
      label: 'الإعدادات والبيانات',
      icon: Settings,
    },
  ];

  return (
    <aside className="no-print w-64 bg-slate-900 border-l border-slate-800 text-slate-200 flex flex-col shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
      <div className="p-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase px-4 border-b border-slate-800/60">
        قائمة النظام التشغيلية
      </div>

      <nav className="p-2 space-y-1 flex-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? item.special 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800 text-amber-400 font-bold border border-slate-700/80 shadow-sm'
                  : item.special
                  ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive && !item.special ? 'text-amber-400' : ''}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full text-white font-bold ${item.badgeColor || 'bg-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
                {item.special && !isActive && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                    وثيقة 06
                  </span>
                )}
                {isActive && <ChevronLeft className="w-3.5 h-3.5 opacity-60" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col gap-1 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span>العملة: <strong>ج.م (EGP)</strong></span>
          <span>التسعير: <strong>FIFO</strong></span>
        </div>
        <div className="text-[10px] text-slate-600">
          متوافق مع مواصفات MontuCode v1.0
        </div>
      </div>
    </aside>
  );
};
