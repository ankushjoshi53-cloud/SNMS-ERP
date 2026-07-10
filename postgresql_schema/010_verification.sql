-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL VERIFICATION & INTEGRITY REPORTING
-- File: 010_verification.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- REPORT 1: Comprehensive Battery End-to-End Trace (Traceability Report)
-- Trace ALL information about the dispatched battery: 'TR2607000001'
SELECT * FROM v_serial_lifecycle_trace 
WHERE serial_number = 'TR2607000001';


-- REPORT 2: Current Real-Time Warehousing Balance across Facilities
SELECT * FROM v_active_inventory 
ORDER BY plant_code, model_code;


-- REPORT 3: Quality Compliance - List of Batteries Currently on Active Hold
SELECT 
    fth.hold_id,
    fth.serial_number,
    bm.model_code,
    fth.hold_category,
    hr.reason_code,
    hr.description AS reason_description,
    p.plant_name AS facility,
    fth.created_at AS hold_timestamp,
    nc.severity AS non_conformance_severity,
    nc.status AS non_conformance_status
FROM first_time_hold fth
JOIN serial_numbers sn ON fth.serial_id = sn.serial_id
JOIN battery_models bm ON sn.model_id = bm.model_id
JOIN hold_reasons hr ON fth.hold_reason_id = hr.reason_id
JOIN plants p ON fth.plant_id = p.plant_id
LEFT JOIN non_conformance nc ON fth.serial_number = nc.serial_number
WHERE fth.is_released = FALSE;


-- REPORT 4: Production Line Efficiency and Yield Percentages
SELECT * FROM v_production_efficiency;


-- REPORT 5: Pre-Delivery Inspection (PDI) Pass/Fail Metrics
SELECT * FROM v_pdi_quality_performance;


-- REPORT 6: Corrective and Preventive Action (CAPA) Deadlines & Audit Progress
SELECT * FROM v_quality_nc_capa_tracker;


-- REPORT 7: Consolidated Daily Operational Facility Metrics (Production vs Pack vs PDI vs Dispatch)
SELECT * FROM v_daily_operational_summary;


-- REPORT 8: Query System Security Audit Trail (Auditing & Compliance Logs)
SELECT 
    log_id,
    created_at AS log_timestamp,
    username,
    action_type,
    table_name,
    record_id,
    notes,
    ip_address
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
