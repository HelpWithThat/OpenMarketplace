-- CreateEnum
CREATE TYPE "JobPhotoKind" AS ENUM ('RECEIPT', 'ITEM', 'WORK_PROOF');

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "JobPhotoKind" NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "expenseId" TEXT,
    "resultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPhoto_jobId_idx" ON "JobPhoto"("jobId");

-- CreateIndex
CREATE INDEX "JobPhoto_ownerId_idx" ON "JobPhoto"("ownerId");

-- CreateIndex
CREATE INDEX "JobPhoto_expenseId_idx" ON "JobPhoto"("expenseId");

-- CreateIndex
CREATE INDEX "JobPhoto_resultId_idx" ON "JobPhoto"("resultId");

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "ExpenseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TaskResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "ExpensePhoto";

-- DropTable
DROP TABLE "TaskProofPhoto";

-- DropEnum
DROP TYPE "ExpensePhotoKind";
