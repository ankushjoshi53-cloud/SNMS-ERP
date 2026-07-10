-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL TRANSACTIONAL WORKFLOW SIMULATION
-- File: 009_sample_data.sql
-- Role: Senior PostgreSQL Database Architect
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
    -- ========================================================================
    -- 1. STAGE A: RANGE ALLOTMENTS (AUTOMATED BATCH GENERATION)
    -- ========================================================================
    -- Allot 50 Red Charge 150Ah Tubular Serials for Chittoor Plant, Year Code 26, Month Code 07
    v_allotment_1 := bulk_allocate_serial_range(1, 1, '26', '07', 50, 3);
    
    -- Allot 20 Slimline Flat 120Ah Serials for Haridwar Plant, Year Code 26, Month Code 07
    v_allotment_2 := bulk_allocate_serial_range(2, 3, '26', '07', 20, 3);
    
    -- Allot 10 VRLA Industrial Serials for Pune Plant, Year Code 26, Month Code 07
    v_allotment_3 := bulk_allocate_serial_range(3, 5, '26', '07', 10, 3);

    -- Retrieve generated IDs to use in custom transactions
    SELECT serial_id INTO v_serial_id_1 FROM serial_numbers WHERE serial_number = 'TR2607000001';
    SELECT serial_id INTO v_serial_id_2 FROM serial_numbers WHERE serial_number = 'TR2607000002';
    SELECT serial_id INTO v_serial_id_3 FROM serial_numbers WHERE serial_number = 'TR2607000003';
    SELECT serial_id INTO v_serial_id_4 FROM serial_numbers WHERE serial_number = 'FP2607000001';
    SELECT serial_id INTO v_serial_id_5 FROM serial_numbers WHERE serial_number = 'FP2607000002';
    SELECT serial_id INTO v_serial_id_6 FROM serial_numbers WHERE serial_number = 'IP2607000001';

    -- ========================================================================
    -- 2. STAGE B: PRODUCTION BATCH REGISTRATION (FORMING & CHARGING)
    -- ========================================================================
    INSERT INTO production_batches (
        batch_number, production_line_id, shift_id, model_id, 
        date_produced, operator_name, supervisor_name, yield_qty, rejection_qty, status
    ) VALUES (
        'PROD-BATCH-20260710-01', 1, 1, 1, CURRENT_DATE, 'Ganesh Prasad', 'Sunil Sharma', 3, 0, 'Completed'
    ) RETURNING batch_id INTO v_batch_prod;

    -- Update Serial States to Production (Assembly & Curing)
    PERFORM register_serial_transaction(v_serial_id_1, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');
    PERFORM register_serial_transaction(v_serial_id_2, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');
    PERFORM register_serial_transaction(v_serial_id_3, 'PRODUCTION_REGISTER', 'Production', 'Assembly', 1, 3, '10.20.10.23', 'Registered in assembly run');

    -- Build details link
    INSERT INTO production_batch_details (batch_id, serial_id, serial_number, status, operator_id) VALUES
    (v_batch_prod, v_serial_id_1, 'TR2607000001', 'Production', 3),
    (v_batch_prod, v_serial_id_2, 'TR2607000002', 'Production', 3),
    (v_batch_prod, v_serial_id_3, 'TR2607000003', 'Production', 3);

    -- Log ambient curing metrics
    INSERT INTO production_stage_history (serial_id, stage, operator_name, shift_id, start_time, end_time, machine_id, temperature_c, ambient_humidity) VALUES
    (v_serial_id_1, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.5, 65.0),
    (v_serial_id_2, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.2, 65.0),
    (v_serial_id_3, 'Assembly', 'Ganesh Prasad', 1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'MAC-GRID-C3', 42.8, 65.0);

    -- ========================================================================
    -- 3. STAGE C: PACKING BATCH REGISTRATION (CONVEYOR OUT)
    -- ========================================================================
    INSERT INTO packing_batches (
        batch_number, packing_line_id, shift_id, supervisor_name, pack_date, status
    ) VALUES (
        'PACK-BATCH-20260710-01', 1, 2, 'Devender Rawat', CURRENT_DATE, 'Completed'
    ) RETURNING batch_id INTO v_batch_pack;

    -- Update Serial States to Packing
    PERFORM register_serial_transaction(v_serial_id_1, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');
    PERFORM register_serial_transaction(v_serial_id_2, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');
    PERFORM register_serial_transaction(v_serial_id_3, 'PACKING_COMPLETE', 'Packing', 'Packing Line', 1, 3, '10.20.10.45', 'Packed, OCV & Weight passed');

    -- Insert packing measurements (lead-acid parameters: OCV and Internal Resistance)
    INSERT INTO packing_details (batch_id, serial_id, serial_number, outer_carton_serial, master_pallet_no, weight_kg, volt_open_circuit, internal_resistance_m_ohm, packed_by) VALUES
    (v_batch_pack, v_serial_id_1, 'TR2607000001', 'CARTON-TR01', 'PALLET-CH-01', 48.50, 12.65, 4.20, 3),
    (v_batch_pack, v_serial_id_2, 'TR2607000002', 'CARTON-TR02', 'PALLET-CH-01', 48.65, 12.68, 4.15, 3),
    (v_batch_pack, v_serial_id_3, 'TR2607000003', 'CARTON-TR03', 'PALLET-CH-01', 48.42, 12.62, 4.30, 3);

    -- Consume physical master materials (Casing, Acid, Acid Plugs, Cardboards)
    INSERT INTO packing_materials (batch_id, material_code, material_name, batch_code, qty_consumed, unit) VALUES
    (v_batch_pack, 'MAT-CASE-T1', 'Tall Tubular Polypropylene Casing', 'CAS-B109', 3.00, 'Nos'),
    (v_batch_pack, 'MAT-ACID-SG', 'Electrolyte Acid 1.250 SG', 'ACD-S120', 43.50, 'Liters'),
    (v_batch_pack, 'MAT-CARD-B1', 'Luminous Heavy Corrugated Box', 'BOX-H11', 3.00, 'Nos');

    -- ========================================================================
    -- 4. STAGE D: PRE-DELIVERY INSPECTION (PDI TESTING)
    -- ========================================================================
    INSERT INTO pdi_batches (
        batch_number, plant_id, offered_date, supervisor_name, offer_qty, ok_qty, hold_qty, reject_qty, status
    ) VALUES (
        'PDI-BATCH-20260710-01', 1, CURRENT_DATE, 'Gopal Swamy', 3, 2, 1, 0, 'Completed'
    ) RETURNING batch_id INTO v_batch_pdi;

    -- Progress Serials 1 and 2 to PDI Approved
    PERFORM register_serial_transaction(v_serial_id_1, 'PDI_CHECK_OK', 'PDI Approved', 'Quality Inspection', 1, 4, '10.20.12.11', 'Passed physical, OCV, and load tests.');
    PERFORM register_serial_transaction(v_serial_id_2, 'PDI_CHECK_OK', 'PDI Approved', 'Quality Inspection', 1, 4, '10.20.12.11', 'Passed physical, OCV, and load tests.');
    
    -- Progress Serial 3 to Hold (Micro crack caught during final load check)
    PERFORM register_serial_transaction(v_serial_id_3, 'PDI_CHECK_HOLD', 'Hold', 'Quality Inspection', 1, 4, '10.20.12.11', 'High rate discharge capacity drop observed.');

    -- Enter PDI reports and load characteristics
    INSERT INTO pdi_details (batch_id, serial_id, serial_number, aesthetic_passed, electrical_passed, capacity_passed, volt_load_test, internal_resistance_test, high_rate_discharge_v, temp_corrected_sg, decision, checked_by) VALUES
    (v_batch_pdi, v_serial_id_1, 'TR2607000001', TRUE, TRUE, TRUE, 12.60, 4.10, 10.50, 1.260, 'OK', 4),
    (v_batch_pdi, v_serial_id_2, 'TR2607000002', TRUE, TRUE, TRUE, 12.62, 4.05, 10.60, 1.262, 'OK', 4),
    (v_batch_pdi, v_serial_id_3, 'TR2607000003', TRUE, FALSE, FALSE, 11.20, 8.50, 8.20, 1.240, 'Hold', 4);

    -- Flag the Quality issue on Serial 3 in holds register
    INSERT INTO first_time_hold (serial_id, serial_number, hold_reason_id, hold_category, plant_id, is_released, comments) VALUES
    (v_serial_id_3, 'TR2607000003', 4, 'PDI Hold', 1, FALSE, 'High Rate Discharge capacity dropped below 9.0V on load test.');

    -- Record PDI check defect criteria
    INSERT INTO pdi_defects (pdi_detail_id, defect_category, defect_description, severity) VALUES
    (3, 'Electrical Test Failure', 'High-Rate Discharge voltage dropped to 8.2V (Limit: Min 9.5V)', 'Critical');

    -- ========================================================================
    -- 5. STAGE E: LOGISTICS / INTER-PLANT TRANSFERS
    -- ========================================================================
    -- Initiate stock transfer request: Haridwar to Chittoor for flat plate batteries
    INSERT INTO transfer_requests (
        source_plant_id, destination_plant_id, requested_by, status, total_items, comments
    ) VALUES (
        2, 1, 2, 'Pending Approval', 2, 'Urgent stock balancing request for Flat Plate models'
    ) RETURNING transfer_id INTO v_transfer_id;

    INSERT INTO transfer_history (transfer_id, serial_id, serial_number, received_status) VALUES
    (v_transfer_id, v_serial_id_4, 'FP2607000001', 'Pending'),
    (v_transfer_id, v_serial_id_5, 'FP2607000002', 'Pending');

    -- ========================================================================
    -- 6. STAGE F: FINAL DISPATCH OUT (OUTBOUND SHIPMENT TO OEM)
    -- ========================================================================
    INSERT INTO dispatch_headers (
        dispatch_no, customer_id, plant_id, dispatch_date, invoice_no, 
        vehicle_no, lr_no, transporter_name, driver_name, eway_bill_no, created_by
    ) VALUES (
        'DISP-20260710-001', 1, 1, CURRENT_DATE, 'INV-AMARA-8822', 
        'AP-03-TY-8821', 'LR-CH-99221', 'Amara Raja Logistics Pvt Ltd', 'Ramesh Yadav', 'EWB228192019', 5
    ) RETURNING dispatch_id INTO v_dispatch_id;

    -- Update Serial 1 to Dispatched (Progress to Customer state)
    PERFORM register_serial_transaction(v_serial_id_1, 'DISPATCH_CONFIRMED', 'Dispatched', 'Dispatched', 1, 5, '10.20.14.88', 'Dispatched to Amara Raja Power Distributors.');

    INSERT INTO dispatch_details (dispatch_id, serial_id, serial_number, warranty_card_no, scanned_by) VALUES
    (v_dispatch_id, v_serial_id_1, 'TR2607000001', 'WARR-TR-001', 5);

    -- ========================================================================
    -- 7. STAGE G: QUALITY NON-CONFORMANCE & CORRECTIVE ACTION (CAPA) LOGS
    -- ========================================================================
    INSERT INTO non_conformance (
        nc_number, serial_number, severity, root_cause_category, description, status, raised_by
    ) VALUES (
        'NC-20260710-003', 'TR2607000003', 'Major', 'Inter-cell weld failure / high resistance',
        'Plate group inter-cell resistance high during automated PDI charging check.', 'Open', 2
    ) RETURNING nc_id INTO v_nc_id;

    -- Process dynamic Why-Why Root Cause Analysis mapping
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

    -- ========================================================================
    -- 8. SYSTEM NOTIFICATIONS & MASTER SETTINGS
    -- ========================================================================
    INSERT INTO notifications (recipient_role, title, message, severity) VALUES
    ('QA', 'URGENT: PDI Hold Recorded', 'Battery TR2607000003 flagged for High-Rate Discharge failure.', 'High'),
    ('Super Admin', 'Database Maintenance Window', 'Routine performance checks scheduled for Sunday 02:00 AM UTC.', 'Info');

    INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('COMPANY_NAME', 'SNMS Lead Acid Battery Corp', 'Global enterprise entity title for reports'),
    ('PDI_SAMPLE_SIZE_PCT', '10.0', 'Percentage of lot quantity required to be selected as sample sizes for PDI tests');

END;
$$;
