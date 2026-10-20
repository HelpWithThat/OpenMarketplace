-- AlterTable
ALTER TABLE "TaskStep" ADD COLUMN "photoProofRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskProofPhoto" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskProofPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskProofPhoto_resultId_idx" ON "TaskProofPhoto"("resultId");

-- AddForeignKey
ALTER TABLE "TaskProofPhoto" ADD CONSTRAINT "TaskProofPhoto_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TaskResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
