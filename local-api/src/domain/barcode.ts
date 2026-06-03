export function computeEan13CheckDigit(first12Digits: string): string {
  if (!/^\d{12}$/.test(first12Digits)) {
    throw new Error('EAN-13 membutuhkan 12 digit awal.');
  }

  const sum = first12Digits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  return String((10 - (sum % 10)) % 10);
}

export function generateBarcodeCandidate(): string {
  const companyPrefix = '8991204';
  const payload = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const first12 = `${companyPrefix}${payload}`;

  return `${first12}${computeEan13CheckDigit(first12)}`;
}

export function generateUniqueCatalogBarcode(existingCodes: Iterable<string>): string {
  const existing = new Set(existingCodes);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generateBarcodeCandidate();
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Gagal membuat barcode unik.');
}
