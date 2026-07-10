-- ============================================================================
-- SNMS ERP v2.0 - ENTERPRISE ETL & MIGRATION BLUPEPRINT
-- File: 011_migration_script.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Create Staging/Temp Isolation Tables for Flat Legacy Data
CREATE TABLE temp_legacy_serials (
    serial_number VARCHAR(100),
    battery_model VARCHAR(100),
    battery_type VARCHAR(100),
    plant_code VARCHAR(50),
    current_status VARCHAR(50),
    curing_stage VARCHAR(50),
    creation_date VARCHAR(50),
    operator_name VARCHAR(100),
    ocv_voltage VARCHAR(50),
    resistance VARCHAR(50),
    customer_code VARCHAR(50),
    dispatch_invoice VARCHAR(100)
);

COMMENT ON TABLE temp_legacy_serials IS 'Temporary holding table for flat ETL loads. Staged records are validated before relational loading.';


-- 2. Populate Sample Staged Records (Simulating JSON/CSV Load)
INSERT INTO temp_legacy_serials (
    serial_number, battery_model, battery_type, plant_code, current_status, 
    curing_stage, creation_date, operator_name, ocv_voltage, resistance, customer_code, dispatch_invoice
) VALUES
('TR2607999881', 'TUB-150-RC', 'Tubular', 'PL001', 'Dispatched', 'Dispatched', '2026-07-01 10:00:00', 'Ganesh Prasad', '12.65', '4.2', 'CUST-AMARA', 'INV-AMARA-8822'),
('TR2607999882', 'TUB-150-RC', 'Tubular', 'PL001', 'PDI Approved', 'Quality Inspection', '2026-07-02 11:30:00', 'Ganesh Prasad', '12.68', '4.1', NULL, NULL),
('FP2607999883', 'FLT-120-SL', 'Flat Plate', 'PL002', 'Hold', 'Quality Inspection', '2026-07-03 14:15:00', 'Rajesh Kumar', '11.85', '8.9', NULL, NULL);


-- 3. Migration Transaction Block with Mapping Conversions
DO $$
DECLARE
    v_rows_migrated INT := 0;
    v_errors_caught INT := 0;
    v_rec RECORD;
    v_model_id BIGINT;
    v_plant_id BIGINT;
    v_allot_id BIGINT;
    v_serial_id BIGINT;
    v_status_map serial_status_enum;
    v_stage_map serial_stage_enum;
BEGIN
    RAISE NOTICE 'Starting migration from temp_legacy_serials to SNMS v2.0 Schema...';

    FOR v_rec IN SELECT * FROM temp_legacy_serials LOOP
        BEGIN
            -- Validate and retrieve Battery Model Reference
            SELECT model_id INTO v_model_id FROM battery_models WHERE model_code = v_rec.battery_model;
            IF v_model_id IS NULL THEN
                RAISE EXCEPTION 'Validation Failed: Model code % is unregistered in master list.', v_rec.battery_model;
            END IF;

            -- Validate and retrieve Plant Reference
            SELECT plant_id INTO v_plant_id FROM plants WHERE plant_code = v_rec.plant_code;
            IF v_plant_id IS NULL THEN
                RAISE EXCEPTION 'Validation Failed: Plant code % is unregistered in master list.', v_rec.plant_code;
            END IF;

            -- Map Legacy status values to strict ENUM domains
            v_status_map := CASE v_rec.current_status
                WHEN 'Produced' THEN 'Production'::serial_status_enum
                WHEN 'Packed' THEN 'Packing'::serial_status_enum
                WHEN 'Dispatched' THEN 'Customer'::serial_status_enum
                WHEN 'Hold' THEN 'Hold'::serial_status_enum
                ELSE v_rec.current_status::serial_status_enum
            END;

            -- Map Legacy stages to strict stage ENUM domains
            v_stage_map := CASE v_rec.curing_stage
                WHEN 'Assembly' THEN 'Assembly'::serial_stage_enum
                WHEN 'Curing' THEN 'Assembly'::serial_stage_enum
                WHEN 'Quality Inspection' THEN 'Quality Inspection'::serial_stage_enum
                WHEN 'Dispatched' THEN 'Dispatched'::serial_stage_enum
                ELSE 'Allotment'::serial_stage_enum
            END;

            -- Allot a virtual placeholder range for migrated numbers if range records don't exist
            SELECT allotment_id INTO v_allot_id 
            FROM serial_range_allotments 
            WHERE plant_id = v_plant_id AND model_id = v_model_id AND year_code = '26' AND month_code = '07';

            IF v_allot_id IS NULL THEN
                INSERT INTO serial_range_allotments (
                    plant_id, model_id, year_code, month_code, range_start, range_end, prefix, running_number_start, running_number_end
                ) VALUES (
                    v_plant_id, v_model_id, '26', '07', 'MIG_RNG_' || v_rec.battery_model || '_001', 'MIG_RNG_' || v_rec.battery_model || '_999', 'MIG', 1, 999
                ) RETURNING allotment_id INTO v_allot_id;
            END IF;

            -- Insert clean record into normalized ledger
            INSERT INTO serial_numbers (
                serial_number, allotment_id, model_id, battery_type, plant_id, 
                current_stage, current_status, current_owner, year_code, month_code, running_number, holds_count, is_active, created_at, updated_at
            ) VALUES (
                v_rec.serial_number, v_allot_id, v_model_id, v_rec.battery_type::battery_type_enum, v_plant_id,
                v_stage_map, v_status_map, COALESCE(v_rec.customer_code, 'Plant Warehouse'), '26', '07', 
                substring(v_rec.serial_number from 7 for 6)::INT, 
                CASE WHEN v_status_map = 'Hold' THEN 1 ELSE 0 END, 
                TRUE, COALESCE(v_rec.creation_date::TIMESTAMP WITH TIME ZONE, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
            ) RETURNING serial_id INTO v_serial_id;

            -- Generate initial movement log tracking entry
            INSERT INTO serial_transactions (
                serial_id, serial_number, transaction_type, previous_status, previous_stage, 
                new_status, new_stage, new_plant_id, notes, created_at
            ) VALUES (
                v_serial_id, v_rec.serial_number, 'ALLOTMENT_CREATE', NULL, NULL,
                v_status_map, v_stage_map, v_plant_id, 'Migrated from Legacy SNMS System.', COALESCE(v_rec.creation_date::TIMESTAMP WITH TIME ZONE, CURRENT_TIMESTAMP)
            );

            -- Settle dynamic balances
            INSERT INTO serial_balance (plant_id, model_id, current_status, quantity, updated_at)
            VALUES (v_plant_id, v_model_id, v_status_map, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (plant_id, model_id, current_status) 
            DO UPDATE SET quantity = serial_balance.quantity + 1, updated_at = CURRENT_TIMESTAMP;

            v_rows_migrated := v_rows_migrated + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors_caught := v_errors_caught + 1;
            RAISE WARNING 'ETL Failure on serial %: %', v_rec.serial_number, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Migration Complete. Clean Rows Imported: %, Validation Errors Logged: %', v_rows_migrated, v_errors_caught;
END;
$$;


-- 4. Clean up temporary extraction tables
DROP TABLE temp_legacy_serials;
