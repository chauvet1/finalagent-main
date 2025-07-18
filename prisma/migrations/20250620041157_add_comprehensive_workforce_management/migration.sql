-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('ORIENTATION', 'SAFETY', 'TECHNICAL', 'COMPLIANCE', 'SOFT_SKILLS', 'CERTIFICATION_PREP', 'REFRESHER', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM ('SECURITY_LICENSE', 'FIRST_AID', 'CPR', 'FIRE_SAFETY', 'TECHNICAL', 'PROFESSIONAL', 'REGULATORY', 'INTERNAL');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'PENDING_RENEWAL');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_REVIEW', 'INVALID');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('QUARTERLY', 'ANNUAL', 'PROBATIONARY', 'SPECIAL', 'EXIT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkforceAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EARLY_DEPARTURE', 'SICK_LEAVE', 'VACATION', 'PERSONAL_LEAVE', 'UNPAID_LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TrainingType" NOT NULL,
    "category" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "validity_period" INTEGER,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_enrollments" (
    "id" TEXT NOT NULL,
    "training_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "enrolled_by" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_completions" (
    "id" TEXT NOT NULL,
    "training_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "certificate_url" TEXT,
    "notes" TEXT,

    CONSTRAINT "training_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assessments" (
    "id" TEXT NOT NULL,
    "training_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "time_limit" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "timeSpent" INTEGER NOT NULL,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issuing_body" TEXT NOT NULL,
    "type" "CertificationType" NOT NULL,
    "validity_period" INTEGER,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_certifications" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "obtained_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "certificate_number" TEXT,
    "certificate_url" TEXT,
    "status" "CertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "agent_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessments" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "assessed_by" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "valid_until" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "feedback" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "conducted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clock_in" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "break_start" TIMESTAMP(3),
    "break_end" TIMESTAMP(3),
    "total_hours" DOUBLE PRECISION,
    "overtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "WorkforceAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "estimated_duration" INTEGER,
    "instructions" JSONB NOT NULL DEFAULT '[]',
    "resources" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_completions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainings_type_idx" ON "trainings"("type");

-- CreateIndex
CREATE INDEX "trainings_category_idx" ON "trainings"("category");

-- CreateIndex
CREATE INDEX "trainings_is_required_idx" ON "trainings"("is_required");

-- CreateIndex
CREATE INDEX "trainings_is_active_idx" ON "trainings"("is_active");

-- CreateIndex
CREATE INDEX "trainings_created_at_idx" ON "trainings"("created_at");

-- CreateIndex
CREATE INDEX "training_enrollments_training_id_idx" ON "training_enrollments"("training_id");

-- CreateIndex
CREATE INDEX "training_enrollments_agent_id_idx" ON "training_enrollments"("agent_id");

-- CreateIndex
CREATE INDEX "training_enrollments_status_idx" ON "training_enrollments"("status");

-- CreateIndex
CREATE INDEX "training_enrollments_due_date_idx" ON "training_enrollments"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "training_enrollments_training_id_agent_id_key" ON "training_enrollments"("training_id", "agent_id");

-- CreateIndex
CREATE INDEX "training_completions_training_id_idx" ON "training_completions"("training_id");

-- CreateIndex
CREATE INDEX "training_completions_agent_id_idx" ON "training_completions"("agent_id");

-- CreateIndex
CREATE INDEX "training_completions_passed_idx" ON "training_completions"("passed");

-- CreateIndex
CREATE INDEX "training_completions_completed_at_idx" ON "training_completions"("completed_at");

-- CreateIndex
CREATE INDEX "training_completions_expires_at_idx" ON "training_completions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "training_completions_training_id_agent_id_key" ON "training_completions"("training_id", "agent_id");

-- CreateIndex
CREATE INDEX "training_assessments_training_id_idx" ON "training_assessments"("training_id");

-- CreateIndex
CREATE INDEX "training_assessments_is_active_idx" ON "training_assessments"("is_active");

-- CreateIndex
CREATE INDEX "assessment_attempts_assessment_id_idx" ON "assessment_attempts"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_agent_id_idx" ON "assessment_attempts"("agent_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_passed_idx" ON "assessment_attempts"("passed");

-- CreateIndex
CREATE INDEX "assessment_attempts_completed_at_idx" ON "assessment_attempts"("completed_at");

-- CreateIndex
CREATE INDEX "certifications_type_idx" ON "certifications"("type");

-- CreateIndex
CREATE INDEX "certifications_is_active_idx" ON "certifications"("is_active");

-- CreateIndex
CREATE INDEX "agent_certifications_agent_id_idx" ON "agent_certifications"("agent_id");

-- CreateIndex
CREATE INDEX "agent_certifications_certification_id_idx" ON "agent_certifications"("certification_id");

-- CreateIndex
CREATE INDEX "agent_certifications_status_idx" ON "agent_certifications"("status");

-- CreateIndex
CREATE INDEX "agent_certifications_expires_at_idx" ON "agent_certifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_certifications_agent_id_certification_id_key" ON "agent_certifications"("agent_id", "certification_id");

-- CreateIndex
CREATE INDEX "skill_assessments_agent_id_idx" ON "skill_assessments"("agent_id");

-- CreateIndex
CREATE INDEX "skill_assessments_skill_idx" ON "skill_assessments"("skill");

-- CreateIndex
CREATE INDEX "skill_assessments_level_idx" ON "skill_assessments"("level");

-- CreateIndex
CREATE INDEX "skill_assessments_assessed_at_idx" ON "skill_assessments"("assessed_at");

-- CreateIndex
CREATE INDEX "skill_assessments_status_idx" ON "skill_assessments"("status");

-- CreateIndex
CREATE INDEX "performance_reviews_agent_id_idx" ON "performance_reviews"("agent_id");

-- CreateIndex
CREATE INDEX "performance_reviews_reviewer_id_idx" ON "performance_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "performance_reviews_period_idx" ON "performance_reviews"("period");

-- CreateIndex
CREATE INDEX "performance_reviews_type_idx" ON "performance_reviews"("type");

-- CreateIndex
CREATE INDEX "performance_reviews_status_idx" ON "performance_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_agent_id_period_type_key" ON "performance_reviews"("agent_id", "period", "type");

-- CreateIndex
CREATE INDEX "attendance_records_agent_id_idx" ON "attendance_records"("agent_id");

-- CreateIndex
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");

-- CreateIndex
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_agent_id_date_key" ON "attendance_records"("agent_id", "date");

-- CreateIndex
CREATE INDEX "onboarding_tasks_category_idx" ON "onboarding_tasks"("category");

-- CreateIndex
CREATE INDEX "onboarding_tasks_order_idx" ON "onboarding_tasks"("order");

-- CreateIndex
CREATE INDEX "onboarding_tasks_is_required_idx" ON "onboarding_tasks"("is_required");

-- CreateIndex
CREATE INDEX "onboarding_tasks_is_active_idx" ON "onboarding_tasks"("is_active");

-- CreateIndex
CREATE INDEX "onboarding_completions_task_id_idx" ON "onboarding_completions"("task_id");

-- CreateIndex
CREATE INDEX "onboarding_completions_agent_id_idx" ON "onboarding_completions"("agent_id");

-- CreateIndex
CREATE INDEX "onboarding_completions_status_idx" ON "onboarding_completions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_completions_task_id_agent_id_key" ON "onboarding_completions"("task_id", "agent_id");

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_enrolled_by_fkey" FOREIGN KEY ("enrolled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assessments" ADD CONSTRAINT "training_assessments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "training_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_certifications" ADD CONSTRAINT "agent_certifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_certifications" ADD CONSTRAINT "agent_certifications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_certifications" ADD CONSTRAINT "agent_certifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_completions" ADD CONSTRAINT "onboarding_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "onboarding_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_completions" ADD CONSTRAINT "onboarding_completions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_completions" ADD CONSTRAINT "onboarding_completions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
