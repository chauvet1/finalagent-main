-- Migration: Add PRD Requirements
-- This migration adds all the missing tables and functionality based on the PRD requirements

-- Create new enums for additional functionality
CREATE TYPE "QRCodeType" AS ENUM ('CHECKIN', 'CHECKOUT', 'PATROL_POINT', 'EMERGENCY');
CREATE TYPE "GeofenceType" AS ENUM ('SITE_BOUNDARY', 'PATROL_AREA', 'RESTRICTED_ZONE', 'EMERGENCY_ZONE');
CREATE TYPE "ViolationType" AS ENUM ('OUTSIDE_BOUNDARY', 'UNAUTHORIZED_AREA', 'MISSED_PATROL', 'EMERGENCY_BREACH');
CREATE TYPE "ClockMethod" AS ENUM ('MANUAL', 'QR_CODE', 'GPS', 'BIOMETRIC');
CREATE TYPE "AttendanceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INCOMPLETE', 'DISPUTED');
CREATE TYPE "GroupType" AS ENUM ('GENERAL', 'EMERGENCY', 'SITE_SPECIFIC', 'DEPARTMENT', 'PROJECT');
CREATE TYPE "GroupMemberRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
CREATE TYPE "CommunicationType" AS ENUM ('MESSAGE', 'ANNOUNCEMENT', 'ALERT', 'EMERGENCY', 'INSTRUCTION');
CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');
CREATE TYPE "RequestType" AS ENUM ('ADDITIONAL_SECURITY', 'EMERGENCY_RESPONSE', 'MAINTENANCE', 'INCIDENT_REPORT', 'SERVICE_CHANGE', 'CONSULTATION', 'OTHER');
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');
CREATE TYPE "UrgencyLevel" AS ENUM ('NORMAL', 'URGENT', 'CRITICAL', 'EMERGENCY');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'COMPLETED', 'APPROVED');
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "AssessmentType" AS ENUM ('INITIAL', 'PERIODIC', 'CERTIFICATION', 'INCIDENT_BASED', 'PROMOTION');

-- QR Code Management
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "QRCodeType" NOT NULL DEFAULT 'CHECKIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScan" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- QR Code Scan Tracking
CREATE TABLE "qr_code_scans" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deviceInfo" JSONB,
    "shiftId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_code_scans_pkey" PRIMARY KEY ("id")
);

-- Geofencing
CREATE TABLE "geofences" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GeofenceType" NOT NULL DEFAULT 'SITE_BOUNDARY',
    "coordinates" JSONB NOT NULL,
    "radius" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- Geofence Violations
CREATE TABLE "geofence_violations" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "shiftId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geofence_violations_pkey" PRIMARY KEY ("id")
);

-- Geofence Validations
CREATE TABLE "geofence_validations" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "attendanceId" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geofence_validations_pkey" PRIMARY KEY ("id")
);

-- Communication Groups
CREATE TABLE "communication_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'GENERAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_groups_pkey" PRIMARY KEY ("id")
);

-- Communication Group Members
CREATE TABLE "communication_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_group_members_pkey" PRIMARY KEY ("id")
);

-- Communications/Messages
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL DEFAULT 'MESSAGE',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "groupId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "attachments" JSONB,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- Message Recipients
CREATE TABLE "message_recipients" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_recipients_pkey" PRIMARY KEY ("id")
);

-- Communication Attachments
CREATE TABLE "communication_attachments" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_attachments_pkey" PRIMARY KEY ("id")
);

-- Attendance Management
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "shiftId" TEXT,
    "siteId" TEXT,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockInLatitude" DOUBLE PRECISION,
    "clockInLongitude" DOUBLE PRECISION,
    "clockInMethod" "ClockMethod" NOT NULL DEFAULT 'MANUAL',
    "clockInQRCode" TEXT,
    "clockInNotes" TEXT,
    "clockOutTime" TIMESTAMP(3),
    "clockOutLatitude" DOUBLE PRECISION,
    "clockOutLongitude" DOUBLE PRECISION,
    "clockOutMethod" "ClockMethod",
    "clockOutQRCode" TEXT,
    "clockOutNotes" TEXT,
    "totalHours" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "breaks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- Client Requests
CREATE TABLE "client_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" "RequestType" NOT NULL,
    "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedService" TEXT,
    "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'NORMAL',
    "requestedDate" TIMESTAMP(3),
    "requestedTime" TEXT,
    "duration" INTEGER,
    "assignedToId" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "actionTaken" TEXT,
    "completedAt" TIMESTAMP(3),
    "estimatedCost" DECIMAL(65,30),
    "actualCost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_requests_pkey" PRIMARY KEY ("id")
);

-- Performance Reviews
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "punctualityScore" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "overallRating" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT,
    "areasForImprovement" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- Skill Assessments
CREATE TABLE "skill_assessments" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "score" DOUBLE PRECISION,
    "assessmentType" "AssessmentType" NOT NULL DEFAULT 'PERIODIC',
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes"("code");
CREATE UNIQUE INDEX "communication_group_members_groupId_userId_key" ON "communication_group_members"("groupId", "userId");
CREATE UNIQUE INDEX "message_recipients_communicationId_userId_key" ON "message_recipients"("communicationId", "userId");

-- Add foreign key constraints
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_code_scans" ADD CONSTRAINT "qr_code_scans_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_code_scans" ADD CONSTRAINT "qr_code_scans_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_code_scans" ADD CONSTRAINT "qr_code_scans_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "geofences" ADD CONSTRAINT "geofences_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "geofence_violations" ADD CONSTRAINT "geofence_violations_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "geofences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "geofence_violations" ADD CONSTRAINT "geofence_violations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "geofence_violations" ADD CONSTRAINT "geofence_violations_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "geofence_validations" ADD CONSTRAINT "geofence_validations_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "geofences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "geofence_validations" ADD CONSTRAINT "geofence_validations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "geofence_validations" ADD CONSTRAINT "geofence_validations_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "communication_groups" ADD CONSTRAINT "communication_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_group_members" ADD CONSTRAINT "communication_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "communication_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_group_members" ADD CONSTRAINT "communication_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "communication_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance" ADD CONSTRAINT "attendance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_requests" ADD CONSTRAINT "client_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_requests" ADD CONSTRAINT "client_requests_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_requests" ADD CONSTRAINT "client_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
