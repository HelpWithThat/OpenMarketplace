-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ON_SITE', 'REMOTE', 'WORKER_CHOICE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FIXED', 'WINDOW', 'ANYTIME');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('FIXED', 'HOURLY');

-- CreateEnum
CREATE TYPE "JobVisibility" AS ENUM ('PUBLIC', 'INVITE_ONLY', 'PAST_WORKERS_FIRST');

-- CreateEnum
CREATE TYPE "SelectionMode" AS ENUM ('REVIEW', 'INSTANT_BOOK');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('SKILL', 'TOOL', 'CERTIFICATION', 'MIN_RATING', 'BACKGROUND_CHECK');

-- CreateEnum
CREATE TYPE "TaskStepType" AS ENUM ('CHECKBOX', 'CHECK_IN', 'CHECK_OUT', 'PHOTO', 'TEXT', 'NUMBER', 'TIME', 'DATE', 'YES_NO', 'MULTIPLE_CHOICE', 'PHONE_CALL', 'SIGNATURE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('REQUEST', 'COUNTER', 'BUYER_COUNTER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'APPROVED', 'REJECTED', 'COUNTER_OFFER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'PAID', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('TRAVEL', 'PARKING', 'TOLLS', 'MATERIALS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProcessingFeePayer" AS ENUM ('PLATFORM', 'BUYER', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'STRIPE', 'PAZZIX');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'HELD', 'RELEASED', 'PAID_OUT', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('HOLD', 'RELEASE', 'REFUND', 'BUYER_FEE', 'WORKER_FEE', 'EXPENSE_REIMBURSEMENT', 'PROCESSING_FEE', 'PENALTY', 'PAYOUT');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('APPLIED', 'DISPUTED', 'UPHELD', 'REVERSED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('NOT_DONE', 'POOR_QUALITY', 'UNFAIR_PENALTY', 'PAYMENT_NOT_APPROVED', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeDecision" AS ENUM ('FULL_PAY', 'PARTIAL_PAY', 'REFUND');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'DECIDED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AlertMode" AS ENUM ('PUSH', 'DAILY_DIGEST', 'NONE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOB_MATCH', 'JOB_INVITE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'JOB_ASSIGNED', 'MESSAGE_RECEIVED', 'PAYMENT_APPROVED', 'PAYMENT_RELEASED', 'REVIEW_RECEIVED', 'DISPUTE_UPDATE');

