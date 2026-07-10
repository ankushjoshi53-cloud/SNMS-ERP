-- ============================================================================
-- SNMS ERP v2.0 - NEON & SERVERLESS CONSOLIDATED MASTER DEPLOYMENT SCRIPT
-- File: neon_deploy_all.sql
-- Role: Senior PostgreSQL Database Architect & Lead ERP Systems Engineer
-- Description: Unified, single-transaction deployment blueprint for GitHub CI/CD,
--              Vercel Serverless Server, and Neon Cloud environments.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DATABASE ENUM TYPES (002_enum_types.sql)
-- ============================================================================

CREATE TYPE battery_type_enum AS ENUM (
    'Tubular',
    'Flat Plate',
    'Automotive',
    'Industrial'
);

CREATE TYPE serial_stage_enum AS ENUM (
    'Allotment',
    'Assembly',
    'Curing',
    'Packing Line',
    'Quality Inspection',
    'Dispatched'
);

CREATE TYPE serial_status_enum AS ENUM (
    'Allocated',
    'Production',
    'Packing',
    'PDI Approved',
    'Dispatched',
    'Customer',
    'Hold',
    'Rejected'
);

CREATE TYPE transaction_type_enum AS ENUM (
    'ALLOTMENT_CREATE',
    'PRODUCTION_REGISTER',
    'PACKING_COMPLETE',
    'PDI_CHECK_OK',
    'PDI_CHECK_HOLD',
    'PDI_CHECK_REJECT',
    'TRANSFER_INITIATE',
    'TRANSFER_RECEIVE',
    'DISPATCH_CONFIRMED',
    'HOLD_RELEASE'
);

CREATE TYPE audit_action_enum AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);

-- ============================================================================
-- SECTION 2: PHYSICAL SCHEMAS & RELATIONSHIPS (001_schema.sql)
-- ============================================================================

