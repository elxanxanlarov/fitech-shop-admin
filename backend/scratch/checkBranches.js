import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const branches = await prisma.branch.findMany();
    console.log("Branches in DB:", branches);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
