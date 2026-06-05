-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'invited', 'active', 'rejected', 'disabled');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'declined', 'failed');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('pending', 'active', 'rejected', 'disabled');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('provider', 'practice', 'careCoordinator', 'acoAdmin', 'clientAdmin', 'superAdmin', 'developer');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('global', 'organization', 'aco', 'practice', 'provider');

-- CreateEnum
CREATE TYPE "ReferenceSource" AS ENUM ('manual', 'databricks');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "website" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_number" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'pending',
    "address" TEXT,
    "company_bio" TEXT,
    "started_year" INTEGER,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_approval_requests" (
    "id" UUID NOT NULL,
    "organization_name" TEXT NOT NULL,
    "requested_by_email" TEXT NOT NULL,
    "requested_by_auth_user_id" UUID,
    "requested_payload" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_approval_requests" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID,
    "email" TEXT NOT NULL,
    "organization_id" UUID,
    "requested_roles" JSONB NOT NULL,
    "requested_scope" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "organization_id" UUID,
    "invited_by" UUID NOT NULL,
    "assigned_roles" JSONB NOT NULL,
    "assigned_scope" JSONB NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" UUID,
    "organization_id" UUID,
    "assigned_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "external_reference_id" TEXT,
    "source" "ReferenceSource" NOT NULL DEFAULT 'manual',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "practice_id" UUID,
    "name" TEXT NOT NULL,
    "npi" TEXT,
    "external_reference_id" TEXT,
    "source" "ReferenceSource" NOT NULL DEFAULT 'manual',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_coordinator_assignments" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "practice_id" UUID,
    "provider_id" UUID,
    "assigned_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "care_coordinator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_profile_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "organization_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_auth_user_id_key" ON "profiles"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organization_approval_requests_status_idx" ON "organization_approval_requests"("status");

-- CreateIndex
CREATE INDEX "organization_approval_requests_requested_by_email_idx" ON "organization_approval_requests"("requested_by_email");

-- CreateIndex
CREATE INDEX "user_approval_requests_email_idx" ON "user_approval_requests"("email");

-- CreateIndex
CREATE INDEX "user_approval_requests_status_idx" ON "user_approval_requests"("status");

-- CreateIndex
CREATE INDEX "user_approval_requests_organization_id_idx" ON "user_approval_requests"("organization_id");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "invites_status_idx" ON "invites"("status");

-- CreateIndex
CREATE INDEX "invites_organization_id_idx" ON "invites"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_role_assignments_profile_id_idx" ON "user_role_assignments"("profile_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_id_idx" ON "user_role_assignments"("role_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_scope_type_scope_id_idx" ON "user_role_assignments"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_organization_id_idx" ON "user_role_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "practices_organization_id_idx" ON "practices"("organization_id");

-- CreateIndex
CREATE INDEX "practices_external_reference_id_idx" ON "practices"("external_reference_id");

-- CreateIndex
CREATE INDEX "providers_organization_id_idx" ON "providers"("organization_id");

-- CreateIndex
CREATE INDEX "providers_practice_id_idx" ON "providers"("practice_id");

-- CreateIndex
CREATE INDEX "providers_npi_idx" ON "providers"("npi");

-- CreateIndex
CREATE INDEX "providers_external_reference_id_idx" ON "providers"("external_reference_id");

-- CreateIndex
CREATE INDEX "care_coordinator_assignments_profile_id_idx" ON "care_coordinator_assignments"("profile_id");

-- CreateIndex
CREATE INDEX "care_coordinator_assignments_organization_id_idx" ON "care_coordinator_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "care_coordinator_assignments_practice_id_idx" ON "care_coordinator_assignments"("practice_id");

-- CreateIndex
CREATE INDEX "care_coordinator_assignments_provider_id_idx" ON "care_coordinator_assignments"("provider_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_profile_id_idx" ON "audit_logs"("actor_profile_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_approval_requests" ADD CONSTRAINT "organization_approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_approval_requests" ADD CONSTRAINT "user_approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_approval_requests" ADD CONSTRAINT "user_approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_coordinator_assignments" ADD CONSTRAINT "care_coordinator_assignments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_coordinator_assignments" ADD CONSTRAINT "care_coordinator_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_coordinator_assignments" ADD CONSTRAINT "care_coordinator_assignments_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_coordinator_assignments" ADD CONSTRAINT "care_coordinator_assignments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_coordinator_assignments" ADD CONSTRAINT "care_coordinator_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
