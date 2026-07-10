-- ============================================================================
-- SNMS ERP v2.0 - POSTGRESQL INDEX OPTIMIZATION STRATEGY
-- File: 004_indexes.sql
-- Role: Senior PostgreSQL Database Architect
-- ============================================================================

-- 1. Serial Number High-Frequency Query Optimization (Millions of Rows)
CREATE INDEX idx_serials_number_hash ON serial_numbers USING btree (serial_number);
CREATE INDEX idx_serials_prefix_running ON serial_numbers (model_id, year_code, month_code, running_number);
CREATE INDEX idx_serials_plant_status ON serial_numbers (plant_id, current_status);
CREATE INDEX idx_serials_stage ON serial_numbers (current_stage);

-- Partial Indexes for Operations (High-speed filters for tiny subsets)
CREATE INDEX idx_serials_active_holds ON serial_numbers (plant_id) 
WHERE current_status = 'Hold';

CREATE INDEX idx_serials_active_rejected ON serial_numbers (plant_id) 
WHERE current_status = 'Rejected';

-- 2. Audit & API Log Tracking Indexes (High-Write, High-Read Log Tables)
CREATE INDEX idx_audit_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_action_time ON audit_logs (action_type, created_at DESC);
CREATE INDEX idx_api_logs_endpoint_status ON api_logs (endpoint, status_code, created_at DESC);

-- GIN Indexes for Structured JSONB Documents
CREATE INDEX idx_audit_old_values_jsonb ON audit_logs USING gin (old_values);
CREATE INDEX idx_audit_new_values_jsonb ON audit_logs USING gin (new_values);
CREATE INDEX idx_serial_history_jsonb ON serial_history USING gin (historical_data_json);
CREATE INDEX idx_capa_why_why_analysis ON capa USING gin (why_why_analysis);

-- 3. Production, Packing, and PDI Operations Indexes
CREATE INDEX idx_prod_batches_line_shift ON production_batches (production_line_id, shift_id, date_produced DESC);
CREATE INDEX idx_prod_batch_details_serial ON production_batch_details (batch_id, serial_id);
CREATE INDEX idx_pack_details_carton ON packing_details (outer_carton_serial);
CREATE INDEX idx_pdi_details_check ON pdi_details (batch_id, decision);

-- 4. Logistics, Dispatches & Customer Reports
CREATE INDEX idx_dispatch_header_invoice ON dispatch_headers (invoice_no);
CREATE INDEX idx_dispatch_header_date_cust ON dispatch_headers (customer_id, dispatch_date DESC);
CREATE INDEX idx_dispatch_details_composite ON dispatch_details (dispatch_id, serial_id);

-- 5. Inter-Plant Transfers
CREATE INDEX idx_transfer_req_status ON transfer_requests (source_plant_id, destination_plant_id, status);
CREATE INDEX idx_transfer_hist_serial ON transfer_history (transfer_id, serial_id);

-- 6. Quality & CAPA Analytics
CREATE INDEX idx_first_time_hold_serial ON first_time_hold (serial_id) WHERE is_released = FALSE;
CREATE INDEX idx_nc_number_search ON non_conformance (nc_number);
CREATE INDEX idx_capa_nc_id ON capa (nc_id);