-- CreateEnum
CREATE TYPE "ReportSubjectType" AS ENUM ('USER', 'JOB');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SCAM', 'INAPPROPRIATE', 'HARASSMENT', 'SAFETY_CONCERN', 'PROHIBITED_WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "phone" TEXT,
    "phoneVerified" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isWorker" BOOLEAN NOT NULL DEFAULT false,
    "isBuyer" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photo" TEXT,
    "bio" TEXT,
    "displayName" TEXT NOT NULL,
    "skills" TEXT[],
    "yearsExperience" INTEGER,
    "tools" TEXT[],
    "publicCity" TEXT,
    "publicZip" TEXT,
    "travelRadius" INTEGER,
    "privateBaseLat" DOUBLE PRECISION,
    "privateBaseLng" DOUBLE PRECISION,
    "availability" JSONB,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "acceptedJobs" INTEGER NOT NULL DEFAULT 0,
    "reliability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingOnTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCommunication" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wouldHireAgainPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stripeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerCertification" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "defaultAddress" TEXT,
    "defaultLat" DOUBLE PRECISION,
    "defaultLng" DOUBLE PRECISION,
    "stripeCustomerId" TEXT,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "ratingClearInstructions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingFairPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingRespect" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wouldWorkForAgainPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categories" TEXT[],
    "locationType" "LocationType" NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "scheduleType" "ScheduleType" NOT NULL,
    "startWindow" TIMESTAMP(3),
    "endWindow" TIMESTAMP(3),
    "fixedTime" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "payType" "PayType" NOT NULL,
    "fixedPrice" DOUBLE PRECISION,
    "hourlyRate" DOUBLE PRECISION,
    "maxHours" DOUBLE PRECISION,
    "openToOffers" BOOLEAN NOT NULL DEFAULT false,
    "expensesAllowed" BOOLEAN NOT NULL DEFAULT true,
    "expenseBudget" DOUBLE PRECISION,
    "visibility" "JobVisibility" NOT NULL DEFAULT 'PUBLIC',
    "selectionMode" "SelectionMode" NOT NULL DEFAULT 'REVIEW',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "RequirementType" NOT NULL,
    "value" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAttachment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSection" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TaskSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStep" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "TaskStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "showIfStepId" TEXT,
    "showIfValue" TEXT,

    CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "proposedPay" DOUBLE PRECISION,
    "proposedHours" DOUBLE PRECISION,
    "proposedSchedule" TIMESTAMP(3),
    "note" TEXT,
    "counterNote" TEXT,
    "status" "OfferStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "agreedPay" DOUBLE PRECISION NOT NULL,
    "agreedHours" DOUBLE PRECISION,
    "agreedSchedule" TIMESTAMP(3),
    "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "feeSplitBuyer" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "feeSplitWorker" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "checkInAt" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkOutAt" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "approvedHours" DOUBLE PRECISION,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'UPCOMING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "autoApproveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskResult" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "boolValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "jsonValue" JSONB,
    "signature" TEXT,
    "signerName" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskResultFile" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskResultFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptUrl" TEXT,
    "note" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "feeExempt" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSettings" (
    "id" TEXT NOT NULL,
    "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "feeSplitBuyer" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "feeSplitWorker" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "processingFeePayer" "ProcessingFeePayer" NOT NULL DEFAULT 'PLATFORM',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "laborAmount" DOUBLE PRECISION NOT NULL,
    "buyerFee" DOUBLE PRECISION NOT NULL,
    "workerFee" DOUBLE PRECISION NOT NULL,
    "platformFeeTotal" DOUBLE PRECISION NOT NULL,
    "expensesTotal" DOUBLE PRECISION NOT NULL,
    "penaltiesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buyerTotal" DOUBLE PRECISION NOT NULL,
    "workerPayout" DOUBLE PRECISION NOT NULL,
    "processingFee" DOUBLE PRECISION,
    "status" "PaymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "status" "PenaltyStatus" NOT NULL DEFAULT 'APPLIED',
    "disputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "amountHeld" DOUBLE PRECISION NOT NULL,
    "decision" "DisputeDecision",
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "appealedAt" TIMESTAMP(3),
    "appealNote" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatch" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxDistance" INTEGER,
    "minPay" DOUBLE PRECISION,
    "minRate" DOUBLE PRECISION,
    "categories" TEXT[],
    "preferredBuyerIds" TEXT[],
    "onlyPastBuyers" BOOLEAN NOT NULL DEFAULT false,
    "scheduleRules" JSONB,
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "mustMatchRequirements" BOOLEAN NOT NULL DEFAULT false,
    "alertMode" "AlertMode" NOT NULL DEFAULT 'PUSH',
    "quietHours" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "MessageThreadParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "overallStars" INTEGER NOT NULL,
    "onTime" INTEGER,
    "quality" INTEGER,
    "communication" INTEGER,
    "wouldHireAgain" BOOLEAN,
    "clearInstructions" INTEGER,
    "fairPayment" INTEGER,
    "respect" INTEGER,
    "wouldWorkForAgain" BOOLEAN,
    "comment" TEXT,
    "reply" TEXT,
    "visibleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectType" "ReportSubjectType" NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminAction" TEXT,
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");

-- CreateIndex
CREATE INDEX "WorkerProfile_publicZip_idx" ON "WorkerProfile"("publicZip");

-- CreateIndex
CREATE INDEX "WorkerProfile_averageRating_idx" ON "WorkerProfile"("averageRating");

