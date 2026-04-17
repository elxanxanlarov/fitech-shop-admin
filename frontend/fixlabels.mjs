import { readFileSync, writeFileSync } from 'fs';

// ── CentralWarehouse.jsx ─────────────────────────────────────────────────────
{
    const f = 'src/components/panel/CentralWarehouse.jsx';
    let c = readFileSync(f, 'utf8');

    // 1. Simplify unitLabel to just wrap unitSingular
    c = c.replace(
        /const unitLabel = \(product\) => \{[\s\S]*?unitType\) \|\| product\.unitType \|\| '[^']*';\s*\};/,
        `const unitLabel = (product) => unitSingular(product?.unitType);`
    );

    // 2. Product-name cell: "1 Qutu = {ppb} {unitLabel(product)}" → containerLabel
    c = c.replace(
        '1 Qutu = {ppb} {unitLabel(product)}',
        '1 {containerLabel(product.unitType)} = {ppb} {unitSingular(product.unitType)}'
    );

    // 3. Transfer-panel item card labels: "Qutu" label → containerLabel
    c = c.replace(/label="Qutu"/g, 'label={containerLabel(item.unitType)}');
    c = c.replace(/label="Ədəd"/g, 'label={unitSingular(item.unitType)}');

    // 4. Transfer panel remaining card: "qu." / "əd." raw strings → formatStockShort
    // (these are inside the IIFE already using remB/remP — leave as-is, they're fine)

    writeFileSync(f, c, 'utf8');
    console.log('CentralWarehouse done');
}

// ── StockTransferForm.jsx ────────────────────────────────────────────────────
{
    const f = 'src/components/forms/StockTransferForm.jsx';
    let c = readFileSync(f, 'utf8');

    // Same label replacements in transfer form
    c = c.replace(/label=\{t\('BOX'\) \|\| 'Qutu'\}/g, 'label={containerLabel(item.unitType)}');
    c = c.replace(/label=\{t\('PIECE'\) \|\| 'Ədəd'\}/g, 'label={unitSingular(item.unitType)}');

    writeFileSync(f, c, 'utf8');
    console.log('StockTransferForm done');
}
