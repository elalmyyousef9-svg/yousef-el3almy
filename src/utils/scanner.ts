/**
 * Robust Barcode Scanner Engine & Keyboard Interceptor
 * Handles:
 * 1. Rapid key sequences (<50ms per key) even when focus is lost
 * 2. Automatic conversion from Arabic keyboard layout to ASCII digits/letters
 * 3. Support for Enter, Tab, and delay-based terminators
 * 4. Arabic-Indic digits conversion (٠١٢٣٤٥٦٧٨٩ -> 0123456789)
 */

// Arabic Keyboard layout mapped back to standard English / numeric keys
const ARABIC_TO_ENGLISH_KEY_MAP: Record<string, string> = {
  // Eastern Arabic numerals
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  
  // Standard Arabic keyboard characters mapped to corresponding US keys if typed under Arabic layout
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
  'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': "'",
  'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/',
  'ذ': '`',
};

/**
 * Clean and normalize scanner input from Arabic layout / Hindi digits
 */
export function normalizeBarcodeScan(raw: string): string {
  let cleaned = '';
  for (const char of raw) {
    if (ARABIC_TO_ENGLISH_KEY_MAP[char]) {
      cleaned += ARABIC_TO_ENGLISH_KEY_MAP[char];
    } else {
      cleaned += char;
    }
  }
  return cleaned.trim();
}

/**
 * Scanner listener state for global keyboard capture
 */
export class GlobalScannerListener {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private maxCharIntervalMs: number = 65; // Barcode scanners type characters within 10-40ms
  private minBarcodeLength: number = 3;
  private timeoutId: any = null;
  private onScanCallback: ((barcode: string) => void) | null = null;
  private onRawKeyCallback: ((key: string, interval: number, currentBuffer: string) => void) | null = null;
  private isListening: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public start(
    onScan: (barcode: string) => void,
    onRawKey?: (key: string, interval: number, currentBuffer: string) => void
  ) {
    this.onScanCallback = onScan;
    this.onRawKeyCallback = onRawKey || null;
    if (!this.isListening) {
      window.addEventListener('keydown', this.handleKeyDown, true);
      this.isListening = true;
    }
  }

  public stop() {
    if (this.isListening) {
      window.removeEventListener('keydown', this.handleKeyDown, true);
      this.isListening = false;
    }
    this.buffer = '';
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore control keys, alt, meta
    if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Shift') {
      return;
    }

    const now = Date.now();
    const interval = this.lastKeyTime > 0 ? now - this.lastKeyTime : 0;
    this.lastKeyTime = now;

    // Reset buffer if delay between keystrokes was too long (human typing is >100ms)
    // Note: Allow buffer buildup if it's very fast
    if (interval > this.maxCharIntervalMs && this.buffer.length > 0) {
      // If previous buffer was substantial and ended without Enter
      if (this.buffer.length >= this.minBarcodeLength) {
        this.emitScan(this.buffer);
      }
      this.buffer = '';
    }

    // Check for Enter or Tab (standard scanner terminators)
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.buffer.length >= this.minBarcodeLength) {
        e.preventDefault();
        e.stopPropagation();
        this.emitScan(this.buffer);
        this.buffer = '';
      }
      return;
    }

    // Normal printable character
    if (e.key.length === 1) {
      const normalizedChar = ARABIC_TO_ENGLISH_KEY_MAP[e.key] || e.key;
      this.buffer += normalizedChar;

      if (this.onRawKeyCallback) {
        this.onRawKeyCallback(e.key, interval, this.buffer);
      }

      // Schedule a timer in case scanner has NO suffix / terminator configured
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        if (this.buffer.length >= this.minBarcodeLength) {
          this.emitScan(this.buffer);
          this.buffer = '';
        }
      }, 75);
    }
  }

  private emitScan(raw: string) {
    const cleaned = normalizeBarcodeScan(raw);
    if (cleaned && this.onScanCallback) {
      this.onScanCallback(cleaned);
    }
  }
}
