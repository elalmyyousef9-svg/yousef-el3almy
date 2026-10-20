/**
 * Formatting and numeric helpers for MontuCode Blueprint
 * All money is NUMERIC. Rounding is half-up to 2 decimals, at allocation level.
 */

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function round4(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

export function formatCurrency(amount: number, currency: string = 'ج.م'): string {
  const rounded = round2(amount);
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${formatted} ${currency}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-EG').format(num);
}

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function generateDocNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(5, '0')}`;
}

export function generateBarcodeNumber(seq: number): string {
  // 20 prefix + 10 digits counter
  return `20${String(seq).padStart(10, '0')}`;
}