-- CreateIndex
CREATE INDEX "WorkerCertification_workerProfileId_idx" ON "WorkerCertification"("workerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "Job_buyerId_idx" ON "Job"("buyerId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_city_idx" ON "Job"("city");

-- CreateIndex
CREATE INDEX "Job_publishedAt_idx" ON "Job"("publishedAt");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_idx" ON "JobRequirement"("jobId");

-- CreateIndex
CREATE INDEX "JobAttachment_jobId_idx" ON "JobAttachment"("jobId");

-- CreateIndex
CREATE INDEX "TaskSection_jobId_idx" ON "TaskSection"("jobId");

-- CreateIndex
CREATE INDEX "TaskSection_templateId_idx" ON "TaskSection"("templateId");

-- CreateIndex
CREATE INDEX "TaskStep_sectionId_idx" ON "TaskStep"("sectionId");

-- CreateIndex
CREATE INDEX "TaskTemplate_ownerId_idx" ON "TaskTemplate"("ownerId");

-- CreateIndex
CREATE INDEX "Offer_jobId_idx" ON "Offer"("jobId");

-- CreateIndex
CREATE INDEX "Offer_workerId_idx" ON "Offer"("workerId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_jobId_key" ON "Assignment"("jobId");

-- CreateIndex
CREATE INDEX "Assignment_workerId_idx" ON "Assignment"("workerId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "TaskResult_assignmentId_idx" ON "TaskResult"("assignmentId");

-- CreateIndex
CREATE INDEX "TaskResult_stepId_idx" ON "TaskResult"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskResult_assignmentId_stepId_key" ON "TaskResult"("assignmentId", "stepId");

-- CreateIndex
CREATE INDEX "TaskResultFile_resultId_idx" ON "TaskResultFile"("resultId");

-- CreateIndex
CREATE INDEX "ExpenseItem_assignmentId_idx" ON "ExpenseItem"("assignmentId");

-- CreateIndex
CREATE INDEX "FeeSettings_effectiveDate_idx" ON "FeeSettings"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_assignmentId_key" ON "Payment"("assignmentId");

-- CreateIndex
CREATE INDEX "Payment_assignmentId_idx" ON "Payment"("assignmentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "LedgerEntry_timestamp_idx" ON "LedgerEntry"("timestamp");

-- CreateIndex
CREATE INDEX "Penalty_assignmentId_idx" ON "Penalty"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_assignmentId_key" ON "Dispute"("assignmentId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "SmartMatch_workerId_idx" ON "SmartMatch"("workerId");

-- CreateIndex
CREATE INDEX "SmartMatch_active_idx" ON "SmartMatch"("active");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_jobId_key" ON "MessageThread"("jobId");

-- CreateIndex
CREATE INDEX "MessageThread_jobId_idx" ON "MessageThread"("jobId");

-- CreateIndex
CREATE INDEX "MessageThreadParticipant_userId_idx" ON "MessageThreadParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThreadParticipant_threadId_userId_key" ON "MessageThreadParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "Review_jobId_idx" ON "Review"("jobId");

-- CreateIndex
CREATE INDEX "Review_fromId_idx" ON "Review"("fromId");

-- CreateIndex
CREATE INDEX "Review_toId_idx" ON "Review"("toId");

-- CreateIndex
CREATE INDEX "Review_visibleAt_idx" ON "Review"("visibleAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Report_subjectId_idx" ON "Report"("subjectId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCertification" ADD CONSTRAINT "WorkerCertification_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskResult" ADD CONSTRAINT "TaskResult_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskResult" ADD CONSTRAINT "TaskResult_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TaskStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskResultFile" ADD CONSTRAINT "TaskResultFile_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TaskResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalty" ADD CONSTRAINT "Penalty_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartMatch" ADD CONSTRAINT "SmartMatch_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreadParticipant" ADD CONSTRAINT "MessageThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreadParticipant" ADD CONSTRAINT "MessageThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
