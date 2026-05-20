/** Termal etiket ölçüləri — default: ETIKET 30×20 mm */
export const BARCODE_LABEL_PRESETS = {
  etiket: {
    id: 'etiket',
    label: 'ETİKET (30,0 × 20,0 mm)',
    widthMm: 30,
    heightMm: 20,
    labelWidthMm: 28,
    labelHeightMm: 18,
    paddingMm: 1,
    storeFontPx: 4.5,
    nameFontPx: 5.5,
    priceFontPx: 6.5,
    barcodeHeight: 38,
    barcodeWidth: 1.4,
    barcodeFontSize: 9,
    barcodeAreaMm: 8,
  },
  twoByFour: {
    id: 'twoByFour',
    label: '2 × 4 (50,8 × 101,6 mm)',
    widthMm: 50.8,
    heightMm: 101.6,
    labelWidthMm: 48,
    labelHeightMm: 98,
    paddingMm: 2,
    storeFontPx: 8,
    nameFontPx: 11,
    priceFontPx: 12,
    barcodeHeight: 70,
    barcodeWidth: 2,
    barcodeFontSize: 12,
    barcodeAreaMm: 35,
  },
  user: {
    id: 'user',
    label: 'USER (76,2 × 101,6 mm)',
    widthMm: 76.2,
    heightMm: 101.6,
    labelWidthMm: 72,
    labelHeightMm: 98,
    paddingMm: 2,
    storeFontPx: 9,
    nameFontPx: 12,
    priceFontPx: 14,
    barcodeHeight: 80,
    barcodeWidth: 2.2,
    barcodeFontSize: 13,
    barcodeAreaMm: 40,
  },
};

export const DEFAULT_BARCODE_LABEL_PRESET_ID = 'etiket';

export function getBarcodeLabelPreset(presetId) {
  return BARCODE_LABEL_PRESETS[presetId] || BARCODE_LABEL_PRESETS[DEFAULT_BARCODE_LABEL_PRESET_ID];
}

export function buildBarcodeLabelConfig(presetId, custom = {}) {
  if (presetId !== 'custom') {
    return { ...getBarcodeLabelPreset(presetId) };
  }

  const widthMm = Number(custom.widthMm) || 30;
  const heightMm = Number(custom.heightMm) || 20;
  const scale = widthMm / 30;

  return {
    id: 'custom',
    label: 'Xüsusi ölçü',
    widthMm,
    heightMm,
    labelWidthMm: Math.max(widthMm - 2, 20),
    labelHeightMm: Math.max(heightMm - 2, 15),
    paddingMm: 1,
    storeFontPx: 4.5 * scale,
    nameFontPx: 5.5 * scale,
    priceFontPx: 6.5 * scale,
    barcodeHeight: Math.round(38 * scale),
    barcodeWidth: 1.4 * scale,
    barcodeFontSize: Math.round(9 * scale),
    barcodeAreaMm: Math.max(8 * scale, 6),
  };
}

export function getBarcodeLabelPageStyle(paper) {
  return `
    @page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
    }
  `;
}

/** Ekran önizləməsi üçün mm → px */
export function labelPreviewScale(paper) {
  return Math.min(280 / paper.widthMm, 360 / paper.heightMm, 8);
}
