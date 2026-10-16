-- CreateEnum
CREATE TYPE "UserRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "user_create_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "notes" TEXT,
    "status" "UserRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,

    CONSTRAINT "user_create_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_create_requests_status_idx" ON "user_create_requests"("status");

-- CreateIndex
CREATE INDEX "user_create_requests_requestedById_idx" ON "user_create_requests"("requestedById");

-- AddForeignKey
ALTER TABLE "user_create_requests" ADD CONSTRAINT "user_create_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_create_requests" ADD CONSTRAINT "user_create_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
