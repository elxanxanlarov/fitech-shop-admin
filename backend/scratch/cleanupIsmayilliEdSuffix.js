import prisma from "../src/lib/prisma.js";

/**
 * Bu script bütün ismayilli mağaza məhsullarının adının sonunda olan
 * "(əd.)" / "(əd)" / "(ed.)" / "(ed)" və yalnız " əd." / " ed." suffix-lərini silir.
 *
 * Misal:
 *   "Razetka Tom Ayaqli (əd.)" → "Razetka Tom Ayaqli"
 *   "QUTU GÜL (ed.)"            → "QUTU GÜL"
 *   "Şəm (əd)"                  → "Şəm"
 *
 * QEYD: (1x8), (1x96) kimi paket göstəriciləri toxunulmaz qalır.
 *
 * İşə salınma:
 *   cd backend
 *   node scratch/cleanupIsmayilliEdSuffix.js
 */

// Sonunda boşluqla ola/olmaya bilər, suffix sonradan da bitə bilər.
// (əd.)  (əd)  (ed.)  (ed)  hər birini case-insensitive tutur.
const SUFFIX_REGEX = /\s*\((?:əd|ed)\.?\)\s*$/i;
// Sonunda yalnız " əd." kimi (parantez olmadan) gələnlər
const PLAIN_SUFFIX = /\s+(?:əd|ed)\.?\s*$/i;

function cleanName(name) {
    if (!name || typeof name !== 'string') return name;
    let out = name;
    // Birdən çox dəfə təkrarlanmış halı tutmaq üçün loop
    while (SUFFIX_REGEX.test(out) || PLAIN_SUFFIX.test(out)) {
        out = out.replace(SUFFIX_REGEX, '').replace(PLAIN_SUFFIX, '');
    }
    return out.trim();
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Ismayilli Məhsul Adları — "(əd.)" Təmizliyi');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const products = await prisma.ismayilliMagazaProduct.findMany({
        select: { id: true, name: true },
    });

    console.log(`Cəmi məhsul: ${products.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const p of products) {
        const newName = cleanName(p.name);
        if (newName !== p.name && newName.length > 0) {
            updates.push({ id: p.id, oldName: p.name, newName });
        } else {
            skippedCount++;
        }
    }

    if (updates.length === 0) {
        console.log('✓ Heç bir məhsulda "(əd.)" suffix tapılmadı. Hər şey təmizdir.\n');
        return;
    }

    console.log(`Yeniləniləcək məhsul: ${updates.length}\n`);
    console.log('Nümunələr (ilk 10):');
    updates.slice(0, 10).forEach((u, i) => {
        console.log(`  ${i + 1}. "${u.oldName}"`);
        console.log(`     → "${u.newName}"`);
    });
    if (updates.length > 10) console.log(`  ... və daha ${updates.length - 10} məhsul\n`);
    else console.log('');

    // Batch update — Prisma transaction
    console.log('Yenilənir...');
    for (const u of updates) {
        try {
            await prisma.ismayilliMagazaProduct.update({
                where: { id: u.id },
                data: { name: u.newName },
            });
            updatedCount++;
        } catch (err) {
            console.error(`  ✗ Xəta: "${u.oldName}" yenilənə bilmədi:`, err.message);
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✓ Yeniləndi:  ${updatedCount}`);
    console.log(`  ─ Skip:        ${skippedCount}`);
    console.log(`  Σ Cəmi:        ${products.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch((e) => {
        console.error('Skript xəta ilə bitdi:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
