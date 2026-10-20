/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Location, RoleId } from './types';
import { AppStorage } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PosScreen } from './components/PosScreen';
import { AccountingSummaryScreen } from './components/AccountingSummaryScreen';
import { CatalogScreen } from './components/CatalogScreen';
import { StockScreen } from './components/StockScreen';
import { LedgerScreen } from './components/LedgerScreen';
import { TransfersScreen } from './components/TransfersScreen';
import { PurchasesScreen } from './components/PurchasesScreen';
import { StocktakeScreen } from './components/StocktakeScreen';
import { LabelPrintingScreen } from './components/LabelPrintingScreen';
import { SalesScreen } from './components/SalesScreen';
import { AuditLogScreen } from './components/AuditLogScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { QuickScanModal } from './components/QuickScanModal';
import { PrinterTroubleshootModal } from './components/PrinterTroubleshootModal';
import { ScannerTroubleshootModal } from './components/ScannerTroubleshootModal';

export default function App() {
  const storage = AppStorage.getInstance();
  const [dataVersion, setDataVersion] = useState(0);

  // Subscribe to storage changes for reactive updates across the entire app
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return unsubscribe;
  }, [storage]);

  const data = storage.getData();

  // Active state
  const [currentLocation, setCurrentLocation] = useState<Location>(
    data.locations.find(l => l.id === 'LOC-MAADI') || data.locations[0]
  );
  const [currentRole, setCurrentRole] = useState<RoleId>('admin');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [isPrinterTroubleshootOpen, setIsPrinterTroubleshootOpen] = useState(false);
  const [isScannerTroubleshootOpen, setIsScannerTroubleshootOpen] = useState(false);

  // Theme state: defaults to 'luxury-light' (the requested new theme)
  const [currentTheme, setCurrentTheme] = useState<'luxury-light' | 'dark' | 'royal-navy' | 'emerald'>(() => {
    try {
      const saved = localStorage.getItem('montu_app_theme') as any;
      if (saved && ['luxury-light', 'dark', 'royal-navy', 'emerald'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'luxury-light';
  });

  // Apply theme class to documentElement and body whenever currentTheme changes
  useEffect(() => {
    const allThemes = ['theme-luxury-light', 'theme-dark', 'theme-royal-navy', 'theme-emerald'];
    allThemes.forEach(cls => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    });

    const activeCls = `theme-${currentTheme}`;
    document.documentElement.classList.add(activeCls);
    document.body.classList.add(activeCls);

    try {
      localStorage.setItem('montu_app_theme', currentTheme);
    } catch {}
  }, [currentTheme]);

  // Global F9 shortcut for quick scan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsQuickScanOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute live alert counts
  const negativeStockCount = data.stockBalances.filter(b => b.onHand < 0).length;
  const openProvisionalCount = data.lotAllocations.filter(a => {
    if (!a.isProvisional) return false;
    const settled = data.lotAllocations
      .filter(s => s.settlesAllocationId === a.id)
      .reduce((sum, s) => sum + s.qty, 0);
    const reversed = data.lotAllocations
      .filter(r => r.reversesAllocationId === a.id)
      .reduce((sum, r) => sum + Math.abs(r.qty), 0);
    return (a.qty - settled - reversed) > 0;
  }).length;
  const reorderAlertsCount = data.stockBalances.filter(
    b => b.locationId === currentLocation.id && b.onHand <= 5 && b.onHand >= 0
  ).length;
  const pendingTransfersCount = data.transfers.filter(t => t.status === 'DISPATCHED').length;
  const openStocktakesCount = data.stocktakeSessions.filter(
    s => s.status === 'OPEN' || s.status === 'COUNTING'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
        locations={data.locations}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenQuickScan={() => setIsQuickScanOpen(true)}
        onOpenPrinterTroubleshoot={() => setIsPrinterTroubleshootOpen(true)}
        onOpenScannerTroubleshoot={() => setIsScannerTroubleshootOpen(true)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Right Sidebar in RTL layout */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          alertCounts={{
            negativeStock: negativeStockCount,
            openProvisional: openProvisionalCount,
            reorderAlerts: reorderAlertsCount,
            pendingTransfers: pendingTransfersCount,
            openStocktakes: openStocktakesCount,
          }}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentLocation={currentLocation}
              currentRole={currentRole}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'pos' && (
            <PosScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'accounting' && (
            <AccountingSummaryScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'sales' && (
            <SalesScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogScreen />
          )}

          {activeTab === 'stock' && (
            <StockScreen
              currentLocation={currentLocation}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerScreen
              currentLocation={currentLocation}
            />
          )}

          {activeTab === 'transfers' && (
            <TransfersScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'stocktake' && (
            <StocktakeScreen
              currentLocation={currentLocation}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'labels' && (
            <LabelPrintingScreen />
          )}

          {activeTab === 'audit' && (
            <AuditLogScreen />
          )}

          {activeTab === 'settings' && (
            <SettingsScreen />
          )}
        </main>
      </div>

      {/* Global Quick Barcode Scanner Modal */}
      <QuickScanModal
        isOpen={isQuickScanOpen}
        onClose={() => setIsQuickScanOpen(false)}
      />

      {/* Printer Troubleshooter & Test Modal */}
      <PrinterTroubleshootModal
        isOpen={isPrinterTroubleshootOpen}
        onClose={() => setIsPrinterTroubleshootOpen(false)}
      />

      {/* Scanner Troubleshooter & Diagnostic Modal */}
      <ScannerTroubleshootModal
        isOpen={isScannerTroubleshootOpen}
        onClose={() => setIsScannerTroubleshootOpen(false)}
      />
    </div>
  );
}
