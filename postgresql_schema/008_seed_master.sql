-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL SEED MASTER CONFIGURATIONS
-- File: 008_seed_master.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Seed Plants (Ecosystem Facilities)
INSERT INTO plants (plant_code, plant_name, address, is_active) VALUES
('PL001', 'Chittoor Plant 1', 'Survey No 231, Industrial Area, Chittoor, Andhra Pradesh, India', TRUE),
('PL002', 'Haridwar Plant 2', 'SIDCUL Industrial Area, Sector 5, Haridwar, Uttarakhand, India', TRUE),
('PL003', 'Pune Plant 3', 'Phase II, MIDC Chakan, Pune, Maharashtra, India', TRUE);

-- 2. Seed Customers (Wholesale Distributors & OEMs)
INSERT INTO customers (customer_code, customer_name, contact_email, country) VALUES
('CUST-AMARA', 'Amara Raja Power Distributors', 'logistics@amararaja.com', 'India'),
('CUST-EXIDE', 'Exide Retail Solutions', 'dispatch_exide@exide.co.in', 'India'),
('CUST-TATA', 'Tata Green Auto Logistics', 'oem.tata@tatagreen.com', 'India'),
('CUST-LUM', 'Luminous Power Technologies', 'info@luminouspower.com', 'India'),
('CUST-GEN', 'Generac Power Systems', 'supplychain@generac.com', 'USA');

-- 3. Seed Lead Acid Battery Models (Tubular, Flat, Auto, Industrial)
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

-- 5. Seed Curing, Assembly & Packing Lines Mapped to Plants
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
