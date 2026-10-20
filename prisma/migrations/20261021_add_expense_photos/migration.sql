-- CreateEnum
CREATE TYPE "ExpensePhotoKind" AS ENUM ('RECEIPT', 'ITEM');

-- CreateTable
CREATE TABLE "ExpensePhoto" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "kind" "ExpensePhotoKind" NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpensePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpensePhoto_expenseId_idx" ON "ExpensePhoto"("expenseId");

-- AddForeignKey
ALTER TABLE "ExpensePhoto" ADD CONSTRAINT "ExpensePhoto_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "ExpenseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
