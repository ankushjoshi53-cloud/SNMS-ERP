-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL AUTOMATED TRIGGERS
-- File: 006_triggers.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Global Timestamp Management Function and Triggers
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
