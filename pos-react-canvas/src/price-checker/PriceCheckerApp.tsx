import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Barcode, Camera, Delete, LoaderCircle, PackageSearch, Search, Store, Wifi, WifiOff, X } from 'lucide-react';
import styles from './PriceCheckerApp.module.css';
import { isPriceCheckerRequestError, priceCheckerApi, type PriceCheckerProduct, type PriceCheckerStore } from './priceCheckerApi';
import { readRecentScans, writeRecentScan, type RecentScan } from './recentScans';
import { useHardwareScanner } from './useHardwareScanner';
import { useCameraScanner } from './useCameraScanner';
import { shouldRegisterRuntimeStaticAssets } from '../services/apiBaseUrl';

type LookupState = 'idle' | 'loading' | 'found' | 'not-found' | 'error';
type KeyboardMode = 'numeric' | 'alpha';

const liveSuggestionDelayMs = 220;
const numericKeypadItems = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];
const alphaKeyboardRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const fallbackStore: PriceCheckerStore = {
  name: 'TOKO BERSAMA MATERIAL',
  address: '',
  phone: '',
  logoDataUrl: null,
  logoFileName: '',
  logoFileSizeKb: null,
};

const stockLabels: Record<PriceCheckerProduct['stockStatus'], string> = {
  available: 'Tersedia',
  low: 'Stok terbatas',
  out: 'Stok kosong',
};

function vibrateSuccess() {
  if ('vibrate' in navigator) {
    navigator.vibrate(40);
  }
}

function playBeep() {
  try {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  } catch {
    // Audio feedback is optional.
  }
}

