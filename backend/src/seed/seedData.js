import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { ensureBranch, migrateStaffToBranch } from "../utils/branchHelper.js";

export const seedData = async () => {
  try {
    console.log("🌱 Seed data yoxlanılır...");

    // Role-ləri yoxla və yarat
    const roles = [
      { name: "superadmin", isCore: true },
      { name: "admin", isCore: true },
      { name: "reception", isCore: true },
      { name: "ismayilliadmin", isCore: true },
      { name: "ismayilliseller", isCore: true },
    ];

    for (const roleData of roles) {
      const existingRole = await prisma.role.findFirst({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await prisma.role.create({
          data: roleData,
        });
        console.log(`✅ Role yaradıldı: ${roleData.name} (isCore: ${roleData.isCore})`);
      } else {
        // Əgər rol mövcuddursa, isCore dəyərini yenilə
        if (existingRole.isCore !== roleData.isCore) {
          await prisma.role.update({
            where: { id: existingRole.id },
            data: { isCore: roleData.isCore },
          });
          console.log(`🔄 Role yeniləndi: ${roleData.name} (isCore: ${existingRole.isCore} → ${roleData.isCore})`);
        } else {
          console.log(`ℹ️  Role artıq mövcuddur: ${roleData.name} (isCore: ${roleData.isCore})`);
        }
      }
    }

    // Superadmin role-ünü tap
    const superadminRole = await prisma.role.findFirst({
      where: { name: "superadmin" },
    });

    if (!superadminRole) {
      console.error("❌ Superadmin role tapılmadı!");
      return;
    }

    // Default staff yoxla və yarat
    const defaultEmail = "elxanxanlarov@gmail.com";
    const defaultPassword = "admin123"; // Default şifrə

    const existingStaff = await prisma.staff.findFirst({
      where: { email: defaultEmail },
    });

    if (!existingStaff) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.staff.create({
        data: {
          name: "Elxan",
          surName: "Xanlarov",
          email: defaultEmail,
          password: hashedPassword,
          isActive: true,
          roleId: superadminRole.id,
        },
      });
      console.log(`✅ Default staff yaradıldı: ${defaultEmail}`);
      console.log(`   Şifrə: ${defaultPassword}`);
    } else {
      console.log(`ℹ️  Staff artıq mövcuddur: ${defaultEmail}`);
    }

    // Credit term-ləri yoxla və yarat
    const creditTerms = [
      { months: 2, interestRate: 4.3, description: "2 ay üçün - 4,3%" },
      { months: 3, interestRate: 5.3, description: "3 ay üçün - 5,3%" },
      { months: 6, interestRate: 9.3, description: "6 ay üçün - 9,3%" },
      { months: 9, interestRate: 12.3, description: "9 ay üçün - 12,3%" },
      { months: 12, interestRate: 15.3, description: "12 ay üçün - 15,3%" },
    ];

    for (const termData of creditTerms) {
      const existingTerm = await prisma.creditterm.findFirst({
        where: { months: termData.months },
      });

      if (!existingTerm) {
        await prisma.creditterm.create({
          data: {
            months: termData.months,
            interestRate: new Prisma.Decimal(termData.interestRate),
            description: termData.description,
            isActive: true,
          },
        });
        console.log(`✅ Credit term yaradıldı: ${termData.description}`);
      } else {
        console.log(`ℹ️  Credit term artıq mövcuddur: ${termData.description}`);
      }
    }

    // Filiallar artıq avtomatik yaradılmır, UI vasitəsilə idarə olunur.

    console.log("✅ Seed data tamamlandı!");
  } catch (error) {
    console.error("❌ Seed data xətası:", error);
  }
};

