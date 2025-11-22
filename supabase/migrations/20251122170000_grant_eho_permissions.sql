-- Grant execute permissions to authenticated users for EHO report functions
GRANT EXECUTE ON FUNCTION get_eho_report_data(uuid, date, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_summary(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_training_records(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_temperature_records(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_incident_reports(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_cleaning_records(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_pest_control_records(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_opening_closing_checklists(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_supplier_delivery_records(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_maintenance_logs(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_staff_health_declarations(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eho_allergen_information(uuid) TO authenticated;

-- Ensure the functions are SECURITY DEFINER if they need to bypass RLS on underlying tables
-- Or ensure RLS policies allow read access to the underlying tables for the user
