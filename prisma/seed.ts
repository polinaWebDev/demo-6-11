import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("KorokNET", 10);

  await prisma.user.upsert({
    where: { login: "Admin" },
    update: {},
    create: {
      login: "Admin",
      passwordHash,
      fullName: "Администратор портала",
      phone: "8(000)000-00-00",
      email: "admin@korochki.est",
      role: "admin",
    },
  });

  console.log("Сид-пользователь Admin/KorokNET готов");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
