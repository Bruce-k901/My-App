-- ============================================
-- SEED DATA FOR RISK ASSESSMENTS
-- ============================================
-- This file seeds sample Risk Assessments based on the General and COSHH templates
-- Uses the first company_id from the companies table automatically
-- Works whether or not version_number columns exist

DO $$
DECLARE
    company_uuid UUID;
    site_uuid UUID;
    assessor_uuid UUID;
    assessment_date_val DATE := CURRENT_DATE;
    review_date_val DATE := CURRENT_DATE + INTERVAL '1 year';
    has_version_columns BOOLEAN := FALSE;
    insert_sql TEXT;
BEGIN
    -- Get the first company_id
    SELECT id INTO company_uuid FROM companies LIMIT 1;
    
    IF company_uuid IS NULL THEN
        RAISE EXCEPTION 'No company found in companies table. Please create a company first.';
    END IF;
    
    -- Get the first site_id (optional)
    SELECT id INTO site_uuid FROM sites WHERE company_id = company_uuid LIMIT 1;
    
    -- Note: created_by references auth.users(id), not profiles(id)
    -- For seed data, we'll set created_by to NULL since we don't have auth.users context
    assessor_uuid := NULL;
    
    -- Check if version_number column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'risk_assessments' 
        AND column_name = 'version_number'
    ) INTO has_version_columns;
    
    RAISE NOTICE 'Using company_id: %', company_uuid;
    RAISE NOTICE 'Using site_id: %', site_uuid;
    RAISE NOTICE 'created_by will be NULL (seed data)';
    RAISE NOTICE 'Version columns exist: %', has_version_columns;
    
    -- ============================================
    -- GENERAL RISK ASSESSMENT SEED DATA
    -- ============================================
    
    -- General Risk Assessment 1: Kitchen Operations
    IF NOT EXISTS (SELECT 1 FROM risk_assessments WHERE ref_code = 'RA-GEN-KITC-001' AND company_id = company_uuid) THEN
        IF has_version_columns THEN
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                version_number, parent_id,
                assessment_data, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'general', 'Kitchen Operations Risk Assessment', 'RA-GEN-KITC-001',
                site_uuid, 'Health & Safety Manager', assessment_date_val, review_date_val, review_date_val,
                'Published', 1, NULL,
                jsonb_build_object(
                    'hazards', jsonb_build_array(
                        jsonb_build_object('id', 1, 'description', 'Hot surfaces and equipment (ovens, fryers, grills)', 'category', 'Burns & Scalds', 'peopleAtRisk', jsonb_build_array('Staff (BOH)'), 'existingControls', 'Heat-resistant gloves, training on safe handling, warning signs', 'likelihoodBefore', 4, 'severityBefore', 4, 'additionalControls', 'Regular equipment maintenance, clear work zones, emergency procedures', 'likelihoodAfter', 2, 'severityAfter', 2, 'responsiblePerson', 'Kitchen Manager', 'targetDate', (CURRENT_DATE + INTERVAL '30 days')::text, 'status', 'In Progress', 'linkedSOP', NULL),
                        jsonb_build_object('id', 2, 'description', 'Sharp knives and cutting equipment', 'category', 'Cuts & Lacerations', 'peopleAtRisk', jsonb_build_array('Staff (BOH)'), 'existingControls', 'Sharp knife training, proper storage, regular sharpening', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Cut-resistant gloves for high-risk tasks, first aid kit accessible', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Head Chef', 'targetDate', (CURRENT_DATE + INTERVAL '14 days')::text, 'status', 'Complete', 'linkedSOP', NULL),
                        jsonb_build_object('id', 3, 'description', 'Wet floors from cleaning and spills', 'category', 'Slips, Trips & Falls', 'peopleAtRisk', jsonb_build_array('Staff (BOH)', 'Staff (FOH)'), 'existingControls', 'Non-slip flooring, regular cleaning schedules, warning signs', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Immediate spill cleanup procedures, non-slip footwear requirement', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Operations Manager', 'targetDate', (CURRENT_DATE + INTERVAL '7 days')::text, 'status', 'Complete', 'linkedSOP', NULL)
                    ),
                    'selectedPPE', jsonb_build_array('Heat-resistant gloves', 'Cut-resistant gloves', 'Non-slip safety shoes', 'Aprons'),
                    'training', jsonb_build_object('trainingNeeded', true, 'trainingProvider', 'Internal H&S Team', 'trainingFrequency', 'Annually', 'lastTrainingDate', (CURRENT_DATE - INTERVAL '6 months')::text),
                    'review', jsonb_build_object('reviewFrequency', 'Annually', 'assessorSignature', 'Health & Safety Manager', 'managerApproval', true, 'managerApprovalDate', assessment_date_val::text)
                ),
                'Medium', 3, 2, assessor_uuid
            );
        ELSE
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                assessment_data, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'general', 'Kitchen Operations Risk Assessment', 'RA-GEN-KITC-001',
                site_uuid, 'Health & Safety Manager', assessment_date_val, review_date_val, review_date_val,
                'Published',
                jsonb_build_object(
                    'hazards', jsonb_build_array(
                        jsonb_build_object('id', 1, 'description', 'Hot surfaces and equipment (ovens, fryers, grills)', 'category', 'Burns & Scalds', 'peopleAtRisk', jsonb_build_array('Staff (BOH)'), 'existingControls', 'Heat-resistant gloves, training on safe handling, warning signs', 'likelihoodBefore', 4, 'severityBefore', 4, 'additionalControls', 'Regular equipment maintenance, clear work zones, emergency procedures', 'likelihoodAfter', 2, 'severityAfter', 2, 'responsiblePerson', 'Kitchen Manager', 'targetDate', (CURRENT_DATE + INTERVAL '30 days')::text, 'status', 'In Progress', 'linkedSOP', NULL),
                        jsonb_build_object('id', 2, 'description', 'Sharp knives and cutting equipment', 'category', 'Cuts & Lacerations', 'peopleAtRisk', jsonb_build_array('Staff (BOH)'), 'existingControls', 'Sharp knife training, proper storage, regular sharpening', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Cut-resistant gloves for high-risk tasks, first aid kit accessible', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Head Chef', 'targetDate', (CURRENT_DATE + INTERVAL '14 days')::text, 'status', 'Complete', 'linkedSOP', NULL),
                        jsonb_build_object('id', 3, 'description', 'Wet floors from cleaning and spills', 'category', 'Slips, Trips & Falls', 'peopleAtRisk', jsonb_build_array('Staff (BOH)', 'Staff (FOH)'), 'existingControls', 'Non-slip flooring, regular cleaning schedules, warning signs', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Immediate spill cleanup procedures, non-slip footwear requirement', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Operations Manager', 'targetDate', (CURRENT_DATE + INTERVAL '7 days')::text, 'status', 'Complete', 'linkedSOP', NULL)
                    ),
                    'selectedPPE', jsonb_build_array('Heat-resistant gloves', 'Cut-resistant gloves', 'Non-slip safety shoes', 'Aprons'),
                    'training', jsonb_build_object('trainingNeeded', true, 'trainingProvider', 'Internal H&S Team', 'trainingFrequency', 'Annually', 'lastTrainingDate', (CURRENT_DATE - INTERVAL '6 months')::text),
                    'review', jsonb_build_object('reviewFrequency', 'Annually', 'assessorSignature', 'Health & Safety Manager', 'managerApproval', true, 'managerApprovalDate', assessment_date_val::text)
                ),
                'Medium', 3, 2, assessor_uuid
            );
        END IF;
    END IF;
    
    -- General Risk Assessment 2: Front of House Operations
    IF NOT EXISTS (SELECT 1 FROM risk_assessments WHERE ref_code = 'RA-GEN-FOHO-001' AND company_id = company_uuid) THEN
        IF has_version_columns THEN
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                version_number, parent_id,
                assessment_data, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'general', 'Front of House Operations Risk Assessment', 'RA-GEN-FOHO-001',
                site_uuid, 'Operations Manager', assessment_date_val, review_date_val, review_date_val,
                'Published', 1, NULL,
                jsonb_build_object(
                    'hazards', jsonb_build_array(
                        jsonb_build_object('id', 1, 'description', 'Manual handling of heavy trays and equipment', 'category', 'Manual Handling', 'peopleAtRisk', jsonb_build_array('Staff (FOH)'), 'existingControls', 'Training on lifting techniques, use of trolleys where possible', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Maximum weight limits, team lifting for heavy items, regular breaks', 'likelihoodAfter', 2, 'severityAfter', 2, 'responsiblePerson', 'Floor Manager', 'targetDate', (CURRENT_DATE + INTERVAL '21 days')::text, 'status', 'In Progress', 'linkedSOP', NULL),
                        jsonb_build_object('id', 2, 'description', 'Hot beverages and plates served to customers', 'category', 'Burns & Scalds', 'peopleAtRisk', jsonb_build_array('Staff (FOH)', 'Customers'), 'existingControls', 'Training on safe serving, use of service trays', 'likelihoodBefore', 2, 'severityBefore', 3, 'additionalControls', 'Clear service paths, temperature checks before serving', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Service Manager', 'targetDate', (CURRENT_DATE + INTERVAL '14 days')::text, 'status', 'Complete', 'linkedSOP', NULL)
                    ),
                    'selectedPPE', jsonb_build_array('Non-slip safety shoes', 'Aprons'),
                    'training', jsonb_build_object('trainingNeeded', true, 'trainingProvider', 'Internal Training Team', 'trainingFrequency', 'Annually', 'lastTrainingDate', (CURRENT_DATE - INTERVAL '3 months')::text),
                    'review', jsonb_build_object('reviewFrequency', 'Annually', 'assessorSignature', 'Operations Manager', 'managerApproval', true, 'managerApprovalDate', assessment_date_val::text)
                ),
                'Low', 2, 1, assessor_uuid
            );
        ELSE
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                assessment_data, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'general', 'Front of House Operations Risk Assessment', 'RA-GEN-FOHO-001',
                site_uuid, 'Operations Manager', assessment_date_val, review_date_val, review_date_val,
                'Published',
                jsonb_build_object(
                    'hazards', jsonb_build_array(
                        jsonb_build_object('id', 1, 'description', 'Manual handling of heavy trays and equipment', 'category', 'Manual Handling', 'peopleAtRisk', jsonb_build_array('Staff (FOH)'), 'existingControls', 'Training on lifting techniques, use of trolleys where possible', 'likelihoodBefore', 3, 'severityBefore', 3, 'additionalControls', 'Maximum weight limits, team lifting for heavy items, regular breaks', 'likelihoodAfter', 2, 'severityAfter', 2, 'responsiblePerson', 'Floor Manager', 'targetDate', (CURRENT_DATE + INTERVAL '21 days')::text, 'status', 'In Progress', 'linkedSOP', NULL),
                        jsonb_build_object('id', 2, 'description', 'Hot beverages and plates served to customers', 'category', 'Burns & Scalds', 'peopleAtRisk', jsonb_build_array('Staff (FOH)', 'Customers'), 'existingControls', 'Training on safe serving, use of service trays', 'likelihoodBefore', 2, 'severityBefore', 3, 'additionalControls', 'Clear service paths, temperature checks before serving', 'likelihoodAfter', 1, 'severityAfter', 2, 'responsiblePerson', 'Service Manager', 'targetDate', (CURRENT_DATE + INTERVAL '14 days')::text, 'status', 'Complete', 'linkedSOP', NULL)
                    ),
                    'selectedPPE', jsonb_build_array('Non-slip safety shoes', 'Aprons'),
                    'training', jsonb_build_object('trainingNeeded', true, 'trainingProvider', 'Internal Training Team', 'trainingFrequency', 'Annually', 'lastTrainingDate', (CURRENT_DATE - INTERVAL '3 months')::text),
                    'review', jsonb_build_object('reviewFrequency', 'Annually', 'assessorSignature', 'Operations Manager', 'managerApproval', true, 'managerApprovalDate', assessment_date_val::text)
                ),
                'Low', 2, 1, assessor_uuid
            );
        END IF;
    END IF;
    
    -- ============================================
    -- COSHH RISK ASSESSMENT SEED DATA
    -- ============================================
    
    -- COSHH Assessment 1: Cleaning Chemicals
    IF NOT EXISTS (SELECT 1 FROM risk_assessments WHERE ref_code = 'COSHH-CLEA-001' AND company_id = company_uuid) THEN
        IF has_version_columns THEN
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                version_number, parent_id,
                assessment_data, linked_chemicals, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'coshh', 'Cleaning Chemicals COSHH Assessment', 'COSHH-CLEA-001',
                site_uuid, 'Health & Safety Manager', assessment_date_val, review_date_val, review_date_val,
                'Published', 1, NULL,
                jsonb_build_object(
                    'chemicals', jsonb_build_array(
                        jsonb_build_object('id', 1, 'chemical_id', NULL, 'howUsed', 'Spraying', 'quantity', '500', 'unit', 'ml', 'frequency', 'Daily', 'duration', '30 minutes', 'staffExposed', 'All cleaning staff', 'storageLocation', 'Cleaning cupboard - locked', 'substitutionConsidered', false, 'substitutionNotes', ''),
                        jsonb_build_object('id', 2, 'chemical_id', NULL, 'howUsed', 'Diluting', 'quantity', '2', 'unit', 'litres', 'frequency', 'Daily', 'duration', '1 hour', 'staffExposed', 'Kitchen staff', 'storageLocation', 'Store room', 'substitutionConsidered', true, 'substitutionNotes', 'Considering eco-friendly alternatives')
                    ),
                    'exposureRoutes', jsonb_build_object('inhalation', jsonb_build_object('enabled', true, 'severity', 'Low', 'notes', 'Well-ventilated areas'), 'skinContact', jsonb_build_object('enabled', true, 'severity', 'Medium', 'notes', 'Gloves required'), 'eyeContact', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'ingestion', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', '')),
                    'controlMeasures', jsonb_build_array(
                        jsonb_build_object('id', 1, 'type', 'PPE', 'description', 'Nitrile gloves, aprons, safety goggles', 'effectiveness', 'High', 'reviewDate', review_date_val::text),
                        jsonb_build_object('id', 2, 'type', 'Engineering Controls', 'description', 'Ventilation systems, proper storage', 'effectiveness', 'High', 'reviewDate', review_date_val::text),
                        jsonb_build_object('id', 3, 'type', 'Administrative Controls', 'description', 'Training, safe handling procedures, COSHH data sheets', 'effectiveness', 'High', 'reviewDate', review_date_val::text)
                    ),
                    'healthSurveillance', jsonb_build_object('healthSurveillanceRequired', false, 'monitoringType', '', 'monitoringFrequency', '', 'surveillanceResponsible', '', 'lastSurveillanceDate', NULL),
                    'emergency', jsonb_build_object('spillKitLocation', 'Cleaning cupboard', 'emergencyContacts', 'First aider: Ext 101, Emergency: 999', 'disposalProcedures', 'Follow manufacturer instructions, dispose via licensed waste contractor', 'environmentalInfo', 'Avoid drains, contain spills immediately'),
                    'riskAssessment', jsonb_build_object('overallRiskLevel', 'Medium', 'riskBeforeControls', 4, 'riskAfterControls', 2, 'riskNotes', 'Risks adequately controlled with PPE and training. Regular review required.')
                ),
                ARRAY[]::UUID[], 'Medium', 2, 1, assessor_uuid
            );
        ELSE
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                assessment_data, linked_chemicals, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'coshh', 'Cleaning Chemicals COSHH Assessment', 'COSHH-CLEA-001',
                site_uuid, 'Health & Safety Manager', assessment_date_val, review_date_val, review_date_val,
                'Published',
                jsonb_build_object(
                    'chemicals', jsonb_build_array(
                        jsonb_build_object('id', 1, 'chemical_id', NULL, 'howUsed', 'Spraying', 'quantity', '500', 'unit', 'ml', 'frequency', 'Daily', 'duration', '30 minutes', 'staffExposed', 'All cleaning staff', 'storageLocation', 'Cleaning cupboard - locked', 'substitutionConsidered', false, 'substitutionNotes', ''),
                        jsonb_build_object('id', 2, 'chemical_id', NULL, 'howUsed', 'Diluting', 'quantity', '2', 'unit', 'litres', 'frequency', 'Daily', 'duration', '1 hour', 'staffExposed', 'Kitchen staff', 'storageLocation', 'Store room', 'substitutionConsidered', true, 'substitutionNotes', 'Considering eco-friendly alternatives')
                    ),
                    'exposureRoutes', jsonb_build_object('inhalation', jsonb_build_object('enabled', true, 'severity', 'Low', 'notes', 'Well-ventilated areas'), 'skinContact', jsonb_build_object('enabled', true, 'severity', 'Medium', 'notes', 'Gloves required'), 'eyeContact', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'ingestion', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', '')),
                    'controlMeasures', jsonb_build_array(
                        jsonb_build_object('id', 1, 'type', 'PPE', 'description', 'Nitrile gloves, aprons, safety goggles', 'effectiveness', 'High', 'reviewDate', review_date_val::text),
                        jsonb_build_object('id', 2, 'type', 'Engineering Controls', 'description', 'Ventilation systems, proper storage', 'effectiveness', 'High', 'reviewDate', review_date_val::text),
                        jsonb_build_object('id', 3, 'type', 'Administrative Controls', 'description', 'Training, safe handling procedures, COSHH data sheets', 'effectiveness', 'High', 'reviewDate', review_date_val::text)
                    ),
                    'healthSurveillance', jsonb_build_object('healthSurveillanceRequired', false, 'monitoringType', '', 'monitoringFrequency', '', 'surveillanceResponsible', '', 'lastSurveillanceDate', NULL),
                    'emergency', jsonb_build_object('spillKitLocation', 'Cleaning cupboard', 'emergencyContacts', 'First aider: Ext 101, Emergency: 999', 'disposalProcedures', 'Follow manufacturer instructions, dispose via licensed waste contractor', 'environmentalInfo', 'Avoid drains, contain spills immediately'),
                    'riskAssessment', jsonb_build_object('overallRiskLevel', 'Medium', 'riskBeforeControls', 4, 'riskAfterControls', 2, 'riskNotes', 'Risks adequately controlled with PPE and training. Regular review required.')
                ),
                ARRAY[]::UUID[], 'Medium', 2, 1, assessor_uuid
            );
        END IF;
    END IF;
    
    -- COSHH Assessment 2: Kitchen Sanitizers
    IF NOT EXISTS (SELECT 1 FROM risk_assessments WHERE ref_code = 'COSHH-SANI-001' AND company_id = company_uuid) THEN
        IF has_version_columns THEN
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                version_number, parent_id,
                assessment_data, linked_chemicals, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'coshh', 'Kitchen Sanitizers COSHH Assessment', 'COSHH-SANI-001',
                site_uuid, 'Head Chef', assessment_date_val, review_date_val, review_date_val,
                'Draft', 1, NULL,
                jsonb_build_object(
                    'chemicals', jsonb_build_array(
                        jsonb_build_object('id', 1, 'chemical_id', NULL, 'howUsed', 'Wiping', 'quantity', '100', 'unit', 'ml', 'frequency', 'Multiple daily', 'duration', '5 minutes', 'staffExposed', 'All kitchen staff', 'storageLocation', 'Kitchen cleaning station', 'substitutionConsidered', false, 'substitutionNotes', '')
                    ),
                    'exposureRoutes', jsonb_build_object('inhalation', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'skinContact', jsonb_build_object('enabled', true, 'severity', 'Low', 'notes', 'Food-safe sanitizer'), 'eyeContact', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'ingestion', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', '')),
                    'controlMeasures', jsonb_build_array(
                        jsonb_build_object('id', 1, 'type', 'PPE', 'description', 'Nitrile gloves', 'effectiveness', 'High', 'reviewDate', review_date_val::text)
                    ),
                    'healthSurveillance', jsonb_build_object('healthSurveillanceRequired', false, 'monitoringType', '', 'monitoringFrequency', '', 'surveillanceResponsible', '', 'lastSurveillanceDate', NULL),
                    'emergency', jsonb_build_object('spillKitLocation', 'Kitchen', 'emergencyContacts', 'First aider on site', 'disposalProcedures', 'Dilute and dispose to drain', 'environmentalInfo', 'Food-safe, biodegradable'),
                    'riskAssessment', jsonb_build_object('overallRiskLevel', 'Low', 'riskBeforeControls', 2, 'riskAfterControls', 1, 'riskNotes', 'Low risk sanitizer, food-safe formulation')
                ),
                ARRAY[]::UUID[], 'Low', 1, 1, assessor_uuid
            );
        ELSE
            INSERT INTO risk_assessments (
                company_id, template_type, title, ref_code, site_id, assessor_name,
                assessment_date, review_date, next_review_date, status,
                assessment_data, linked_chemicals, highest_risk_level, total_hazards, hazards_controlled, created_by
            ) VALUES (
                company_uuid, 'coshh', 'Kitchen Sanitizers COSHH Assessment', 'COSHH-SANI-001',
                site_uuid, 'Head Chef', assessment_date_val, review_date_val, review_date_val,
                'Draft',
                jsonb_build_object(
                    'chemicals', jsonb_build_array(
                        jsonb_build_object('id', 1, 'chemical_id', NULL, 'howUsed', 'Wiping', 'quantity', '100', 'unit', 'ml', 'frequency', 'Multiple daily', 'duration', '5 minutes', 'staffExposed', 'All kitchen staff', 'storageLocation', 'Kitchen cleaning station', 'substitutionConsidered', false, 'substitutionNotes', '')
                    ),
                    'exposureRoutes', jsonb_build_object('inhalation', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'skinContact', jsonb_build_object('enabled', true, 'severity', 'Low', 'notes', 'Food-safe sanitizer'), 'eyeContact', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', ''), 'ingestion', jsonb_build_object('enabled', false, 'severity', 'Low', 'notes', '')),
                    'controlMeasures', jsonb_build_array(
                        jsonb_build_object('id', 1, 'type', 'PPE', 'description', 'Nitrile gloves', 'effectiveness', 'High', 'reviewDate', review_date_val::text)
                    ),
                    'healthSurveillance', jsonb_build_object('healthSurveillanceRequired', false, 'monitoringType', '', 'monitoringFrequency', '', 'surveillanceResponsible', '', 'lastSurveillanceDate', NULL),
                    'emergency', jsonb_build_object('spillKitLocation', 'Kitchen', 'emergencyContacts', 'First aider on site', 'disposalProcedures', 'Dilute and dispose to drain', 'environmentalInfo', 'Food-safe, biodegradable'),
                    'riskAssessment', jsonb_build_object('overallRiskLevel', 'Low', 'riskBeforeControls', 2, 'riskAfterControls', 1, 'riskNotes', 'Low risk sanitizer, food-safe formulation')
                ),
                ARRAY[]::UUID[], 'Low', 1, 1, assessor_uuid
            );
        END IF;
    END IF;
    
    RAISE NOTICE 'Risk Assessment seed data inserted successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error seeding Risk Assessments: %', SQLERRM;
        RAISE;
END $$;
