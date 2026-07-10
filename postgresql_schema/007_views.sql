-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL ANALYTICAL VIEWS
-- File: 007_views.sql
-- Role: Senior PostgreSQL Database Architect
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
