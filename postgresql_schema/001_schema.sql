-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL MAIN SCHEMA DEFINITIONS
-- File: 001_schema.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- Ensure uuid-ossp is available for UUID keys where needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. MASTERS MODULE
-- ============================================================================

CREATE TABLE plants (
    plant_id BIGSERIAL PRIMARY KEY,
    plant_code VARCHAR(10) UNIQUE NOT NULL,
    plant_name VARCHAR(100) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE customers (
    customer_id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(15) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100),
    country VARCHAR(50) DEFAULT 'India' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE battery_models (
    model_id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(25) UNIQUE NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    battery_type battery_type_enum NOT NULL,
    nominal_capacity_ah INT NOT NULL,
    warranty_months INT NOT NULL,
    prefix VARCHAR(5) UNIQUE NOT NULL,
    year_code_pos INT DEFAULT 1 NOT NULL,
    month_code_pos INT DEFAULT 2 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE product_specifications (
    specification_id BIGSERIAL PRIMARY KEY,
    model_id BIGINT UNIQUE NOT NULL REFERENCES battery_models(model_id) ON DELETE CASCADE,
    active_material_weight_g DECIMAL(8,2) NOT NULL,
    specific_gravity_std DECIMAL(4,3) NOT NULL,
    acid_volume_liters DECIMAL(5,2) NOT NULL,
    cell_count INT DEFAULT 6 NOT NULL,
    grid_alloy VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE packing_lines (
    line_id BIGSERIAL PRIMARY KEY,
    line_code VARCHAR(10) UNIQUE NOT NULL,
    line_name VARCHAR(50) NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE production_lines (
    line_id BIGSERIAL PRIMARY KEY,
    line_code VARCHAR(10) UNIQUE NOT NULL,
    line_name VARCHAR(50) NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE shifts (
    shift_id BIGSERIAL PRIMARY KEY,
    shift_type shift_type_enum NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 1. SECURITY MODULE
-- ============================================================================

CREATE TABLE roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name user_role_enum UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE permissions (
    permission_id BIGSERIAL PRIMARY KEY,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_name user_role_enum NOT NULL,
    primary_plant_id BIGINT REFERENCES plants(plant_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    failed_login_attempts INT DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_credentials (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    status session_status_enum DEFAULT 'Active' NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE login_history (
    history_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    is_successful BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE password_history (
    history_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 3. SERIAL NUMBER MANAGEMENT MODULE
-- ============================================================================

CREATE TABLE serial_range_allotments (
    allotment_id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id),
    year_code VARCHAR(2) NOT NULL,
    month_code VARCHAR(2) NOT NULL,
    range_start VARCHAR(30) UNIQUE NOT NULL,
    range_end VARCHAR(30) UNIQUE NOT NULL,
    prefix VARCHAR(5) NOT NULL,
    running_number_start INT NOT NULL,
    running_number_end INT NOT NULL,
    created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE serial_numbers (
    serial_id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(30) UNIQUE NOT NULL,
    allotment_id BIGINT REFERENCES serial_range_allotments(allotment_id) ON DELETE SET NULL,
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id),
    battery_type battery_type_enum NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    current_stage serial_stage_enum DEFAULT 'Allotment' NOT NULL,
    current_status serial_status_enum DEFAULT 'Allocated' NOT NULL,
    current_owner VARCHAR(100) DEFAULT 'Plant Warehouse' NOT NULL,
    year_code VARCHAR(2) NOT NULL,
    month_code VARCHAR(2) NOT NULL,
    running_number INT NOT NULL,
    holds_count INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE serial_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    serial_number VARCHAR(30) NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    previous_status serial_status_enum,
    previous_stage serial_stage_enum,
    previous_plant_id BIGINT REFERENCES plants(plant_id),
    new_status serial_status_enum NOT NULL,
    new_stage serial_stage_enum NOT NULL,
    new_plant_id BIGINT REFERENCES plants(plant_id),
    created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE serial_history (
    history_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    transaction_id BIGINT NOT NULL REFERENCES serial_transactions(transaction_id) ON DELETE CASCADE,
    historical_data_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE serial_balance (
    balance_id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id),
    current_status serial_status_enum NOT NULL,
    quantity INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(plant_id, model_id, current_status)
);

-- ============================================================================
-- 4. PRODUCTION MODULE
-- ============================================================================

CREATE TABLE production_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(30) UNIQUE NOT NULL,
    production_line_id BIGINT NOT NULL REFERENCES production_lines(line_id),
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id),
    model_id BIGINT NOT NULL REFERENCES battery_models(model_id),
    date_produced DATE NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    supervisor_name VARCHAR(100) NOT NULL,
    yield_qty INT DEFAULT 0 NOT NULL,
    rejection_qty INT DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'In Progress' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE production_batch_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id),
    serial_number VARCHAR(30) NOT NULL,
    status serial_status_enum DEFAULT 'Production' NOT NULL,
    operator_id BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE production_stage_history (
    stage_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    stage serial_stage_enum NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    machine_id VARCHAR(50) NOT NULL,
    temperature_c DECIMAL(4,1),
    ambient_humidity DECIMAL(4,1)
);

CREATE TABLE production_rejections (
    rejection_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    serial_number VARCHAR(30) NOT NULL,
    defect_reason TEXT NOT NULL,
    stage_failed serial_stage_enum NOT NULL,
    raw_material_defect BOOLEAN DEFAULT FALSE NOT NULL,
    recorded_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 5. PACKING MODULE
-- ============================================================================

CREATE TABLE packing_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(30) UNIQUE NOT NULL,
    packing_line_id BIGINT NOT NULL REFERENCES packing_lines(line_id),
    shift_id BIGINT NOT NULL REFERENCES shifts(shift_id),
    supervisor_name VARCHAR(100) NOT NULL,
    pack_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Open' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE packing_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES packing_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id),
    serial_number VARCHAR(30) NOT NULL,
    outer_carton_serial VARCHAR(50),
    master_pallet_no VARCHAR(50),
    weight_kg DECIMAL(5,2) NOT NULL,
    volt_open_circuit DECIMAL(4,2) NOT NULL,
    internal_resistance_m_ohm DECIMAL(4,2) NOT NULL,
    packed_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE packing_materials (
    material_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES packing_batches(batch_id) ON DELETE CASCADE,
    material_code VARCHAR(30) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    batch_code VARCHAR(30) NOT NULL,
    qty_consumed DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 6. PDI (PRE-DELIVERY INSPECTION) MODULE
-- ============================================================================

CREATE TABLE pdi_batches (
    batch_id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(30) UNIQUE NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    offered_date DATE NOT NULL,
    supervisor_name VARCHAR(100) NOT NULL,
    offer_qty INT DEFAULT 0 NOT NULL,
    ok_qty INT DEFAULT 0 NOT NULL,
    hold_qty INT DEFAULT 0 NOT NULL,
    reject_qty INT DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'In Progress' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pdi_details (
    detail_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES pdi_batches(batch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id),
    serial_number VARCHAR(30) NOT NULL,
    aesthetic_passed BOOLEAN DEFAULT TRUE NOT NULL,
    electrical_passed BOOLEAN DEFAULT TRUE NOT NULL,
    capacity_passed BOOLEAN DEFAULT TRUE NOT NULL,
    volt_load_test DECIMAL(4,2),
    internal_resistance_test DECIMAL(4,2),
    high_rate_discharge_v DECIMAL(4,2),
    temp_corrected_sg DECIMAL(4,3),
    decision pdi_status_enum NOT NULL,
    checked_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pdi_defects (
    defect_id BIGSERIAL PRIMARY KEY,
    pdi_detail_id BIGINT NOT NULL REFERENCES pdi_details(detail_id) ON DELETE CASCADE,
    defect_category VARCHAR(50) NOT NULL,
    defect_description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'Minor' NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pdi_offered (
    offered_id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES pdi_batches(batch_id) ON DELETE CASCADE,
    lot_number VARCHAR(30) UNIQUE NOT NULL,
    offered_qty INT NOT NULL,
    sample_size INT NOT NULL,
    inspected_qty INT DEFAULT 0 NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 7. TRANSFER MODULE (PLANT TO PLANT)
-- ============================================================================

CREATE TABLE transfer_requests (
    transfer_id BIGSERIAL PRIMARY KEY,
    source_plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    destination_plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    requested_by BIGINT NOT NULL REFERENCES users(user_id),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status transfer_status_enum DEFAULT 'Draft' NOT NULL,
    total_items INT DEFAULT 0 NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE transfer_approvals (
    approval_id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES transfer_requests(transfer_id) ON DELETE CASCADE,
    approved_by BIGINT NOT NULL REFERENCES users(user_id),
    approval_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    decision VARCHAR(20) NOT NULL,
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE transfer_history (
    history_id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES transfer_requests(transfer_id) ON DELETE CASCADE,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id),
    serial_number VARCHAR(30) NOT NULL,
    received_status VARCHAR(20) DEFAULT 'Pending' NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE,
    received_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 8. DISPATCH MODULE (SHIPMENT & CUSTOMER LOGISTICS)
-- ============================================================================

CREATE TABLE dispatch_headers (
    dispatch_id BIGSERIAL PRIMARY KEY,
    dispatch_no VARCHAR(30) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    dispatch_date DATE NOT NULL,
    invoice_no VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    lr_no VARCHAR(50),
    transporter_name VARCHAR(100) NOT NULL,
    driver_name VARCHAR(100),
    eway_bill_no VARCHAR(30),
    created_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE dispatch_details (
    detail_id BIGSERIAL PRIMARY KEY,
    dispatch_id BIGINT NOT NULL REFERENCES dispatch_headers(dispatch_id) ON DELETE CASCADE,
    serial_id BIGINT UNIQUE NOT NULL REFERENCES serial_numbers(serial_id),
    serial_number VARCHAR(30) NOT NULL,
    warranty_card_no VARCHAR(30),
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scanned_by BIGINT REFERENCES users(user_id)
);

CREATE TABLE dispatch_documents (
    document_id BIGSERIAL PRIMARY KEY,
    dispatch_id BIGINT NOT NULL REFERENCES dispatch_headers(dispatch_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(user_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 9. QUALITY & COMPLIANCE MODULE
-- ============================================================================

CREATE TABLE hold_reasons (
    reason_id BIGSERIAL PRIMARY KEY,
    reason_code VARCHAR(15) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE first_time_hold (
    hold_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    serial_number VARCHAR(30) NOT NULL,
    hold_reason_id BIGINT REFERENCES hold_reasons(reason_id),
    hold_category hold_category_enum NOT NULL,
    plant_id BIGINT NOT NULL REFERENCES plants(plant_id),
    released_by BIGINT REFERENCES users(user_id),
    released_at TIMESTAMP WITH TIME ZONE,
    is_released BOOLEAN DEFAULT FALSE NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE quality_reports (
    report_id BIGSERIAL PRIMARY KEY,
    serial_id BIGINT NOT NULL REFERENCES serial_numbers(serial_id) ON DELETE CASCADE,
    test_date DATE NOT NULL,
    cell_1_sg DECIMAL(4,3) NOT NULL,
    cell_2_sg DECIMAL(4,3) NOT NULL,
    cell_3_sg DECIMAL(4,3) NOT NULL,
    cell_4_sg DECIMAL(4,3) NOT NULL,
    cell_5_sg DECIMAL(4,3) NOT NULL,
    cell_6_sg DECIMAL(4,3) NOT NULL,
    total_voltage DECIMAL(4,2) NOT NULL,
    low_rate_test_seconds INT,
    verdict VARCHAR(20) NOT NULL,
    tested_by BIGINT REFERENCES users(user_id)
);

CREATE TABLE non_conformance (
    nc_id BIGSERIAL PRIMARY KEY,
    nc_number VARCHAR(30) UNIQUE NOT NULL,
    serial_number VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    root_cause_category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Open' NOT NULL,
    raised_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE capa (
    capa_id BIGSERIAL PRIMARY KEY,
    nc_id BIGINT NOT NULL REFERENCES non_conformance(nc_id) ON DELETE CASCADE,
    problem_definition TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    why_why_analysis JSONB NOT NULL,
    preventive_action TEXT NOT NULL,
    corrective_action TEXT NOT NULL,
    target_date DATE NOT NULL,
    status capa_status_enum DEFAULT 'Draft' NOT NULL,
    owner BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 11. DASHBOARD & SYSTEM CONFIGS
-- ============================================================================

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    recipient_role user_role_enum,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    severity VARCHAR(15) DEFAULT 'Info' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE dashboard_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    metric_key VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,2) NOT NULL,
    plant_id BIGINT REFERENCES plants(plant_id) ON DELETE CASCADE,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(metric_key, plant_id)
);

CREATE TABLE system_settings (
    setting_id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 12. AUDIT MODULE
-- ============================================================================

CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    action_type audit_action_enum NOT NULL,
    table_name VARCHAR(100),
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    is_successful BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE system_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE api_logs (
    log_id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    status_code INT NOT NULL,
    request_payload JSONB,
    ip_address VARCHAR(45) NOT NULL,
    execution_time_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- METADATA COMMENTS FOR REPOSITORIES & COMPLIANCE
-- ============================================================================

COMMENT ON TABLE plants IS 'Lead Acid Battery manufacturing production sites (plants) operating in the ecosystem.';
COMMENT ON TABLE users IS 'Master employee table storing personnel identities with dynamic security access bounds.';
COMMENT ON TABLE serial_numbers IS 'Core tracking ledger storing individual lead acid battery serials and absolute real-time states.';
COMMENT ON TABLE serial_transactions IS 'Historical chronological ledger logging every lifecycle state alteration on serial codes.';
COMMENT ON TABLE capa IS 'Root Cause Corrective and Preventive Action logs mapping product structural and material issues.';
