import { useEffect, useRef } from 'react';

const scannerInputThresholdMs = 50;
const scannerCompleteDelayMs = 120;
const minBarcodeLength = 8;
const maxBarcodeLength = 14;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function isBarcode(value: string) {
  return new RegExp(`^\\d{${minBarcodeLength},${maxBarcodeLength}}$`).test(value);
}

export function useHardwareScanner(onScan: (barcode: string) => void) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef('');
  const lastInputAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const flush = () => {
      const barcode = bufferRef.current;
      bufferRef.current = '';

      if (isBarcode(barcode)) {
        onScanRef.current(barcode);
      }
    };

    const scheduleFlush = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(flush, scannerCompleteDelayMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'Enter') {
        flush();
        return;
      }

      if (!/^\d$/.test(event.key)) {
        bufferRef.current = '';
        return;
      }

      const now = Date.now();
      if (now - lastInputAtRef.current > scannerInputThresholdMs) {
        bufferRef.current = '';
      }
      lastInputAtRef.current = now;
      bufferRef.current = `${bufferRef.current}${event.key}`.slice(-maxBarcodeLength);
      scheduleFlush();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);
}
