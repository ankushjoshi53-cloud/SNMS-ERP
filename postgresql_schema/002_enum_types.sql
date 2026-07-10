-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL ENUM TYPE DEFINITIONS
-- File: 002_enum_types.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- Security & IAM Enums
CREATE TYPE user_role_enum AS ENUM (
    'Super Admin',
    'QA',
    'Production',
    'PDI',
    'Dispatch',
    'Viewer'
);

CREATE TYPE session_status_enum AS ENUM (
    'Active',
    'Expired',
    'Terminated',
    'Revoked'
);

-- Manufacturing & Battery Specific Enums
CREATE TYPE battery_type_enum AS ENUM (
    'Tubular',
    'Flat Plate',
    'Automotive',
    'Industrial'
);

CREATE TYPE shift_type_enum AS ENUM (
    'Shift A - Morning',
    'Shift B - Evening',
    'Shift C - Night'
);

-- Serial Number Status Lifecycle
CREATE TYPE serial_status_enum AS ENUM (
    'Allocated',
    'Production',
    'Packing',
    'PDI',
    'Dispatch',
    'Customer',
    'Hold',
    'Rejected',
    'Scrap',
    'Returned'
);

CREATE TYPE serial_stage_enum AS ENUM (
    'Allotment',
    'Grid Casting & Pasting',
    'Assembly',
    'Formation & Charging',
    'Packing Line',
    'Quality Inspection',
    'Dispatched',
    'Scrapped'
);

-- Transaction Logging & History Enums
CREATE TYPE transaction_type_enum AS ENUM (
    'ALLOTMENT_CREATE',
    'PRODUCTION_REGISTER',
    'PACKING_COMPLETE',
    'PDI_CHECK_OK',
    'PDI_CHECK_HOLD',
    'PDI_CHECK_REJECT',
    'INTER_PLANT_TRANSFER_INIT',
    'INTER_PLANT_TRANSFER_APPROVE',
    'DISPATCH_CONFIRMED',
    'CUSTOMER_RETURN',
    'SCRAP_RECORDED',
    'STATUS_HOLD_RELEASE'
);

-- PDI Check Statuses
CREATE TYPE pdi_status_enum AS ENUM (
    'OK',
    'Hold',
    'Rejected'
);

-- Audit, Telemetry & Operations Enums
CREATE TYPE audit_action_enum AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'FAILED_LOGIN_ATTEMPT',
    'ACCOUNT_LOCK',
    'TRANSFER',
    'DISPATCH',
    'PDI',
    'PRODUCTION',
    'PASSWORD_RESET',
    'ARCHIVE_LOGS'
);

CREATE TYPE audit_status_enum AS ENUM (
    'Success',
    'Failed'
);

CREATE TYPE transfer_status_enum AS ENUM (
    'Draft',
    'Pending Approval',
    'Approved',
    'Rejected',
    'In Transit',
    'Received',
    'Cancelled'
);

-- Quality & CAPA Enums
CREATE TYPE hold_category_enum AS ENUM (
    'First Time Hold',
    'Quality Hold',
    'PDI Hold',
    'Temporary Hold',
    'Customer Advisory Hold'
);

CREATE TYPE capa_status_enum AS ENUM (
    'Draft',
    'Investigating',
    'Action Plan Created',
    'Implemented',
    'Effectiveness Verified',
    'Closed'
);

COMMENT ON TYPE user_role_enum IS 'Standard access levels allowed inside SNMS ERP';
COMMENT ON TYPE battery_type_enum IS 'Primary physical classifications of Lead Acid Batteries manufactured';
COMMENT ON TYPE serial_status_enum IS 'Immutable lifecycle status states for any individual battery serial';
COMMENT ON TYPE audit_action_enum IS 'Action codes indicating operational transaction intent logged in security audits';