export function PriceCheckerApp() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const [store, setStore] = useState<PriceCheckerStore>(fallbackStore);
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [product, setProduct] = useState<PriceCheckerProduct | null>(null);
  const [searchResults, setSearchResults] = useState<PriceCheckerProduct[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>('numeric');
  const [message, setMessage] = useState('Scan barcode atau cari nama barang.');
  const [recentScans, setRecentScans] = useState<RecentScan[]>(() => readRecentScans());

  const commitProduct = useCallback((item: PriceCheckerProduct) => {
    suggestionRequestIdRef.current += 1;
    setProduct(item);
    setLookupState('found');
    setSearchResults([]);
    setSuggestionsLoading(false);
    setRecentScans(writeRecentScan(item));
    setQuery('');
    vibrateSuccess();
    playBeep();
  }, []);

  const prepareQueryEntry = useCallback((nextQuery: string) => {
    suggestionRequestIdRef.current += 1;
    setQuery(nextQuery.slice(0, 80));
    setProduct(null);
    setSearchResults([]);
    setSuggestionsLoading(false);
    setLookupState('idle');
    setMessage(nextQuery.trim() ? 'Suggestion akan muncul saat nama barang cocok.' : 'Scan barcode atau cari nama barang.');
  }, []);

  const lookupBarcode = useCallback(async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      setLookupState('error');
      setMessage('Barcode harus berupa angka 8 sampai 14 digit.');
      return;
    }

    setLookupState('loading');
    setMessage('Memeriksa barcode...');

    try {
      const item = await priceCheckerApi.lookupBarcode(cleanBarcode);
      commitProduct(item);
      setOnline(true);
    } catch (error) {
      setProduct(null);
      setSearchResults([]);
      if (isPriceCheckerRequestError(error) && error.status === 404) {
        setLookupState('not-found');
        setMessage(error.message);
        return;
      }
      setOnline(false);
      setLookupState('error');
      setMessage(error instanceof Error ? error.message : 'Server price checker tidak bisa dihubungi.');
    }
  }, [commitProduct]);

  const cameraScanner = useCameraScanner(lookupBarcode);

  useHardwareScanner((barcode) => {
    void lookupBarcode(barcode);
  });

  useEffect(() => {
    let active = true;

    const syncStatus = async () => {
      try {
        const [storeIdentity] = await Promise.all([
          priceCheckerApi.getStore(),
          priceCheckerApi.health(),
        ]);
        if (!active) return;
        setStore(storeIdentity);
        setOnline(true);
      } catch {
        if (!active) return;
        setStore(fallbackStore);
        setOnline(false);
      }
    };

    void syncStatus();
    const intervalId = window.setInterval(syncStatus, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !shouldRegisterRuntimeStaticAssets()) {
      return;
    }

    const manifestHref = '/price-checker/manifest.webmanifest?v=2';
    const existingManifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!existingManifest) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestHref;
      document.head.appendChild(link);
    } else {
      existingManifest.href = manifestHref;
    }

    navigator.serviceWorker.register('/price-checker/sw.js', { scope: '/price-checker/' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    const shouldSuggestByName = cleanQuery.length >= 2 && /[a-z]/i.test(cleanQuery);

    if (!shouldSuggestByName) {
      setSuggestionsLoading(false);
      if (!cleanQuery) {
        setSearchResults([]);
      }
      return;
    }

    const requestId = ++suggestionRequestIdRef.current;
    setSuggestionsLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const items = await priceCheckerApi.searchProducts(cleanQuery);
        if (suggestionRequestIdRef.current !== requestId) {
          return;
        }

        setOnline(true);
        setSuggestionsLoading(false);

        if (items.length === 1) {
          commitProduct(items[0]);
          return;
        }

        setSearchResults(items);
        setLookupState(items.length ? 'idle' : 'not-found');
        setMessage(items.length ? 'Pilih suggestion barang yang sesuai.' : 'Barang tidak ditemukan.');
      } catch (error) {
        if (suggestionRequestIdRef.current !== requestId) {
          return;
        }

        setSearchResults([]);
        setSuggestionsLoading(false);
        setOnline(false);
        setLookupState('error');
        setMessage(error instanceof Error ? error.message : 'Suggestion gagal dimuat.');
      }
    }, liveSuggestionDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [commitProduct, query]);

  const handleSubmit = useCallback(async () => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      inputRef.current?.focus();
      return;
    }

    if (/^\d{8,14}$/.test(cleanQuery)) {
      await lookupBarcode(cleanQuery);
      return;
    }

    if (cleanQuery.length < 2) {
      setLookupState('error');
      setMessage('Ketik minimal 2 karakter untuk pencarian.');
      return;
    }

    suggestionRequestIdRef.current += 1;
    setLookupState('loading');
    setMessage('Mencari barang...');
    setProduct(null);
    setSuggestionsLoading(false);

    try {
      const items = await priceCheckerApi.searchProducts(cleanQuery);
      setOnline(true);

      if (items.length === 1) {
        commitProduct(items[0]);
        return;
      }

      setSearchResults(items);
      setLookupState(items.length ? 'idle' : 'not-found');
      setMessage(items.length ? 'Pilih barang dari hasil pencarian.' : 'Barang tidak ditemukan.');
    } catch (error) {
      setSearchResults([]);
      setOnline(false);
      setLookupState('error');
      setMessage(error instanceof Error ? error.message : 'Pencarian gagal.');
    }
  }, [commitProduct, lookupBarcode, query]);

  const handleKeyboardInput = (value: string) => {
    if (value === 'CLEAR') {
      prepareQueryEntry('');
      inputRef.current?.focus();
      return;
    }
    if (value === 'DEL') {
      prepareQueryEntry(query.slice(0, -1));
      inputRef.current?.focus();
      return;
    }
    if (value === 'SPACE') {
      prepareQueryEntry(`${query} `);
      inputRef.current?.focus();
      return;
    }
    prepareQueryEntry(`${query}${value}`);
    inputRef.current?.focus();
  };

  const renderResult = () => {
    if (lookupState === 'loading') {
      return (
        <div className={styles.emptyState}>
          <LoaderCircle className="animate-spin" />
          <h2 className={styles.stateTitle}>Memeriksa harga</h2>
          <p className={styles.stateText}>{message}</p>
        </div>
      );
    }

    if (lookupState === 'found' && product) {
      return (
        <>
          <p className={styles.price}>{product.priceText}</p>
          <h2 className={styles.resultName}>{product.name}</h2>
          <div className={styles.resultMeta}>
            <span className={styles.pill}>{product.barcode}</span>
            <span className={styles.pill}>{product.category}</span>
            <span className={styles.pill}>Per {product.unit}</span>
            <span className={`${styles.pill} ${styles[product.stockStatus]}`}>{stockLabels[product.stockStatus]}</span>
          </div>
        </>
      );
    }

    if (lookupState === 'not-found' || lookupState === 'error') {
      return (
        <div className={lookupState === 'error' ? styles.errorState : styles.emptyState}>
          <PackageSearch />
          <h2 className={styles.stateTitle}>{lookupState === 'error' ? 'Tidak bisa memuat data' : 'Barang tidak ditemukan'}</h2>
          <p className={styles.stateText}>{message}</p>
        </div>
      );
    }

    return (
      <div className={styles.emptyState}>
        <Barcode />
        <h2 className={styles.stateTitle}>Cek harga barang</h2>
        <p className={styles.stateText}>{message}</p>
      </div>
    );
  };

  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logo}>
              {store.logoDataUrl ? <img src={store.logoDataUrl} alt={store.name} /> : <Store size={26} />}
            </span>
            <div className="min-w-0">
              <h1 className={styles.storeName}>{store.name || fallbackStore.name}</h1>
              <div className={styles.storeMeta}>
                {store.address ? <span>{store.address}</span> : null}
                {store.phone ? <span>{store.phone}</span> : null}
              </div>
            </div>
          </div>
          <div className={`${styles.status} ${online ? styles.statusOnline : ''}`}>
            <span className={styles.statusDot} />
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            {online ? 'Online' : 'Offline'}
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <Search size={16} />
              Cari barang
            </h2>
            <div className={styles.searchBox}>
              <div className={styles.inputWrap}>
                <Barcode size={22} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => prepareQueryEntry(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSubmit();
                    }
                  }}
                  inputMode="search"
                  placeholder="Barcode atau nama barang"
                />
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={() => void handleSubmit()}>
                  <Search size={18} />
                  Cari
                </button>
                <button type="button" className={styles.button} onClick={cameraScanner.open}>
                  <Camera size={18} />
                  Kamera
                </button>
              </div>
            </div>

            <div className={styles.keyboardToolbar}>
              <button type="button" className={`${styles.keyboardModeButton} ${keyboardMode === 'numeric' ? styles.keyboardModeActive : ''}`} onClick={() => setKeyboardMode('numeric')}>
                123
              </button>
              <button type="button" className={`${styles.keyboardModeButton} ${keyboardMode === 'alpha' ? styles.keyboardModeActive : ''}`} onClick={() => setKeyboardMode('alpha')}>
                ABC
              </button>
            </div>

            <div className={styles.keyboardSurface}>
              {keyboardMode === 'numeric' ? (
                <div className={styles.keypad}>
                  {numericKeypadItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.keypadButton} ${item === 'C' || item === 'DEL' ? styles.keypadActionButton : ''}`}
                      onClick={() => handleKeyboardInput(item === 'C' ? 'CLEAR' : item)}
                      aria-label={item === 'DEL' ? 'Hapus satu angka' : item === 'C' ? 'Bersihkan input' : `Angka ${item}`}
                    >
                      {item === 'DEL' ? <Delete size={22} aria-hidden="true" /> : item}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.alphaKeyboard}>
                  {alphaKeyboardRows.map((row) => (
                    <div key={row.join('')} className={styles.keyboardRow}>
                      {row.map((item) => (
                        <button key={item} type="button" className={styles.alphaKey} onClick={() => handleKeyboardInput(item)} aria-label={`Huruf ${item}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className={styles.keyboardActionRow}>
                    <button type="button" className={`${styles.alphaKey} ${styles.alphaActionKey}`} onClick={() => handleKeyboardInput('CLEAR')}>
                      Clear
                    </button>
                    <button type="button" className={`${styles.alphaKey} ${styles.spaceKey}`} onClick={() => handleKeyboardInput('SPACE')}>
                      Spasi
                    </button>
                    <button type="button" className={`${styles.alphaKey} ${styles.alphaActionKey}`} onClick={() => handleKeyboardInput('DEL')} aria-label="Hapus satu karakter">
                      <Delete size={20} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
              <button type="button" className={`${styles.keypadButton} ${styles.keypadPrimaryButton}`} onClick={() => void handleSubmit()} aria-label="Enter">
                Enter
              </button>
            </div>

            {suggestionsLoading || searchResults.length ? (
              <div className={styles.searchResults}>
                <h2 className={styles.panelTitle}>
                  <PackageSearch size={16} />
                  Suggestion
                </h2>
                {suggestionsLoading ? <div className={styles.suggestionLoading}>Mencari nama barang...</div> : null}
                {searchResults.map((item) => (
                  <button key={item.barcode} type="button" className={styles.searchResultButton} onClick={() => commitProduct(item)}>
                    <span className={styles.productName}>{item.name}</span>
                    <span className={styles.productMeta}>
                      <span>{item.barcode}</span>
                      <strong>{item.priceText}</strong>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className={styles.result} aria-live="polite">
            {renderResult()}
          </section>

          <aside className={styles.recent}>
            <h2 className={styles.recentTitle}>
              <ArrowLeft size={16} />
              Scan terakhir
            </h2>
            <div className={styles.recentList}>
              {recentScans.length ? recentScans.map((item) => (
                <button key={`${item.barcode}-${item.scannedAt}`} type="button" className={styles.recentButton} onClick={() => commitProduct(item)}>
                  <span className={styles.productName}>{item.name}</span>
                  <span className={styles.productMeta}>
                    <span>{item.barcode}</span>
                    <strong>{item.priceText}</strong>
                  </span>
                </button>
              )) : (
                <p className={styles.stateText}>Belum ada scan.</p>
              )}
            </div>
          </aside>
        </main>
      </div>

      {cameraScanner.isOpen ? (
        <div className={styles.cameraBackdrop}>
          <div className={styles.cameraDialog}>
            <div className={styles.cameraHeader}>
              <h2 className={styles.cameraTitle}>Scan barcode</h2>
              <button type="button" className={styles.button} onClick={cameraScanner.close} aria-label="Tutup kamera">
                <X size={18} />
              </button>
            </div>
            {cameraScanner.error ? <div className={styles.cameraError}>{cameraScanner.error}</div> : null}
            <div className={styles.videoFrame}>
              <video ref={cameraScanner.videoRef} muted playsInline />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
