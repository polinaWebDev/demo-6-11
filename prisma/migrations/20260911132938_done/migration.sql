-- CreateEnum
CREATE TYPE "Course" AS ENUM ('alorithms', 'webdesign', 'databases');

-- CreateEnum
CREATE TYPE "Payment" AS ENUM ('cash', 'phone_transfer');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('new', 'in_progress', 'completed');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "course" "Course" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "payment" "Payment" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'new',
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
