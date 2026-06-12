/**
 * İstifadəçinin verdiyi firma siyahısını İsmayıllı firmaları kimi DB-yə əlavə edir.
 * Eyni adlı firma varsa skip edir; soft-deleted varsa restore edir.
 *
 * İstifadə:  node scratch/seedIsmayilliFirmas.js
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIRMAS = [
  "TARZ EMİL",
  "SƏRFƏLİ QADİN GEYİM",
  "SAMIR TIGER",
  "SAAT",
  "RS SHOPPING",
  "ROSSO CORAB",
  "RƏŞAD PABLO",
  "RAFƏDDİN STERUP BİNƏ",
  "OZZO ALT PALTARI",
  "NORD MARK KƏM KEP",
  "NAR BAKU FARİZ",
  "MÜRSƏL GUCCİ",
  "MEHDI AYAQQABI BINE",
  "LULU QADIN ŞALVAR",
  "LORD MARK",
  "KRASOVKA AĞDAMLI",
  "KONUM BİNƏ",
  "KAMAL BEBEK",
  "İNTİQAM AKULA",
  "ƏTİRÇİ",
  "ƏTİR AKSESSUAR",
  "DOLLAR STORE",
  "ÇÖL MALI",
  "BƏXTİYAR ZARA KOFTA",
  "AYAQQABI UCUZ",
  "AYAQQABI ÇİN",
  "ARAZ BINE KING",
  "ZƏFƏR OLİQARX",
  "ZARA RAMİL ŞALVAR",
];

async function main() {
  console.log(`\n🏢 ${FIRMAS.length} firma idxal edilir...\n`);

  let created = 0;
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const rawName of FIRMAS) {
    const name = rawName.trim();
    if (!name) continue;

    try {
      const existing = await prisma.ismayilliFirma.findUnique({ where: { name } });
      if (existing) {
        if (existing.deleteType !== "NONE") {
          await prisma.ismayilliFirma.update({
            where: { id: existing.id },
            data: { deleteType: "NONE" },
          });
          console.log(`  ↻  Bərpa: ${name}`);
          restored++;
        } else {
          console.log(`  ⚠️  Mövcuddur, skip: ${name}`);
          skipped++;
        }
        continue;
      }

      await prisma.ismayilliFirma.create({
        data: {
          name,
          totalDebt: 0,
          paidDebt: 0,
        },
      });
      console.log(`  ✓ Yaradıldı: ${name}`);
      created++;
    } catch (e) {
      console.log(`  ✗ Xəta (${name}):`, e.message);
      failed++;
    }
  }

  console.log("\n────────────────────────────────");
  console.log(`✓ Yaradıldı : ${created}`);
  console.log(`↻ Bərpa     : ${restored}`);
  console.log(`⚠️  Skip     : ${skipped}`);
  console.log(`✗ Xəta      : ${failed}`);
  console.log(`Cəm         : ${FIRMAS.length}`);
  console.log("────────────────────────────────\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
