import { useCallback, useEffect, useRef, useState } from 'react';

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect(video: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useCameraScanner(onScan: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const close = useCallback(() => {
    activeRef.current = false;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    setIsOpen(false);
  }, []);

  const open = useCallback(async () => {
    setError('');

    if (!window.isSecureContext) {
      setError('Akses kamera browser biasanya perlu HTTPS. Untuk LAN tanpa HTTPS, gunakan scanner USB atau input manual.');
      setIsOpen(true);
      return;
    }

    if (!window.BarcodeDetector) {
      setError('Scanner kamera belum didukung oleh browser ini.');
      setIsOpen(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Perangkat tidak menyediakan akses kamera.');
      setIsOpen(true);
      return;
    }

    setIsOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        return;
      }

      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
      });
      activeRef.current = true;

      const scanFrame = async () => {
        if (!activeRef.current || !videoRef.current) return;

        try {
          const results = await detector.detect(videoRef.current);
          const rawValue = results.find((result) => /^\d{8,14}$/.test(result.rawValue ?? ''))?.rawValue;
          if (rawValue) {
            onScanRef.current(rawValue);
            close();
            return;
          }
        } catch {
          setError('Kamera aktif, tetapi barcode belum terbaca.');
        }

        frameRef.current = window.requestAnimationFrame(scanFrame);
      };

      frameRef.current = window.requestAnimationFrame(scanFrame);
    } catch {
      setError('Izin kamera ditolak atau kamera tidak tersedia.');
    }
  }, [close]);

  useEffect(() => close, [close]);

  return {
    isOpen,
    error,
    videoRef,
    open,
    close,
  };
}
