/** Termal çek kağız ölçüsü — default: 80mm POS (EKONOM standart) */
export const RECEIPT_PAPER_PRESETS = {
  normal: {
    id: 'normal',
    label: 'Normal (80mm)',
    widthMm: 80,
    bodyWidthMm: 72,
    fontSizePx: 11,
    titleFontSizePx: 14,
    tableFontSizePx: 10,
    marginMm: 2,
    heightMm: null,
  },
  narrow: {
    id: 'narrow',
    label: 'Dar (58mm)',
    widthMm: 58,
    bodyWidthMm: 52,
    fontSizePx: 9,
    titleFontSizePx: 12,
    tableFontSizePx: 8,
    marginMm: 2,
    heightMm: null,
  },
  large: {
    id: 'large',
    label: 'Böyük şrift (80mm)',
    widthMm: 80,
    bodyWidthMm: 72,
    fontSizePx: 13,
    titleFontSizePx: 16,
    tableFontSizePx: 11,
    marginMm: 2,
    heightMm: null,
  },
};

export const DEFAULT_RECEIPT_PAPER_PRESET_ID = 'normal';

export function getPaperPreset(presetId) {
  return RECEIPT_PAPER_PRESETS[presetId] || RECEIPT_PAPER_PRESETS[DEFAULT_RECEIPT_PAPER_PRESET_ID];
}

export function buildPaperConfig(presetId, custom = {}) {
  const preset = getPaperPreset(presetId);
  if (presetId !== 'custom') {
    return { ...preset };
  }
  return {
    id: 'custom',
    label: 'Xüsusi',
    widthMm: Number(custom.widthMm) || 80,
    bodyWidthMm: Number(custom.bodyWidthMm) || Math.max(Number(custom.widthMm) - 8, 52),
    fontSizePx: Number(custom.fontSizePx) || 11,
    titleFontSizePx: Number(custom.titleFontSizePx) || 14,
    tableFontSizePx: Number(custom.tableFontSizePx) || 10,
    marginMm: Number(custom.marginMm) ?? 2,
    heightMm: custom.heightMm === '' || custom.heightMm == null ? null : Number(custom.heightMm),
  };
}

export function getPrintPageStyle(paper) {
  const pageSize = paper.heightMm
    ? `${paper.widthMm}mm ${paper.heightMm}mm`
    : `${paper.widthMm}mm auto`;
  return `
    @page { size: ${pageSize}; margin: ${paper.marginMm}mm; }
    @media print {
      body { margin: 0; padding: 0; }
    }
  `;
}
