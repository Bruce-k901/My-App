-- Reset training-related templates (library and custom) so we can re-import fresh versions

DELETE FROM template_fields
WHERE template_id IN (
  SELECT id
  FROM task_templates
  WHERE slug IN (
    'training_compliance_management',
    'training_records_review',
    'cp003_training_review',
    'record-all-staff-safety-training-32',
    'monthly-training-compliance-review'
  )
);

DELETE FROM task_templates
WHERE slug IN (
  'training_compliance_management',
  'training_records_review',
  'cp003_training_review',
  'record-all-staff-safety-training-32',
  'monthly-training-compliance-review'
);








