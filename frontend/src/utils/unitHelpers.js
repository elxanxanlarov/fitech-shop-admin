/**
 * unitHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central place for all unit-type label & calculation helpers.
 *
 * unitType values used across the codebase:
 *   PIECE     – individual items (ədəd)          – no box concept
 *   BOX       – items sold in boxes (qutu)        – piecesPerBox = qty per box
 *   METER     – length in meters (metr)           – piecesPerBox = metres per roll/package
 *   LITER     – volume in litres (litr)           – piecesPerBox = litres per bottle/package
 *   KILOGRAM  – weight in kg (kq)                 – piecesPerBox = kg per bag/package
 */

/** The singular unit label (e.g. "Ədəd", "Metr", "Litr", "Kq") */
export function unitSingular(unitType) {
    switch (unitType) {
        case 'BOX':       return 'Ədəd';
        case 'METER':     return 'Metr';
        case 'LITER':     return 'Litr';
        case 'KILOGRAM':  return 'Kq';
        case 'PIECE':
        default:          return 'Ədəd';
    }
}

/**
 * The "container" label — what holds multiple units.
 * e.g. for BOX → "Qutu", for METER → "Rulon/Paket", etc.
 */
export function containerLabel(unitType) {
    switch (unitType) {
        case 'BOX':       return 'Qutu';
        case 'METER':     return 'Paket';
        case 'LITER':     return 'Şüşə';
        case 'KILOGRAM':  return 'Çuval';
        default:          return 'Paket';
    }
}

/**
 * Short readable label for a stock number.
 * Returns "{count} Ədəd" / "{count} Metr" etc.
 */
export function stockLabel(count, unitType) {
    return `${count} ${unitSingular(unitType)}`;
}

/**
 * Does this product use the container (box/roll/bottle…) concept?
 * True when piecesPerBox is set AND > 1.
 */
export function hasContainer(product) {
    const ppb = product?.piecesPerBox;
    return ppb && parseInt(ppb) > 1;
}

/**
 * Given a product and a raw piece count, return a human-readable
 * box+piece breakdown string.
 *
 * Example (BOX, ppb=12, count=25):  "2 Qutu + 1 Ədəd"
 * Example (METER, ppb=50, count=75): "1 Rulon + 25 Metr"
 * Example (PIECE, ppb=null, count=13): "13 Ədəd"
 */
export function formatStock(count, unitType, piecesPerBox) {
    const ppb = parseInt(piecesPerBox) || 1;
    const unit = unitSingular(unitType);

    if (!piecesPerBox || ppb <= 1) {
        return `${count} ${unit}`;
    }

    const containers = Math.floor(count / ppb);
    const remainder  = count % ppb;
    const cLabel     = containerLabel(unitType);

    if (containers === 0) return `${remainder} ${unit}`;
    if (remainder  === 0) return `${containers} ${cLabel}`;
    return `${containers} ${cLabel} + ${remainder} ${unit}`;
}

/**
 * Short version used in compact table cells.
 * e.g. "2 qu. + 1 əd." / "1 rul. + 25 m."
 */
export function formatStockShort(count, unitType, piecesPerBox) {
    const ppb = parseInt(piecesPerBox) || 1;

    const SHORT_UNIT = {
        PIECE:    'əd.',
        BOX:      'əd.',
        METER:    'm.',
        LITER:    'l.',
        KILOGRAM: 'kq.',
    };
    const SHORT_CONTAINER = {
        BOX:      'qu.',
        METER:    'pak.',
        LITER:    'şüş.',
        KILOGRAM: 'çuv.',
    };

    const u  = SHORT_UNIT[unitType]      || 'əd.';
    const cu = SHORT_CONTAINER[unitType] || 'pak.';

    if (!piecesPerBox || ppb <= 1) return `${count} ${u}`;

    const containers = Math.floor(count / ppb);
    const remainder  = count % ppb;

    if (containers === 0) return `${remainder} ${u}`;
    if (remainder  === 0) return `${containers} ${cu}`;
    return `${containers} ${cu} + ${remainder} ${u}`;
}
