-- CreateIndex
CREATE INDEX "agents_employment_status_idx" ON "agents"("employment_status");

-- CreateIndex
CREATE INDEX "agents_hire_date_idx" ON "agents"("hire_date");

-- CreateIndex
CREATE INDEX "agents_created_at_idx" ON "agents"("created_at");

-- CreateIndex
CREATE INDEX "attendance_shift_id_idx" ON "attendance"("shift_id");

-- CreateIndex
CREATE INDEX "attendance_agent_id_idx" ON "attendance"("agent_id");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE INDEX "attendance_clock_in_time_idx" ON "attendance"("clock_in_time");

-- CreateIndex
CREATE INDEX "attendance_clock_out_time_idx" ON "attendance"("clock_out_time");

-- CreateIndex
CREATE INDEX "attendance_created_at_idx" ON "attendance"("created_at");

-- CreateIndex
CREATE INDEX "location_tracking_agent_id_idx" ON "location_tracking"("agent_id");

-- CreateIndex
CREATE INDEX "location_tracking_shift_id_idx" ON "location_tracking"("shift_id");

-- CreateIndex
CREATE INDEX "location_tracking_timestamp_idx" ON "location_tracking"("timestamp");

-- CreateIndex
CREATE INDEX "location_tracking_created_at_idx" ON "location_tracking"("created_at");

-- CreateIndex
CREATE INDEX "reports_shift_id_idx" ON "reports"("shift_id");

-- CreateIndex
CREATE INDEX "reports_site_id_idx" ON "reports"("site_id");

-- CreateIndex
CREATE INDEX "reports_agent_id_idx" ON "reports"("agent_id");

-- CreateIndex
CREATE INDEX "reports_report_type_idx" ON "reports"("report_type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_priority_idx" ON "reports"("priority");

-- CreateIndex
CREATE INDEX "reports_submitted_at_idx" ON "reports"("submitted_at");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "shifts_site_id_idx" ON "shifts"("site_id");

-- CreateIndex
CREATE INDEX "shifts_agent_id_idx" ON "shifts"("agent_id");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "shifts_start_time_idx" ON "shifts"("start_time");

-- CreateIndex
CREATE INDEX "shifts_end_time_idx" ON "shifts"("end_time");

-- CreateIndex
CREATE INDEX "shifts_shift_type_idx" ON "shifts"("shift_type");

-- CreateIndex
CREATE INDEX "shifts_priority_idx" ON "shifts"("priority");

-- CreateIndex
CREATE INDEX "shifts_created_at_idx" ON "shifts"("created_at");

-- CreateIndex
CREATE INDEX "sites_client_id_idx" ON "sites"("client_id");

-- CreateIndex
CREATE INDEX "sites_status_idx" ON "sites"("status");

-- CreateIndex
CREATE INDEX "sites_site_type_idx" ON "sites"("site_type");

-- CreateIndex
CREATE INDEX "sites_created_at_idx" ON "sites"("created_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