-- 1. Plants (Ecosystem Facilities)
CREATE TABLE plants (
    plant_id BIGSERIAL PRIMARY KEY,
    plant_code VARCHAR(50) UNIQUE NOT NULL,
    plant_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Battery Models Catalog
CREATE TABLE battery_models (
    model_id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(100) UNIQUE NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    battery_type battery_type_enum NOT NULL,
    nominal_capacity_ah INT NOT NULL,
    warranty_months INT NOT NULL,
    prefix VARCHAR(10) UNIQUE NOT NULL,
    year_code_pos INT NOT NULL,
    month_code_pos INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Product Technical Specifications
CREATE TABLE product_specifications (
    spec_id BIGSERIAL PRIMARY KEY,
    model_id BIGINT UNIQUE NOT NULL REFERENCES battery_models(model_id) ON DELETE CASCADE,
    active_material_weight_g DECIMAL(10,2) NOT NULL,
    specific_gravity_std DECIMAL(4,3) NOT NULL,
    acid_volume_liters DECIMAL(6,2) NOT NULL,
    cell_count INT NOT NULL,
    grid_alloy VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Manufacturing Production Lines
CREATE TABLE production_lines (
    line_id BIGSERIAL PRIMARY KEY,
    line_code VARCHAR(50) UNIQUE NOT NULL,
    line_name VARCHAR(255) NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Packaging & Conveyor Lines
CREATE TABLE packing_lines (
    line_id BIGSERIAL PRIMARY KEY,
    line_code VARCHAR(50) UNIQUE NOT NULL,
    line_name VARCHAR(255) NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Operational Shifts
CREATE TABLE shifts (
    shift_id BIGSERIAL PRIMARY KEY,
    shift_type VARCHAR(100) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Serial Numbers Range Allotments Ledger
CREATE TABLE serial_range_allotments (
    allotment_id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id) ON DELETE RESTRICT,
    year_code CHAR(2) NOT NULL,
    month_code CHAR(2) NOT NULL,
    range_start VARCHAR(100) UNIQUE NOT NULL,
    range_end VARCHAR(100) UNIQUE NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    running_number_start INT NOT NULL,
    running_number_end INT NOT NULL,
    is_exhausted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Core Serial Numbers Ledger Table
CREATE TABLE serial_numbers (
    serial_id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    allotment_id BIGINT REFERENCES serial_range_allotments(allotment_id) ON DELETE SET NULL,
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id) ON DELETE RESTRICT,
    battery_type battery_type_enum NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    current_stage serial_stage_enum DEFAULT 'Allotment' NOT NULL,
    current_status serial_status_enum DEFAULT 'Allocated' NOT NULL,
    current_owner VARCHAR(255) DEFAULT 'Plant Warehouse' NOT NULL,
    year_code CHAR(2) NOT NULL,
    month_code CHAR(2) NOT NULL,
    running_number INT NOT NULL,
    holds_count INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Real-Time Balance Caching Table
CREATE TABLE serial_balance (
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id) ON DELETE CASCADE,
    current_status serial_status_enum NOT NULL,
    quantity INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (plant_id, model_id, current_status)
);

-- 10. Core Serial Transactions Ledger (Autonomous Micro-Movement History)
CREATE TABLE serial_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    previous_status serial_status_enum,
    previous_stage serial_stage_enum,
    new_status serial_status_enum NOT NULL,
    new_stage serial_stage_enum NOT NULL,
    new_plant_id BIGINT REFERENCES plants(plant_id) ON DELETE RESTRICT,
    scanned_by BIGINT, -- references users(user_id) set at runtime (foreign key added below)
    ip_address VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. Production Running Batches (Casting & Assembly)
CREATE TABLE production_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    production_line_id BIGINT NOT NULL REFERENCES production_lines(line_id) ON DELETE RESTRICT,
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id) ON DELETE RESTRICT,
    date_produced DATE NOT NULL,
    operator_name VARCHAR(255) NOT NULL,
    supervisor_name VARCHAR(255) NOT NULL,
    yield_qty INT NOT NULL,
    rejection_qty INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Running' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. Production Batch Detail Ledger
CREATE TABLE production_batch_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    operator_id BIGINT, -- added as constraint later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. High-Temperature Plate Curing Metrics History
CREATE TABLE production_stage_history (
    history_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    operator_name VARCHAR(255) NOT NULL,
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    machine_id VARCHAR(100) NOT NULL,
    temperature_c DECIMAL(5,2) NOT NULL,
    ambient_humidity DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. Assembly Line Structural Rejection Tracking
CREATE TABLE production_rejections (
    rejection_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    defect_type VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    rejection_stage VARCHAR(100) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. Conveyor Packing Batches
CREATE TABLE packing_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    packing_line_id BIGINT NOT NULL REFERENCES packing_lines(line_id) ON DELETE RESTRICT,
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    supervisor_name VARCHAR(255) NOT NULL,
    pack_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Running' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Battery Packing Electrical Test Details
CREATE TABLE packing_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES packing_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    outer_carton_serial VARCHAR(100) UNIQUE NOT NULL,
    master_pallet_no VARCHAR(100) NOT NULL,
    weight_kg DECIMAL(6,2) NOT NULL,
    volt_open_circuit DECIMAL(4,2) NOT NULL,
    internal_resistance_m_ohm DECIMAL(5,2) NOT NULL,
    packed_by BIGINT, -- added as constraint later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. Raw Materials Consumption Logistics Ledger
CREATE TABLE packing_materials (
    material_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES packing_batches(batch_id) ON DELETE CASCADE,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    batch_code VARCHAR(100) NOT NULL,
    qty_consumed DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 18. Pre-Delivery Inspection (PDI) Batch Run
CREATE TABLE pdi_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    offered_date DATE NOT NULL,
    supervisor_name VARCHAR(255) NOT NULL,
    offer_qty INT NOT NULL,
    ok_qty INT NOT NULL,
    hold_qty INT NOT NULL,
    reject_qty INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Running' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 19. Individual Electrical & Load Test PDI Log
CREATE TABLE pdi_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES pdi_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    aesthetic_passed BOOLEAN NOT NULL,
    electrical_passed BOOLEAN NOT NULL,
    capacity_passed BOOLEAN NOT NULL,
    volt_load_test DECIMAL(4,2) NOT NULL,
    internal_resistance_test DECIMAL(5,2) NOT NULL,
    high_rate_discharge_v DECIMAL(4,2) NOT NULL,
    temp_corrected_sg DECIMAL(4,3) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    checked_by BIGINT, -- added as constraint later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 20. PDI Physical Surface & Electrical Defect Registry
CREATE TABLE pdi_defects (
    defect_id BIGSERIAL PRIMARY KEY,
    pdi_detail_id BIGINT NOT NULL REFERENCES pdi_details(detail_id) ON DELETE CASCADE,
    defect_category VARCHAR(255) NOT NULL,
    defect_description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 21. Quality Hold Reason Codes Dictionary
CREATE TABLE hold_reasons (
    reason_id BIGSERIAL PRIMARY KEY,
    reason_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 22. Isolation Holds Ledger (Grid Micro-Cracks, Paste Failures)
CREATE TABLE first_time_hold (
    hold_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    hold_reason_id BIGINT NOT NULL REFERENCES hold_reasons(reason_id) ON DELETE RESTRICT,
    hold_category VARCHAR(100) NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    is_released BOOLEAN DEFAULT FALSE NOT NULL,
    comments TEXT,
    released_by BIGINT, -- added as constraint later
    released_at TIMESTAMP WITH TIME ZONE,
    release_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 23. Inter-Plant Stock Transfers Request Document
CREATE TABLE transfer_requests (
    transfer_id BIGSERIAL PRIMARY KEY,
    source_plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    destination_plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    requested_by BIGINT, -- added as constraint later
    approved_by BIGINT,  -- added as constraint later
    status VARCHAR(50) NOT NULL,
    total_items INT NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 24. Inter-Plant Micro-Movement Detailed Mapping Trace
CREATE TABLE transfer_history (
    detail_id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES transfer_requests(transfer_id) ON DELETE CASCADE,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    received_status VARCHAR(50) NOT NULL,
    checked_by BIGINT, -- added as constraint later
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 25. Wholesale Customers Directory
CREATE TABLE customers (
    customer_id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 26. Logistics Outbound Dispatch Manifests
CREATE TABLE dispatch_headers (
    dispatch_id BIGSERIAL PRIMARY KEY,
    dispatch_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    dispatch_date DATE NOT NULL,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    vehicle_no VARCHAR(50) NOT NULL,
    lr_no VARCHAR(100) NOT NULL,
    transporter_name VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    eway_bill_no VARCHAR(100) UNIQUE NOT NULL,
    created_by BIGINT, -- added as constraint later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 27. Outbound Scanning Serial Details
CREATE TABLE dispatch_details (
    detail_id BIGSERIAL PRIMARY KEY,
    dispatch_id BIGINT NOT NULL REFERENCES dispatch_headers(dispatch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    warranty_card_no VARCHAR(100) UNIQUE NOT NULL,
    scanned_by BIGINT, -- added as constraint later
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 28. Regulatory Shipping Compliance Certificates
CREATE TABLE dispatch_documents (
    doc_id BIGSERIAL PRIMARY KEY,
    dispatch_id BIGINT NOT NULL REFERENCES dispatch_headers(dispatch_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 29. Security Authorization Roles Catalog
CREATE TABLE roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 30. Enterprise System Permissions Matrix
CREATE TABLE permissions (
    permission_id BIGSERIAL PRIMARY KEY,
    permission_key VARCHAR(150) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 31. Roles-Permissions Security Map
CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 32. Core Platform Users Registry
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_name VARCHAR(100) NOT NULL REFERENCES roles(role_name) ON DELETE RESTRICT,
    primary_plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 33. Protected User Credentials Storage (Scrubbed in CDC Logs)
CREATE TABLE user_credentials (
    credential_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 34. Active Security Isolation Sessions
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 35. Core Quality Non-Conformance Log
CREATE TABLE non_conformance (
    nc_id BIGSERIAL PRIMARY KEY,
    nc_number VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(100) NOT NULL REFERENCES serial_numbers(serial_number) ON DELETE RESTRICT,
    severity VARCHAR(50) NOT NULL,
    root_cause_category TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    raised_by BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 36. Corrective Action Preventive Action (CAPA) Security Workflows
CREATE TABLE capa (
    capa_id BIGSERIAL PRIMARY KEY,
    nc_id BIGINT UNIQUE NOT NULL REFERENCES non_conformance(nc_id) ON DELETE CASCADE,
    problem_definition TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    why_why_analysis JSONB NOT NULL,
    preventive_action TEXT NOT NULL,
    corrective_action TEXT NOT NULL,
    target_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    owner BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 37. Secure System Event Notifications Queue
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    recipient_role VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 38. Enterprise Persistent System Configurations Ledger
CREATE TABLE system_settings (
    setting_id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(150) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 39. Unified Audit Trail Change Data Capture (CDC) Ledger
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    action_type audit_action_enum NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT NOT NULL,
    is_successful BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ============================================================================
-- SECTION 3: FOREIGN KEY CONSTRAINTS DEFERRED HOOKS (003_constraints.sql)
-- ============================================================================

-- 1. Circular User/Transaction references
ALTER TABLE serial_transactions 
    ADD CONSTRAINT fk_serial_transactions_user FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE production_batch_details 
    ADD CONSTRAINT fk_production_batch_details_operator FOREIGN KEY (operator_id) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE packing_details 
    ADD CONSTRAINT fk_packing_details_packer FOREIGN KEY (packed_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE pdi_details 
    ADD CONSTRAINT fk_pdi_details_checker FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE first_time_hold 
    ADD CONSTRAINT fk_first_time_hold_releaser FOREIGN KEY (released_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE transfer_requests 
    ADD CONSTRAINT fk_transfer_requests_requester FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_transfer_requests_approver FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE transfer_history 
    ADD CONSTRAINT fk_transfer_history_checker FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE dispatch_details 
    ADD CONSTRAINT fk_dispatch_details_scanner FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL;


-- 2. Domain & Integrity Check Constraints
-- Red Charge Lead Acid batteries cannot have a standard specific gravity beyond physical physical limits
ALTER TABLE product_specifications 
    ADD CONSTRAINT chk_gravity_domain CHECK (specific_gravity_std BETWEEN 1.100 AND 1.350);

ALTER TABLE product_specifications 
    ADD CONSTRAINT chk_cell_limit CHECK (cell_count IN (6, 12, 24));

ALTER TABLE product_specifications 
    ADD CONSTRAINT chk_specs_weight CHECK (active_material_weight_g > 0.00);

-- Packing safety controls: Minimum dry weights and standard OCV targets
ALTER TABLE packing_details 
    ADD CONSTRAINT chk_packing_weight CHECK (weight_kg BETWEEN 2.00 AND 120.00);

ALTER TABLE packing_details 
    ADD CONSTRAINT chk_packing_volt CHECK (volt_open_circuit BETWEEN 10.50 AND 14.80);

ALTER TABLE packing_details 
    ADD CONSTRAINT chk_packing_resistance CHECK (internal_resistance_m_ohm > 0.00);

-- PDI Engineering check bounds
ALTER TABLE pdi_details 
    ADD CONSTRAINT chk_pdi_load_volt CHECK (volt_load_test BETWEEN 6.00 AND 14.80);

ALTER TABLE pdi_details 
    ADD CONSTRAINT chk_pdi_hrd CHECK (high_rate_discharge_v BETWEEN 5.00 AND 13.50);

ALTER TABLE pdi_details 
    ADD CONSTRAINT chk_pdi_temp_sg CHECK (temp_corrected_sg BETWEEN 1.150 AND 1.320);

-- Allotment serial boundary checks
ALTER TABLE serial_range_allotments 
    ADD CONSTRAINT chk_allotment_range CHECK (running_number_end >= running_number_start);


-- ============================================================================
-- SECTION 4: PERFORMANCE INDEXING PLAN (004_indexes.sql)
-- ============================================================================

-- 1. Serial Number B-Tree Hash-Alternative Index (Optimizes hand-scanners in warehouse)
CREATE INDEX idx_serials_number_hash ON serial_numbers (serial_number);

-- 2. Range Query Composite Index (Speeds up barcode series lookup checks)
CREATE INDEX idx_serials_prefix_running ON serial_numbers (model_id, year_code, month_code, running_number);

-- 3. Partial Security Indexes (Saves disk scan I/O on large manufacturing ledgers)
CREATE INDEX idx_serials_active_holds ON serial_numbers (plant_id) 
    WHERE current_status = 'Hold';

CREATE INDEX idx_serials_active_rejected ON serial_numbers (plant_id) 
    WHERE current_status = 'Rejected';

-- 4. Audit Log CDC Query GIN Index (For analytical searches by plant auditors)
CREATE INDEX idx_serial_history_jsonb ON audit_logs USING GIN (old_values);
CREATE INDEX idx_serial_history_new_jsonb ON audit_logs USING GIN (new_values);

-- 5. Foreign Key Optimization Indices
CREATE INDEX idx_serial_numbers_plant ON serial_numbers(plant_id);
CREATE INDEX idx_serial_transactions_serial ON serial_transactions(serial_id);
CREATE INDEX idx_dispatch_details_serial ON dispatch_details(serial_id);


-- ============================================================================
-- SECTION 5: PROCEDURAL CORE FUNCTIONS (005_functions.sql)
-- ============================================================================

-- 1. Autonomous Serial-Movement & Balance Synchronization Ledger Engine
CREATE OR REPLACE FUNCTION register_serial_transaction(
    p_serial_id BIGINT,
    p_trans_type transaction_type_enum,
    p_new_status serial_status_enum,
    p_new_stage serial_stage_enum,
    p_plant_id BIGINT,
    p_operator_id BIGINT,
    p_ip VARCHAR(50),
    p_notes TEXT
) RETURNS VOID AS $$
DECLARE
    v_old_status serial_status_enum;
    v_old_stage serial_stage_enum;
    v_old_plant BIGINT;
    v_serial_no VARCHAR(100);
BEGIN
    -- Query the original state inside a locked transition row
    SELECT current_status, current_stage, plant_id, serial_number
    INTO v_old_status, v_old_stage, v_old_plant, v_serial_no
    FROM serial_numbers
    WHERE serial_id = p_serial_id FOR UPDATE;

    -- Guard condition
    IF v_serial_no IS NULL THEN
        RAISE EXCEPTION 'Transition Violation: Target Serial ID % is missing.', p_serial_id;
    END IF;

    -- Update parent serial status tracking values
    UPDATE serial_numbers
    SET current_status = p_new_status,
        current_stage = p_new_stage,
        plant_id = p_plant_id,
        current_owner = CASE WHEN p_new_status = 'Customer' THEN 'OEM Client / Logistics' ELSE 'Plant-' || p_plant_id || ' Warehouse' END,
        updated_at = CURRENT_TIMESTAMP
    WHERE serial_id = p_serial_id;

    -- Write physical movement historical ledger
    INSERT INTO serial_transactions (
        serial_id, serial_number, transaction_type, previous_status, previous_stage,
        new_status, new_stage, new_plant_id, scanned_by, ip_address, notes, created_at
    ) VALUES (
        p_serial_id, v_serial_no, p_trans_type, v_old_status, v_old_stage,
        p_new_status, p_new_stage, p_plant_id, p_operator_id, p_ip, p_notes, CURRENT_TIMESTAMP
    );

    -- DYNAMIC CACHE SYNC: Settle balance totals on old and new states
    IF v_old_plant IS NOT NULL AND v_old_status IS NOT NULL THEN
        INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
        SELECT v_old_plant, model_id, v_old_status, -1, CURRENT_TIMESTAMP FROM serial_numbers WHERE serial_id = p_serial_id
        ON CONFLICT (plant_id, model_id, current_status)
        DO UPDATE SET quantity = serial_balance.quantity - 1, updated_at = CURRENT_TIMESTAMP;
    END IF;

    INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
    SELECT p_plant_id, model_id, p_new_status, 1, CURRENT_TIMESTAMP FROM serial_numbers WHERE serial_id = p_serial_id
    ON CONFLICT (plant_id, model_id, current_status)
    DO UPDATE SET quantity = serial_balance.quantity + 1, updated_at = CURRENT_TIMESTAMP;

END;
$$ LANGUAGE plpgsql;


-- 2. Bulk Ranges Allocation Engine (Atomic Generation Script)
CREATE OR REPLACE FUNCTION bulk_allocate_serial_range(
    p_plant_id BIGINT,
    p_model_id BIGINT,
    p_year_code CHAR(2),
    p_month_code CHAR(2),
    p_quantity INT,
    p_operator_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_last_sequence INT := 0;
    v_start_seq INT;
    v_end_seq INT;
    v_start_serial VARCHAR(100);
    v_end_serial VARCHAR(100);
    v_allotment_id BIGINT;
    v_battery_type battery_type_enum;
    i INT;
BEGIN
    -- Query the prefix and type configured for the target model
    SELECT prefix, battery_type INTO v_prefix, v_battery_type
    FROM battery_models
    WHERE model_id = p_model_id AND is_active = TRUE;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Configuration Error: Prefix is missing or battery model is inactive.';
    END IF;

    -- Query sequence number locks to guarantee unique execution
    SELECT COALESCE(MAX(running_number_end), 0) INTO v_last_sequence
    FROM serial_range_allotments
    WHERE model_id = p_model_id AND year_code = p_year_code AND month_code = p_month_code;

    v_start_seq := v_last_sequence + 1;
    v_end_seq := v_last_sequence + p_quantity;

    -- Formulate barcode text bounds matching Luminous standard structure
    v_start_serial := v_prefix || p_year_code || p_month_code || lpad(v_start_seq::TEXT, 6, '0');
    v_end_serial := v_prefix || p_year_code || p_month_code || lpad(v_end_seq::TEXT, 6, '0');

    -- Insert active range reference header
    INSERT INTO serial_range_allotments (
        plant_id, model_id, year_code, month_code, range_start, range_end, prefix, running_number_start, running_number_end, is_exhausted, created_at
    ) VALUES (
        p_plant_id, p_model_id, p_year_code, p_month_code, v_start_serial, v_end_serial, v_prefix, v_start_seq, v_end_seq, FALSE, CURRENT_TIMESTAMP
    ) RETURNING allotment_id INTO v_allotment_id;

    -- Instantly generate physical child elements inside the centralized registry
    FOR i IN v_start_seq..v_end_seq LOOP
        INSERT INTO serial_numbers (
            serial_number, allotment_id, model_id, battery_type, plant_id,
            current_stage, current_status, current_owner, year_code, month_code, running_number, holds_count, is_active, created_at, updated_at
        ) VALUES (
            v_prefix || p_year_code || p_month_code || lpad(i::TEXT, 6, '0'),
            v_allotment_id, p_model_id, v_battery_type, p_plant_id,
            'Allotment'::serial_stage_enum, 'Allocated'::serial_status_enum, 'Plant Warehouse',
            p_year_code, p_month_code, i, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
    END LOOP;

    -- Generate historical records for first-stage allotment
    INSERT INTO serial_transactions (
        serial_id, serial_number, transaction_type, previous_status, previous_stage,
        new_status, new_stage, new_plant_id, scanned_by, ip_address, notes, created_at
    )
    SELECT
        serial_id, serial_number, 'ALLOTMENT_CREATE'::transaction_type_enum, NULL, NULL,
        'Allocated'::serial_status_enum, 'Allotment'::serial_stage_enum, p_plant_id, p_operator_id, '127.0.0.1', 'Automated bulk allotment range generation run.', CURRENT_TIMESTAMP
    FROM serial_numbers
    WHERE allotment_id = v_allotment_id;

    -- Populate initial inventory cache balance
    INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
    VALUES (p_plant_id, p_model_id, 'Allocated'::serial_status_enum, p_quantity, CURRENT_TIMESTAMP)
    ON CONFLICT (plant_id, model_id, current_status)
    DO UPDATE SET quantity = serial_balance.quantity + p_quantity, updated_at = CURRENT_TIMESTAMP;

    RETURN v_allotment_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECTION 6: AUTOMATED TRIGGERS ENGINE (006_triggers.sql)
-- ============================================================================

-- 1. Global Timestamp Management Function
CREATE OR REPLACE FUNCTION update_timestamp_column_fn()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column_fn();

CREATE TRIGGER trg_user_credentials_timestamp
    BEFORE UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column_fn();

CREATE TRIGGER trg_serial_numbers_timestamp
    BEFORE UPDATE ON serial_numbers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column_fn();

CREATE TRIGGER trg_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column_fn();


-- 2. Audit Trail Change Data Capture (CDC) Trigger Engine
CREATE OR REPLACE FUNCTION process_audit_logging_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_record_id BIGINT;
    v_username VARCHAR(100) := 'System Operator';
    v_action audit_action_enum;
BEGIN
    -- Determine execution context operation
    IF (TG_OP = 'DELETE') THEN
        v_old := to_jsonb(OLD);
        v_action := 'DELETE';
        v_record_id := OLD.user_id; -- Fallback identification key
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_action := 'UPDATE';
        v_record_id := NEW.user_id;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new := to_jsonb(NEW);
        v_action := 'INSERT';
        v_record_id := NEW.user_id;
    END IF;

    -- Suppress password hashes in security table logs to maintain compliance
    IF TG_TABLE_NAME = 'user_credentials' THEN
        IF v_old IS NOT NULL THEN v_old := v_old - 'password_hash' - 'salt'; END IF;
        IF v_new IS NOT NULL THEN v_new := v_new - 'password_hash' - 'salt'; END IF;
    END IF;

    -- Record event inside persistent audit table
    INSERT INTO audit_logs (
        username, action_type, table_name, record_id, 
        old_values, new_values, ip_address, user_agent, is_successful, notes, created_at
    ) VALUES (
        v_username, v_action, TG_TABLE_NAME, v_record_id,
        v_old, v_new, '127.0.0.1', 'Database Event Engine', TRUE, 'Automated CDC Logger', CURRENT_TIMESTAMP
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Bind Change Data Capture auditing to sensitive tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION process_audit_logging_fn();

CREATE TRIGGER audit_credentials_changes
    AFTER UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION process_audit_logging_fn();


-- 3. Block Intentional / Accidental Edits of Serial Number Layout Patterns
CREATE OR REPLACE FUNCTION prevent_serial_pattern_modification_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.serial_number != NEW.serial_number) OR
       (OLD.year_code != NEW.year_code) OR
       (OLD.month_code != NEW.month_code) OR
       (OLD.running_number != NEW.running_number) OR
       (OLD.model_id != NEW.model_id) THEN
        RAISE EXCEPTION 'Schema Violation: Immutable Serial Structure (Number, Model, Year, Month, Sequence) cannot be altered once registered.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_serial_patterns
    BEFORE UPDATE ON serial_numbers
    FOR EACH ROW EXECUTE FUNCTION prevent_serial_pattern_modification_fn();


-- 4. Automatically Increment Hold Count on Batteries when placed on Hold
CREATE OR REPLACE FUNCTION increment_serial_holds_count_fn()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE serial_numbers
    SET holds_count = holds_count + 1
    WHERE serial_id = NEW.serial_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_increment_holds
    AFTER INSERT ON first_time_hold
    FOR EACH ROW EXECUTE FUNCTION increment_serial_holds_count_fn();


-- ============================================================================
-- SECTION 7: ANALYTICAL & REPORTING VIEWS (007_views.sql)
-- ============================================================================

-- 1. Real-Time Curing & Storage Active Battery Inventory View
CREATE OR REPLACE VIEW v_active_inventory AS
SELECT 
    p.plant_code,
    p.plant_name,
    m.model_code,
    m.model_name,
    m.battery_type,
    sn.current_stage,
    sn.current_status,
    COUNT(sn.serial_id) AS total_quantity,
    MAX(sn.updated_at) AS last_updated
FROM serial_numbers sn
JOIN plants p ON sn.plant_id = p.plant_id
JOIN battery_models m ON sn.model_id = m.model_id
WHERE sn.is_active = TRUE
GROUP BY p.plant_code, p.plant_name, m.model_code, m.model_name, m.battery_type, sn.current_stage, sn.current_status;


-- 2. Complete Lifecycle Serial Traceability View (Aesthetic & Trace Mapping)
CREATE OR REPLACE VIEW v_serial_lifecycle_trace AS
SELECT 
    sn.serial_id,
    sn.serial_number,
    m.model_code,
    m.model_name,
    m.battery_type,
    p_orig.plant_name AS originating_plant,
    p_curr.plant_name AS current_location,
    sn.current_stage,
    sn.current_status,
    sn.current_owner,
    sn.holds_count,
    sra.range_start AS allotted_range_start,
    sra.range_end AS allotted_range_end,
    sn.created_at AS date_allotted,
    pd.outer_carton_serial,
    pd.master_pallet_no,
    pd.weight_kg,
    pd.volt_open_circuit,
    pdi.decision AS pdi_decision,
    pdi.high_rate_discharge_v AS pdi_hrd_volt,
    dh.dispatch_no,
    dh.dispatch_date,
    c.customer_name
FROM serial_numbers sn
JOIN battery_models m ON sn.model_id = m.model_id
LEFT JOIN serial_range_allotments sra ON sn.allotment_id = sra.allotment_id
LEFT JOIN plants p_orig ON sra.plant_id = p_orig.plant_id
LEFT JOIN plants p_curr ON sn.plant_id = p_curr.plant_id
LEFT JOIN packing_details pd ON sn.serial_id = pd.serial_id
LEFT JOIN pdi_details pdi ON sn.serial_id = pdi.serial_id
LEFT JOIN dispatch_details dd ON sn.serial_id = dd.serial_id
LEFT JOIN dispatch_headers dh ON dd.dispatch_id = dh.dispatch_id
LEFT JOIN customers c ON dh.customer_id = c.customer_id;


-- 3. Production Efficiency, Yield, and Scrap Metrics by Line and Shift
CREATE OR REPLACE VIEW v_production_efficiency AS
SELECT 
    p.plant_name,
    pl.line_code,
    pl.line_name,
    s.shift_type,
    COUNT(pb.batch_id) AS total_batches_run,
    SUM(pb.yield_qty) AS aggregate_yield,
    SUM(pb.rejection_qty) AS aggregate_rejections,
    ROUND(
        (SUM(pb.yield_qty)::DECIMAL / NULLIF(SUM(pb.yield_qty) + SUM(pb.rejection_qty), 0)) * 100, 
        2
    ) AS yield_percentage,
    ROUND(
        (SUM(pb.rejection_qty)::DECIMAL / NULLIF(SUM(pb.yield_qty) + SUM(pb.rejection_qty), 0)) * 100, 
        2
    ) AS rejection_percentage
FROM production_batches pb
JOIN production_lines pl ON pb.production_line_id = pl.line_id
JOIN plants p ON pl.plant_id = p.plant_id
JOIN shifts s ON pb.shift_id = s.shift_id
GROUP BY p.plant_name, pl.line_code, pl.line_name, s.shift_type;


-- 4. PDI Quality Inspection Performance & Defect Density Tracker
CREATE OR REPLACE VIEW v_pdi_quality_performance AS
SELECT 
    p.plant_name,
    m.model_code,
    m.model_name,
    COUNT(pd.detail_id) AS total_batteries_tested,
    SUM(CASE WHEN pd.decision = 'OK' THEN 1 ELSE 0 END) AS passed_qty,
    SUM(CASE WHEN pd.decision = 'Hold' THEN 1 ELSE 0 END) AS held_qty,
    SUM(CASE WHEN pd.decision = 'Rejected' THEN 1 ELSE 0 END) AS rejected_qty,
    ROUND(
        (SUM(CASE WHEN pd.decision = 'OK' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(pd.detail_id), 0)) * 100,
        2
    ) AS first_pass_yield_pct,
    COUNT(def.defect_id) AS total_defects_logged
FROM pdi_details pd
JOIN pdi_batches pb ON pd.batch_id = pb.batch_id
JOIN plants p ON pb.plant_id = p.plant_id
JOIN serial_numbers sn ON pd.serial_id = sn.serial_id
JOIN battery_models m ON sn.model_id = m.model_id
LEFT JOIN pdi_defects def ON pd.detail_id = def.pdi_detail_id
GROUP BY p.plant_name, m.model_code, m.model_name;


-- 5. Corrective Action Preventive Action (CAPA) Security & Quality Compliance Status
CREATE OR REPLACE VIEW v_quality_nc_capa_tracker AS
SELECT 
    nc.nc_number,
    nc.serial_number,
    nc.severity,
    nc.root_cause_category AS origin_leak,
    nc.status AS nc_status,
    nc.raised_by,
    c.preventive_action,
    c.corrective_action,
    c.target_date,
    c.status AS capa_status,
    u.full_name AS capa_owner_name,
    (c.target_date - CURRENT_DATE) AS days_to_target_deadline
FROM non_conformance nc
LEFT JOIN capa c ON nc.nc_id = c.nc_id
LEFT JOIN users u ON c.owner = u.user_id;


-- 6. Enterprise Consolidated Daily Operational Metric View
CREATE OR REPLACE VIEW v_daily_operational_summary AS
SELECT 
    COALESCE(prod.op_date, pack.op_date, pdi.op_date, disp.op_date) AS operational_date,
    COALESCE(prod.plant_name, pack.plant_name, pdi.plant_name, disp.plant_name) AS facility,
    COALESCE(prod.produced_qty, 0) AS units_produced,
    COALESCE(pack.packed_qty, 0) AS units_packed,
    COALESCE(pdi.inspected_qty, 0) AS units_pdi_checked,
    COALESCE(disp.dispatched_qty, 0) AS units_dispatched
FROM (
    SELECT pb.date_produced AS op_date, p.plant_name, SUM(pb.yield_qty) AS produced_qty
    FROM production_batches pb
    JOIN production_lines pl ON pb.production_line_id = pl.line_id
    JOIN plants p ON pl.plant_id = p.plant_id
    GROUP BY pb.date_produced, p.plant_name
) prod
FULL OUTER JOIN (
    SELECT pk.pack_date AS op_date, p.plant_name, COUNT(pd.detail_id) AS packed_qty
    FROM packing_batches pk
    JOIN packing_lines pkl ON pk.packing_line_id = pkl.line_id
    JOIN plants p ON pkl.plant_id = p.plant_id
    JOIN packing_details pd ON pk.batch_id = pd.batch_id
    GROUP BY pk.pack_date, p.plant_name
) pack ON prod.op_date = pack.op_date AND prod.plant_name = pack.plant_name
FULL OUTER JOIN (
    SELECT pb.offered_date AS op_date, p.plant_name, SUM(pb.ok_qty + pb.hold_qty + pb.reject_qty) AS inspected_qty
    FROM pdi_batches pb
    JOIN plants p ON pb.plant_id = p.plant_id
    GROUP BY pb.offered_date, p.plant_name
) pdi ON COALESCE(prod.op_date, pack.op_date) = pdi.op_date AND COALESCE(prod.plant_name, pack.plant_name) = pdi.plant_name
FULL OUTER JOIN (
    SELECT dh.dispatch_date AS op_date, p.plant_name, COUNT(dd.detail_id) AS dispatched_qty
    FROM dispatch_headers dh
    JOIN plants p ON dh.plant_id = p.plant_id
    JOIN dispatch_details dd ON dh.dispatch_id = dd.dispatch_id
    GROUP BY dh.dispatch_date, p.plant_name
) disp ON COALESCE(prod.op_date, pack.op_date, pdi.op_date) = disp.op_date AND COALESCE(prod.plant_name, pack.plant_name, pdi.plant_name) = disp.plant_name;


COMMENT ON VIEW v_active_inventory IS 'Live physical warehousing balances indicating exact structural stage counts across battery profiles.';
COMMENT ON VIEW v_serial_lifecycle_trace IS 'Trace audit mapping bridging raw allotments, curing metrics, OCV readings, PDI levels, and logistics records.';


-- ============================================================================
-- SECTION 8: SEED MASTER CONFIGURATIONS (008_seed_master.sql)
-- ============================================================================

-- 1. Seed Plants
INSERT INTO plants (plant_code, plant_name, address, is_active) VALUES
('PL001', 'Chittoor Plant 1', 'Survey No 231, Industrial Area, Chittoor, Andhra Pradesh, India', TRUE),
('PL002', 'Haridwar Plant 2', 'SIDCUL Industrial Area, Sector 5, Haridwar, Uttarakhand, India', TRUE),
('PL003', 'Pune Plant 3', 'Phase II, MIDC Chakan, Pune, Maharashtra, India', TRUE);

-- 2. Seed Customers
INSERT INTO customers (customer_code, customer_name, contact_email, country) VALUES
('CUST-AMARA', 'Amara Raja Power Distributors', 'logistics@amararaja.com', 'India'),
('CUST-EXIDE', 'Exide Retail Solutions', 'dispatch_exide@exide.co.in', 'India'),
('CUST-TATA', 'Tata Green Auto Logistics', 'oem.tata@tatagreen.com', 'India'),
('CUST-LUM', 'Luminous Power Technologies', 'info@luminouspower.com', 'India'),
('CUST-GEN', 'Generac Power Systems', 'supplychain@generac.com', 'USA');

-- 3. Seed Battery Models
INSERT INTO battery_models (model_code, model_name, battery_type, nominal_capacity_ah, warranty_months, prefix, year_code_pos, month_code_pos) VALUES
('TUB-150-RC', 'Red Charge 15000 Tubular', 'Tubular', 150, 36, 'TR', 1, 2),
('TUB-200-XP', 'Xtreme Power 20000 Tall Tubular', 'Tubular', 200, 48, 'TX', 1, 2),
('FLT-120-SL', 'Slimline Flat Plate 120Ah', 'Flat Plate', 120, 24, 'FP', 1, 2),
('AUT-070-AM', 'Amaron Pro DIN70 Automotive', 'Automotive', 70, 60, 'AP', 1, 2),
('IND-800-PS', 'PowerSafe 800Ah VRLA Industrial', 'Industrial', 800, 120, 'IP', 1, 2);

-- 4. Seed Product Technical Specifications
INSERT INTO product_specifications (model_id, active_material_weight_g, specific_gravity_std, acid_volume_liters, cell_count, grid_alloy) VALUES
(1, 14200.50, 1.250, 14.50, 6, 'Selenium-Lead'),
(2, 19500.00, 1.255, 18.20, 6, 'Selenium-Lead'),
(3, 10500.20, 1.260, 9.80, 6, 'Antimonial-Lead'),
(4, 6800.00, 1.280, 4.20, 6, 'Calcium-Silver-Lead'),
(5, 54000.00, 1.300, 42.00, 12, 'Pure Lead-Tin');

-- 5. Seed Curing, Assembly & Packing Lines
INSERT INTO production_lines (line_code, line_name, plant_id) VALUES
('PL1-L1', 'Chittoor Casting & Assembly Line 1', 1),
('PL1-L2', 'Chittoor Formation Line 2', 1),
('PL2-L1', 'Haridwar Automated Assembly Line 1', 2),
('PL3-L1', 'Pune Industrial Heavy Line 1', 3);

INSERT INTO packing_lines (line_code, line_name, plant_id) VALUES
('PL1-PK1', 'Chittoor Packing Conveyor 1', 1),
('PL2-PK1', 'Haridwar High-Speed Packing 1', 2),
('PL3-PK1', 'Pune Heavy Palletizing Line 1', 3);

-- 6. Seed Operational Working Shifts
INSERT INTO shifts (shift_type, start_time, end_time) VALUES
('Shift A - Morning', '06:00:00', '14:00:00'),
('Shift B - Evening', '14:00:00', '22:00:00'),
('Shift C - Night', '22:00:00', '06:00:00');

-- 7. Seed Quality Hold Reason Codes
INSERT INTO hold_reasons (reason_code, description, is_active) VALUES
('HR001', 'Grid Surface Micro-Cracks', TRUE),
('HR002', 'Paste Flaking or Shedding', TRUE),
('HR003', 'Low Acid Specific Gravity (Undercharged)', TRUE),
('HR004', 'High Rate Discharge (HRD) Drop', TRUE),
('HR005', 'Casing Melt / Cosmetic Defect', TRUE),
('HR006', 'Acid Leakage / Cap Unsealed', TRUE);

-- 8. Seed Security Roles
INSERT INTO roles (role_name, description) VALUES
('Super Admin', 'Full master-level system administration capabilities.'),
('QA', 'Quality assurance personnel managing PDI checks, holds, and CAPA logs.'),
('Production', 'Production managers and operators managing batch yields and range allotments.'),
('PDI', 'Inspectors conducting Pre-Delivery physical and electrical checks.'),
('Dispatch', 'Logistics and warehousing team handling customer shipments.'),
('Viewer', 'Read-only access for analytics and audits.');

-- 9. Seed Core Users Mapped to Facilities
INSERT INTO users (email, full_name, role_name, primary_plant_id, is_active) VALUES
('admin@snmserp.com', 'Ankush Joshi (Architect)', 'Super Admin', 1, TRUE),
('qa.head@snmserp.com', 'Rajesh Kumar (QA Head)', 'QA', 1, TRUE),
('prod.mgr@snmserp.com', 'Sunil Sharma (Production)', 'Production', 1, TRUE),
('pdi.checker@snmserp.com', 'Amit Patel (PDI)', 'PDI', 2, TRUE),
('dispatch.wh@snmserp.com', 'Vijay Yadav (Logistics)', 'Dispatch', 3, TRUE);

-- 10. Seed Users Security Credentials (Mock BCrypt Hashes)
INSERT INTO user_credentials (user_id, password_hash, salt) VALUES
(1, '$2b$12$K1R2V7klytE73r7O.87nLeHn7m88A0zVfD0N0vjYfH1Tz7m4M2T5G', 'g392kfnw'),
(2, '$2b$12$R1Y2V7klytE73r7O.87nLeHn7m88A0zVfD0N0vjYfH1Tz7m4M2T5G', 'h29fj49d'),
(3, '$2b$12$G1R2V7klytE73r7O.87nLeHn7m88A0zVfD0N0vjYfH1Tz7m4M2T5G', 'ka82hf73'),
(4, '$2b$12$Y1R2V7klytE73r7O.87nLeHn7m88A0zVfD0N0vjYfH1Tz7m4M2T5G', 'n83hf7d2'),
(5, '$2b$12$U1R2V7klytE73r7O.87nLeHn7m88A0zVfD0N0vjYfH1Tz7m4M2T5G', 'js72hf8s');

-- 11. Seed Permissions Matrix
INSERT INTO permissions (permission_key, module_name, description) VALUES
('allot_serials', 'Allotment', 'Ability to create serial allotments range sets.'),
('register_production', 'Production', 'Ability to record battery production runs.'),
('audit_pdi', 'PDI', 'Ability to record pre-delivery inspection results.'),
('dispatch_order', 'Dispatch', 'Ability to release and scan out customer shipments.'),
('raise_hold', 'Quality', 'Ability to flag micro-cracks or acid failures.'),
('release_hold', 'Quality', 'Ability to resolve and release held stock.');

INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), -- Super Admin
(2, 5), (2, 6),                                 -- QA Team
(3, 1), (3, 2),                                 -- Production Team
(4, 3),                                         -- PDI Team
(5, 4);                                         -- Dispatch Team


-- ============================================================================
-- SECTION 9: TRANSACTIONS WORKFLOW SIMULATION (009_sample_data.sql)
-- ============================================================================

DO $$
DECLARE
    v_allotment_1 BIGINT;
    v_allotment_2 BIGINT;
    v_allotment_3 BIGINT;
    v_serial_id_1 BIGINT;
    v_serial_id_2 BIGINT;
    v_serial_id_3 BIGINT;
    v_serial_id_4 BIGINT;
    v_serial_id_5 BIGINT;
    v_serial_id_6 BIGINT;
    v_batch_prod BIGINT;
    v_batch_pack BIGINT;
    v_batch_pdi BIGINT;
    v_transfer_id BIGINT;
    v_dispatch_id BIGINT;
    v_nc_id BIGINT;
BEGIN
    -- 1. Allot ranges (Automated Batch Generation)
    v_allotment_1 := bulk_allocate_serial_range(1, 1, '26', '07', 50, 3);
    v_allotment_2 := bulk_allocate_serial_range(2, 3, '26', '07', 20, 3);
    v_allotment_3 := bulk_allocate_serial_range(3, 5, '26', '07', 10, 3);

    -- Retrieve generated IDs for custom transactions
    SELECT serial_id INTO v_serial_id_1 FROM serial_numbers WHERE serial_number = 'TR2607000001';
    SELECT serial_id INTO v_serial_id_2 FROM serial_numbers WHERE serial_number = 'TR2607000002';
    SELECT serial_id INTO v_serial_id_3 FROM serial_numbers WHERE serial_number = 'TR2607000003';
    SELECT serial_id INTO v_serial_id_4 FROM serial_numbers WHERE serial_number = 'FP2607000001';
    SELECT serial_id INTO v_serial_id_5 FROM serial_numbers WHERE serial_number = 'FP2607000002';
    SELECT serial_id INTO v_serial_id_6 FROM serial_numbers WHERE serial_number = 'IP2607000001';

    -- 2. Production Batch Registration (Forming & Charging)
    INSERT INTO production_batches (
        batch_number, production_line_id, shift_id, model_id, 
        date_produced, operator_name, supervisor_name, yield_qty, rejection_qty, status
    ) VALUES (
        'PROD-BATCH-20260710-01', 1, 1, 1, CURRENT_DATE, 'Ganesh Prasad', 'Sunil Sharma', 3, 0, 'Completed'
    ) RETURNING batch_id INTO v_batch_prod;

    -- Update states to Production
    PERFORM register_serial_transaction(v_serial_id_1, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');
    PERFORM register_serial_transaction(v_serial_id_2, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');
    PERFORM register_serial_transaction(v_serial_id_3, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');

    -- Details Link
    INSERT INTO production_batch_details (batch_id, serial_id, serial_number, status, operator_id) VALUES
    (v_batch_prod, v_serial_id_1, 'TR2607000001', 'Production', 3),
    (v_batch_prod, v_serial_id_2, 'TR2607000002', 'Production', 3),
    (v_batch_prod, v_serial_id_3, 'TR2607000003', 'Production', 3);

    -- Ambient curing metrics
    INSERT INTO production_stage_history (serial_id, stage, operator_name, shift_id, start_time, end_time, machine_id, temperature_c, ambient_humidity) VALUES
    (v_serial_id_1, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.5, 65.0),
    (v_serial_id_2, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.2, 65.0),
    (v_serial_id_3, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.8, 65.0);

    -- 3. Packing Batch Registration (Conveyor Out)
    INSERT INTO packing_batches (
        batch_number, packing_line_id, shift_id, supervisor_name, pack_date, status
    ) VALUES (
        'PACK-BATCH-20260710-01', 1, 2, 'Devender Rawat', CURRENT_DATE, 'Completed'
    ) RETURNING batch_id INTO v_batch_pack;

    -- Update Serial States to Packing
    PERFORM register_serial_transaction(v_serial_id_1, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');
    PERFORM register_serial_transaction(v_serial_id_2, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');
    PERFORM register_serial_transaction(v_serial_id_3, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');

    -- Insert packing measurements
    INSERT INTO packing_details (batch_id, serial_id, serial_number, outer_carton_serial, master_pallet_no, weight_kg, volt_open_circuit, internal_resistance_m_ohm, packed_by) VALUES
    (v_batch_pack, v_serial_id_1, 'TR2607000001', 'CARTON-TR01', 'PALLET-CH-01', 48.50, 12.65, 4.20, 3),
    (v_batch_pack, v_serial_id_2, 'TR2607000002', 'CARTON-TR02', 'PALLET-CH-01', 48.65, 12.68, 4.15, 3),
    (v_batch_pack, v_serial_id_3, 'TR2607000003', 'CARTON-TR03', 'PALLET-CH-01', 48.42, 12.62, 4.30, 3);

    -- Consume physical master materials
    INSERT INTO packing_materials (batch_id, material_code, material_name, batch_code, qty_consumed, unit) VALUES
    (v_batch_pack, 'MAT-CASE-T1', 'Tall Tubular Polypropylene Casing', 'CAS-B109', 3.00, 'Nos'),
    (v_batch_pack, 'MAT-ACID-SG', 'Electrolyte Acid 1.250 SG', 'ACD-S120', 43.50, 'Liters'),
    (v_batch_pack, 'MAT-CARD-B1', 'Luminous Heavy Corrugated Box', 'BOX-H11', 3.00, 'Nos');

    -- 4. Pre-Delivery Inspection (PDI Testing)
    INSERT INTO pdi_batches (
        batch_number, plant_id, offered_date, supervisor_name, offer_qty, ok_qty, hold_qty, reject_qty, status
    ) VALUES (
        'PDI-BATCH-20260710-01', 1, CURRENT_DATE, 'Gopal Swamy', 3, 2, 1, 0, 'Completed'
    ) RETURNING batch_id INTO v_batch_pdi;

    -- Progress safe units
    PERFORM register_serial_transaction(v_serial_id_1, 'PDI_CHECK_OK', 'PDI Approved', 'Quality Inspection', 1, 4, '10.20.12.11', 'Passed physical, OCV, and load tests.');
    PERFORM register_serial_transaction(v_serial_id_2, 'PDI_CHECK_OK', 'PDI Approved', 'Quality Inspection', 1, 4, '10.20.12.11', 'Passed physical, OCV, and load tests.');
    
    -- Register quality hold
    PERFORM register_serial_transaction(v_serial_id_3, 'PDI_CHECK_HOLD', 'Hold', 'Quality Inspection', 1, 4, '10.20.12.11', 'High rate discharge capacity drop observed.');

    -- Enter PDI electrical metrics
    INSERT INTO pdi_details (batch_id, serial_id, serial_number, aesthetic_passed, electrical_passed, capacity_passed, volt_load_test, internal_resistance_test, high_rate_discharge_v, temp_corrected_sg, decision, checked_by) VALUES
    (v_batch_pdi, v_serial_id_1, 'TR2607000001', TRUE, TRUE, TRUE, 12.60, 4.10, 10.50, 1.260, 'OK', 4),
    (v_batch_pdi, v_serial_id_2, 'TR2607000002', TRUE, TRUE, TRUE, 12.62, 4.05, 10.60, 1.262, 'OK', 4),
    (v_batch_pdi, v_serial_id_3, 'TR2607000003', TRUE, FALSE, FALSE, 11.20, 8.50, 8.20, 1.240, 'Hold', 4);

    -- Flag quality hold in database register
    INSERT INTO first_time_hold (serial_id, serial_number, hold_reason_id, hold_category, plant_id, is_released, comments) VALUES
    (v_serial_id_3, 'TR2607000003', 4, 'PDI Hold', 1, FALSE, 'High Rate Discharge capacity dropped below 9.0V on load test.');

    -- Defect cataloging
    INSERT INTO pdi_defects (pdi_detail_id, defect_category, defect_description, severity) VALUES
    (3, 'Electrical Test Failure', 'High-Rate Discharge voltage dropped to 8.2V (Limit: Min 9.5V)', 'Critical');

    -- 5. Inter-Plant Transfers
    INSERT INTO transfer_requests (
        source_plant_id, destination_plant_id, requested_by, status, total_items, comments
    ) VALUES (
        2, 1, 2, 'Pending Approval', 2, 'Urgent stock balancing request for Flat Plate models'
    ) RETURNING transfer_id INTO v_transfer_id;

    INSERT INTO transfer_history (transfer_id, serial_id, serial_number, received_status) VALUES
    (v_transfer_id, v_serial_id_4, 'FP2607000001', 'Pending'),
    (v_transfer_id, v_serial_id_5, 'FP2607000002', 'Pending');

    -- 6. Outbound Dispatch Shipment
    INSERT INTO dispatch_headers (
        dispatch_no, customer_id, plant_id, dispatch_date, invoice_no, 
        vehicle_no, lr_no, transporter_name, driver_name, eway_bill_no, created_by
    ) VALUES (
        'DISP-20260710-001', 1, 1, CURRENT_DATE, 'INV-AMARA-8822', 
        'AP-03-TY-8821', 'LR-CH-99221', 'Amara Raja Logistics Pvt Ltd', 'Ramesh Yadav', 'EWB228192019', 5
    ) RETURNING dispatch_id INTO v_dispatch_id;

    -- Update Serial 1 to Customer state
    PERFORM register_serial_transaction(v_serial_id_1, 'DISPATCH_CONFIRMED', 'Dispatched', 'Dispatched', 1, 5, '10.20.14.88', 'Dispatched to Amara Raja Power Distributors.');

    INSERT INTO dispatch_details (dispatch_id, serial_id, serial_number, warranty_card_no, scanned_by) VALUES
    (v_dispatch_id, v_serial_id_1, 'TR2607000001', 'WARR-TR-001', 5);

    -- 7. CAPA Workflows
    INSERT INTO non_conformance (
        nc_number, serial_number, severity, root_cause_category, description, status, raised_by
    ) VALUES (
        'NC-20260710-003', 'TR2607000003', 'Major', 'Inter-cell weld failure / high resistance',
        'Plate group inter-cell resistance high during automated PDI charging check.', 'Open', 2
    ) RETURNING nc_id INTO v_nc_id;

    -- Dynamic why-why validation
    INSERT INTO capa (
        nc_id, problem_definition, root_cause, why_why_analysis, 
        preventive_action, corrective_action, target_date, status, owner
    ) VALUES (
        v_nc_id,
        'HRD test voltage dropped to 8.2V on battery TR2607000003.',
        'Improper inter-cell weld caused high internal resistance.',
        '{"why_1": "Why did the voltage drop? High internal resistance.", "why_2": "Why was resistance high? Inter-cell weld bond was thin.", "why_3": "Why was the weld thin? Welding machine current dropped momentarily.", "why_4": "Why did current drop? Pneumatic welding valve leaked slightly.", "why_5": "Why did it leak? Seal was worn out due to delayed scheduled maintenance."}'::jsonb,
        'Update pneumatic seal replacement schedules from 6 months to 4 months on MAC-WELDERS.',
        'Worn pneumatics on MAC-WELD-C1 replaced immediately. Re-tested all batches of Shift B.',
        CURRENT_DATE + INTERVAL '5 days', 'Investigating', 2
    );

    -- 8. Core Notifications
    INSERT INTO notifications (recipient_role, title, message, severity) VALUES
    ('QA', 'URGENT: PDI Hold Recorded', 'Battery TR2607000003 flagged for High-Rate Discharge failure.', 'High'),
    ('Super Admin', 'Database Maintenance Window', 'Routine performance checks scheduled for Sunday 02:00 AM UTC.', 'Info');

    INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('COMPANY_NAME', 'SNMS Lead Acid Battery Corp', 'Global enterprise entity title for reports'),
    ('PDI_SAMPLE_SIZE_PCT', '10.0', 'Percentage of lot quantity required to be selected as sample sizes for PDI tests');

END;
$$;

COMMIT;
