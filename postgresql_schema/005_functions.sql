-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL STORED PROCEDURES & PL/pgSQL FUNCTIONS
-- File: 005_functions.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Helper to record custom audit logs securely within triggers/functions
CREATE OR REPLACE FUNCTION log_system_audit(
    p_username VARCHAR(100),
    p_action audit_action_enum,
    p_table VARCHAR(100),
    p_record_id BIGINT,
    p_old_vals JSONB,
    p_new_vals JSONB,
    p_ip VARCHAR(45),
    p_agent TEXT,
    p_success BOOLEAN,
    p_notes TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_log_id BIGINT;
BEGIN
    INSERT INTO audit_logs (
        username, action_type, table_name, record_id, 
        old_values, new_values, ip_address, user_agent, 
        is_successful, notes, created_at
    ) VALUES (
        p_username, p_action, p_table, p_record_id, 
        p_old_vals, p_new_vals, COALESCE(p_ip, '127.0.0.1'), COALESCE(p_agent, 'System Daemon'), 
        p_success, p_notes, CURRENT_TIMESTAMP
    ) RETURNING log_id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Transactional API to register serial movements and update dynamic counters
CREATE OR REPLACE FUNCTION register_serial_transaction(
    p_serial_id BIGINT,
    p_transaction_type transaction_type_enum,
    p_new_status serial_status_enum,
    p_new_stage serial_stage_enum,
    p_new_plant_id BIGINT,
    p_user_id BIGINT,
    p_ip_address VARCHAR(45),
    p_notes TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_serial_no VARCHAR(30);
    v_old_status serial_status_enum;
    v_old_stage serial_stage_enum;
    v_old_plant_id BIGINT;
    v_tx_id BIGINT;
    v_hist_json JSONB;
BEGIN
    -- Fetch current state and lock serial row for concurrency protection
    SELECT serial_number, current_status, current_stage, plant_id
    INTO v_serial_no, v_old_status, v_old_stage, v_old_plant_id
    FROM serial_numbers
    WHERE serial_id = p_serial_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Serial ID % not found in database ledger.', p_serial_id;
    END IF;

    -- Update main Serial Record with validation checks
    UPDATE serial_numbers
    SET current_status = p_new_status,
        current_stage = p_new_stage,
        plant_id = COALESCE(p_new_plant_id, plant_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE serial_id = p_serial_id;

    -- Update dynamic balance counters for previous and new states
    -- Decrease previous state counter
    INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
    SELECT v_old_plant_id, model_id, v_old_status, 0, CURRENT_TIMESTAMP FROM serial_numbers WHERE serial_id = p_serial_id
    ON CONFLICT (plant_id, model_id, current_status) DO NOTHING;
    
    UPDATE serial_balance
    SET quantity = GREATEST(quantity - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE plant_id = v_old_plant_id
      AND current_status = v_old_status
      AND model_id = (SELECT model_id FROM serial_numbers WHERE serial_id = p_serial_id);

    -- Increase new state counter
    INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
    SELECT COALESCE(p_new_plant_id, v_old_plant_id), model_id, p_new_status, 0, CURRENT_TIMESTAMP FROM serial_numbers WHERE serial_id = p_serial_id
    ON CONFLICT (plant_id, model_id, current_status) DO NOTHING;

    UPDATE serial_balance
    SET quantity = quantity + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE plant_id = COALESCE(p_new_plant_id, v_old_plant_id)
      AND current_status = p_new_status
      AND model_id = (SELECT model_id FROM serial_numbers WHERE serial_id = p_serial_id);

    -- Insert Audit Transaction record
    INSERT INTO serial_transactions (
        serial_id, serial_number, transaction_type, 
        previous_status, previous_stage, previous_plant_id, 
        new_status, new_stage, new_plant_id, 
        created_by, ip_address, notes, created_at
    ) VALUES (
        p_serial_id, v_serial_no, p_transaction_type,
        v_old_status, v_old_stage, v_old_plant_id,
        p_new_status, p_new_stage, COALESCE(p_new_plant_id, v_old_plant_id),
        p_user_id, p_ip_address, p_notes, CURRENT_TIMESTAMP
    ) RETURNING transaction_id INTO v_tx_id;

    -- Build structured history backup block
    v_hist_json := jsonb_build_object(
        'transaction_id', v_tx_id,
        'serial_no', v_serial_no,
        'previous', jsonb_build_object('status', v_old_status, 'stage', v_old_stage, 'plant_id', v_old_plant_id),
        'new', jsonb_build_object('status', p_new_status, 'stage', p_new_stage, 'plant_id', COALESCE(p_new_plant_id, v_old_plant_id)),
        'timestamp', CURRENT_TIMESTAMP,
        'operator_user_id', p_user_id,
        'notes', p_notes
    );

    -- Log transaction snapshot inside historical JSON GIN indexable ledger
    INSERT INTO serial_history (serial_id, transaction_id, historical_data_json, created_at)
    VALUES (p_serial_id, v_tx_id, v_hist_json, CURRENT_TIMESTAMP);

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. High-Performance Bulk Range Generation Utility for Manufacturing Planning
CREATE OR REPLACE FUNCTION bulk_allocate_serial_range(
    p_plant_id BIGINT,
    p_model_id BIGINT,
    p_year_code VARCHAR(2),
    p_month_code VARCHAR(2),
    p_quantity INT,
    p_user_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_prefix VARCHAR(5);
    v_start_num INT := 1;
    v_end_num INT;
    v_allotment_id BIGINT;
    v_range_start VARCHAR(30);
    v_range_end VARCHAR(30);
    i INT;
    v_battery_type battery_type_enum;
BEGIN
    -- Verify model validation specs
    SELECT prefix, battery_type INTO v_prefix, v_battery_type FROM battery_models WHERE model_id = p_model_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Model ID % does not exist.', p_model_id;
    END IF;

    -- Determine running number sequence bounds based on previous allotments
    SELECT COALESCE(MAX(running_number_end), 0) + 1 INTO v_start_num
    FROM serial_range_allotments
    WHERE plant_id = p_plant_id
      AND model_id = p_model_id
      AND year_code = p_year_code
      AND month_code = p_month_code;

    v_end_num := v_start_num + p_quantity - 1;

    -- Formulate human-readable range markers
    v_range_start := v_prefix || p_year_code || p_month_code || lpad(v_start_num::text, 6, '0');
    v_range_end := v_prefix || p_year_code || p_month_code || lpad(v_end_num::text, 6, '0');

    -- Insert into Ranges
    INSERT INTO serial_range_allotments (
        plant_id, model_id, year_code, month_code, 
        range_start, range_end, prefix, 
        running_number_start, running_number_end, 
        created_by, created_at
    ) VALUES (
        p_plant_id, p_model_id, p_year_code, p_month_code,
        v_range_start, v_range_end, v_prefix,
        v_start_num, v_end_num,
        p_user_id, CURRENT_TIMESTAMP
    ) RETURNING allotment_id INTO v_allotment_id;

    -- Bulk populate the individual serial records with single multi-insert
    INSERT INTO serial_numbers (
        serial_number, allotment_id, model_id, battery_type,
        plant_id, current_stage, current_status,
        year_code, month_code, running_number, holds_count, is_active, created_at, updated_at
    )
    SELECT 
        v_prefix || p_year_code || p_month_code || lpad(num::text, 6, '0'),
        v_allotment_id, p_model_id, v_battery_type,
        p_plant_id, 'Allotment', 'Allocated',
        p_year_code, p_month_code, num, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM generate_series(v_start_num, v_end_num) AS num;

    -- Synchronize dynamic balances
    INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
    VALUES (p_plant_id, p_model_id, 'Allocated', p_quantity, CURRENT_TIMESTAMP)
    ON CONFLICT (plant_id, model_id, current_status) 
    DO UPDATE SET quantity = serial_balance.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;

    -- Log Master Admin Range Audit
    PERFORM log_system_audit(
        'System Planner', 'INSERT', 'serial_range_allotments', v_allotment_id,
        NULL, jsonb_build_object('start', v_range_start, 'end', v_range_end, 'qty', p_quantity),
        '127.0.0.1', 'API System Service', TRUE, 'Allotted series ' || v_range_start || ' to ' || v_range_end
    );

    RETURN v_allotment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Safe Procedure to Release Quality Hold on Batteries
CREATE OR REPLACE PROCEDURE release_quality_hold_procedure(
    p_serial_id BIGINT,
    p_released_by BIGINT,
    p_comments TEXT,
    p_ip_address VARCHAR(45)
) AS $$
DECLARE
    v_serial_no VARCHAR(30);
    v_plant_id BIGINT;
    v_old_status serial_status_enum;
    v_new_status serial_status_enum;
    v_new_stage serial_stage_enum;
BEGIN
    -- Validate current state
    SELECT serial_number, plant_id, current_status INTO v_serial_no, v_plant_id, v_old_status
    FROM serial_numbers WHERE serial_id = p_serial_id FOR UPDATE;

    IF v_old_status != 'Hold' THEN
        RAISE EXCEPTION 'Serial % is not currently on Hold. Status is %', v_serial_no, v_old_status;
    END IF;

    -- Update first_time_hold record
    UPDATE first_time_hold
    SET released_by = p_released_by,
        released_at = CURRENT_TIMESTAMP,
        is_released = TRUE,
        comments = COALESCE(comments, '') || ' | Released: ' || p_comments
    WHERE serial_id = p_serial_id AND is_released = FALSE;

    -- Identify the target destination based on transaction history
    -- We roll back to the state previous to Hold. Default to PDI Approved/Production if not trace-able
    SELECT previous_status, previous_stage INTO v_new_status, v_new_stage
    FROM serial_transactions
    WHERE serial_id = p_serial_id AND transaction_type = 'PDI_CHECK_HOLD'
    ORDER BY created_at DESC LIMIT 1;

    IF v_new_status IS NULL OR v_new_status = 'Hold' THEN
        v_new_status := 'PDI Approved';
        v_new_stage := 'Quality Inspection';
    END IF;

    -- Process status reversion and balance synchronization
    PERFORM register_serial_transaction(
        p_serial_id,
        'STATUS_HOLD_RELEASE',
        v_new_status,
        v_new_stage,
        v_plant_id,
        p_released_by,
        p_ip_address,
        'Quality Hold Release: ' || p_comments
    );

    -- Log secure audit log
    PERFORM log_system_audit(
        (SELECT email FROM users WHERE user_id = p_released_by), 'UPDATE', 'first_time_hold', p_serial_id,
        jsonb_build_object('previous_status', 'Hold'), jsonb_build_object('released_status', v_new_status),
        p_ip_address, 'API Client', TRUE, 'Released hold on ' || v_serial_no
    );
END;
$$ LANGUAGE plpgsql;
