-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL CONSTRAINTS AND VALIDATION
-- File: 003_constraints.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Security Module Constraints
ALTER TABLE users
    ADD CONSTRAINT chk_user_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    ADD CONSTRAINT chk_failed_login_limit CHECK (failed_login_attempts >= 0);

ALTER TABLE user_sessions
    ADD CONSTRAINT chk_session_expiry CHECK (expires_at > created_at);

-- 2. Masters Module Constraints
ALTER TABLE battery_models
    ADD CONSTRAINT chk_capacity_positive CHECK (nominal_capacity_ah > 0),
    ADD CONSTRAINT chk_warranty_range CHECK (warranty_months BETWEEN 3 AND 120),
    ADD CONSTRAINT chk_prefix_format CHECK (prefix ~* '^[A-Z0-9]{2,5}$');

ALTER TABLE product_specifications
    ADD CONSTRAINT chk_active_material_weight CHECK (active_material_weight_g > 0),
    ADD CONSTRAINT chk_specific_gravity CHECK (specific_gravity_std BETWEEN 1.100 AND 1.350),
    ADD CONSTRAINT chk_acid_volume CHECK (acid_volume_liters > 0),
    ADD CONSTRAINT chk_cell_count CHECK (cell_count IN (3, 6, 12)); -- 6V, 12V, or 24V setups

ALTER TABLE shifts
    ADD CONSTRAINT chk_shift_duration CHECK (start_time != end_time);

-- 3. Serial Number Logic & Range Constraints
ALTER TABLE serial_range_allotments
    ADD CONSTRAINT chk_allotment_year CHECK (year_code ~ '^[0-9A-Z]{2}$'),
    ADD CONSTRAINT chk_allotment_month CHECK (month_code ~ '^[0-9A-Z]{2}$'),
    ADD CONSTRAINT chk_running_numbers CHECK (running_number_end >= running_number_start),
    ADD CONSTRAINT chk_running_bounds CHECK (running_number_start > 0);

ALTER TABLE serial_numbers
    ADD CONSTRAINT chk_serial_running_num CHECK (running_number > 0),
    ADD CONSTRAINT chk_serial_year_code CHECK (year_code ~ '^[0-9A-Z]{2}$'),
    ADD CONSTRAINT chk_serial_month_code CHECK (month_code ~ '^[0-9A-Z]{2}$');

-- 4. Production Module Engineering Integrity
ALTER TABLE production_batches
    ADD CONSTRAINT chk_batch_yield CHECK (yield_qty >= 0),
    ADD CONSTRAINT chk_batch_rejection CHECK (rejection_qty >= 0);

ALTER TABLE production_stage_history
    ADD CONSTRAINT chk_stage_temp CHECK (temperature_c BETWEEN -10.0 AND 80.0), -- Critical battery curing/plate forming range
    ADD CONSTRAINT chk_stage_humidity CHECK (ambient_humidity BETWEEN 0.0 AND 100.0),
    ADD CONSTRAINT chk_stage_timestamps CHECK (end_time >= start_time);

-- 5. Packing & Battery Casing Constraints
ALTER TABLE packing_details
    ADD CONSTRAINT chk_battery_weight CHECK (weight_kg BETWEEN 2.00 AND 120.00), -- Battery weight from small auto to heavy industrial
    ADD CONSTRAINT chk_volt_open_circuit CHECK (volt_open_circuit BETWEEN 9.50 AND 14.50), -- 12V Battery OCV standard limits
    ADD CONSTRAINT chk_internal_resistance CHECK (internal_resistance_m_ohm > 0.0);

-- 6. PDI (Pre-Delivery Inspection) Battery Performance Criteria
ALTER TABLE pdi_batches
    ADD CONSTRAINT chk_pdi_metrics_positive CHECK (offer_qty >= 0 AND ok_qty >= 0 AND hold_qty >= 0 AND reject_qty >= 0),
    ADD CONSTRAINT chk_pdi_sum CHECK (ok_qty + hold_qty + reject_qty <= offer_qty);

ALTER TABLE pdi_details
    ADD CONSTRAINT chk_pdi_high_rate_discharge CHECK (high_rate_discharge_v BETWEEN 6.00 AND 13.00), -- High-rate discharge voltage
    ADD CONSTRAINT chk_pdi_gravity CHECK (temp_corrected_sg BETWEEN 1.200 AND 1.300); -- Fully charged electrolyte specific gravity

-- 7. Dispatch Module Constraints
ALTER TABLE dispatch_headers
    ADD CONSTRAINT chk_invoice_format CHECK (invoice_no != ''),
    ADD CONSTRAINT chk_vehicle_format CHECK (vehicle_no != '');

-- 8. Quality Module Constraints
ALTER TABLE quality_reports
    ADD CONSTRAINT chk_cell_sg_limits CHECK (
        cell_1_sg BETWEEN 1.100 AND 1.320 AND
        cell_2_sg BETWEEN 1.100 AND 1.320 AND
        cell_3_sg BETWEEN 1.100 AND 1.320 AND
        cell_4_sg BETWEEN 1.100 AND 1.320 AND
        cell_5_sg BETWEEN 1.100 AND 1.320 AND
        cell_6_sg BETWEEN 1.100 AND 1.320
    ),
    ADD CONSTRAINT chk_report_total_voltage CHECK (total_voltage BETWEEN 10.00 AND 16.00);

ALTER TABLE capa
    ADD CONSTRAINT chk_capa_target_date CHECK (target_date >= created_at::DATE);

-- 9. Audit Module Constraints
ALTER TABLE api_logs
    ADD CONSTRAINT chk_api_execution_time CHECK (execution_time_ms >= 0);
