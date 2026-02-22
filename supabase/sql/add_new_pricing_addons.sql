-- ============================================
-- ADD NEW PRICING STRUCTURE ADDONS
-- ============================================
-- This script adds all the new tiered addons for Smart Temperature Sensors and Asset Tags
-- Run this in Supabase SQL Editor to populate the subscription_addons table

-- ============================================
-- SMART TEMPERATURE SENSOR HARDWARE PACKS (One-time purchase)
-- ============================================

-- Starter Pack (2 sensors, £250)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_pack_starter',
  'Starter',
  '2 wireless temperature sensors for single fridge + freezer monitoring',
  250.00,
  'one_time',
  'smart_sensors',
  true,
  250.00,
  NULL,
  '["2 wireless temperature sensors", "Monitors 1 fridge + 1 freezer", "WiFi connected, no wiring needed", "5-minute reading intervals", "Setup guide included"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- Standard Pack (5 sensors, £575)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_pack_standard',
  'Standard',
  '5 wireless temperature sensors for walk-in chiller, display fridges, and freezer',
  575.00,
  'one_time',
  'smart_sensors',
  true,
  575.00,
  NULL,
  '["5 wireless temperature sensors", "Cover walk-in chiller, display fridges, freezer", "WiFi connected, no wiring needed", "5-minute reading intervals", "Setup guide + phone support"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- Professional Pack (10 sensors, £1,000)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_pack_professional',
  'Professional',
  '10 wireless temperature sensors for full kitchen & storage coverage',
  1000.00,
  'one_time',
  'smart_sensors',
  true,
  1000.00,
  NULL,
  '["10 wireless temperature sensors", "Full kitchen & storage coverage", "WiFi connected, no wiring needed", "5-minute reading intervals", "On-site setup assistance available"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- ============================================
-- SMART TEMPERATURE SENSOR SOFTWARE TIERS (Monthly per site)
-- ============================================

-- Essential Tier (£25/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_software_essential',
  'Essential',
  'Live temperature readings, daily compliance report, basic email alerts, EHO-ready export',
  25.00,
  'per_site_monthly',
  'smart_sensors',
  true,
  NULL,
  25.00,
  '["Live temperature dashboard", "Automatic hourly logging", "Daily compliance report", "EHO-ready PDF export", "Basic email alerts", "30-day data history"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- Professional Tier (£35/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_software_professional',
  'Professional',
  'Everything in Essential + SMS/push alerts, breach tracking, analytics, hardware warranty replacement',
  35.00,
  'per_site_monthly',
  'smart_sensors',
  true,
  NULL,
  35.00,
  '["Everything in Essential, plus:", "SMS + push notifications", "Multi-threshold alarms (warning + critical)", "24hr breach tracking & timeline", "Analytics (patterns, slow cooling, warm spots)", "Hardware warranty replacement", "90-day data history"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- Business Tier (£55/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'smart_sensor_software_business',
  'Business',
  'Everything in Professional + predictive warnings, auto engineer callout, 24/7 escalation, multi-site dashboard',
  55.00,
  'per_site_monthly',
  'smart_sensors',
  true,
  NULL,
  55.00,
  '["Everything in Professional, plus:", "Predictive failure warnings", "Automatic engineer callout integration", "24/7 response escalation", "Multi-site group dashboard", "Weekly health reports", "Unlimited data history", "Priority hardware replacement"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- ============================================
-- ASSET TAG PACKS (One-time purchase)
-- ============================================

-- Starter Pack (£25)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_pack_starter',
  'Starter',
  '20 durable QR stickers with setup guide and free replacements',
  25.00,
  'one_time',
  'asset_tags',
  true,
  25.00,
  NULL,
  '["20 durable QR stickers", "Waterproof polyester material", "Setup guide included", "Free replacement tags"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- Professional Pack (£50)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_pack_professional',
  'Professional',
  '20 NFC tags (tap-to-scan) with metal-safe variants and free replacements',
  50.00,
  'one_time',
  'asset_tags',
  true,
  50.00,
  NULL,
  '["20 NFC tags (tap to scan)", "Works on metal surfaces", "Better durability for high-use areas", "Free replacement tags"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- Premium Pack (£100)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_pack_premium',
  'Premium',
  '20 industrial-grade tags with chemical & heat resistance and lifetime free replacements',
  100.00,
  'one_time',
  'asset_tags',
  true,
  100.00,
  NULL,
  '["20 industrial-grade tags", "Chemical & heat resistant", "Screwable or adhesive mounting", "Lifetime free replacements"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  hardware_cost = EXCLUDED.hardware_cost,
  features = EXCLUDED.features;

-- ============================================
-- ASSET TAGS SOFTWARE TIERS (Monthly per site)
-- ============================================

-- Essential Tier (£5/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_software_essential',
  'Essential',
  'Scan to view asset details, service history, one-tap fault reporting with photos',
  5.00,
  'per_site_monthly',
  'asset_tags',
  true,
  NULL,
  5.00,
  '["Scan to view asset details", "Service history timeline", "One-tap fault reporting", "Photo evidence upload", "Basic troubleshooting access"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- Professional Tier (£10/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_software_professional',
  'Professional',
  'Everything in Essential + scheduled scan tasks, contractor check-in portal, service reminders & alerts',
  10.00,
  'per_site_monthly',
  'asset_tags',
  true,
  NULL,
  10.00,
  '["Everything in Essential, plus:", "Scheduled scan tasks (e.g., monthly equipment audits)", "Contractor check-in portal", "Service reminder alerts", "PPM schedule integration", "Supplier & warranty info display"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- Business Tier (£20/month per site)
INSERT INTO subscription_addons (
  name,
  display_name,
  description,
  price,
  price_type,
  category,
  is_active,
  hardware_cost,
  monthly_management_cost,
  features
) VALUES (
  'asset_tags_software_business',
  'Business',
  'Everything in Professional + full audit trail exports, multi-site tag dashboard, API access for integrations',
  20.00,
  'per_site_monthly',
  'asset_tags',
  true,
  NULL,
  20.00,
  '["Everything in Professional, plus:", "Full audit trail exports (PDF/CSV)", "Multi-site tag dashboard", "API access for integrations", "Priority support", "Custom branding on scan pages"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  monthly_management_cost = EXCLUDED.monthly_management_cost,
  features = EXCLUDED.features;

-- ============================================
-- NOTES
-- ============================================
-- After running this script, you should see:
-- - 3 Smart Sensor Hardware Packs (Starter, Standard, Professional)
-- - 3 Smart Sensor Software Tiers (Essential, Professional, Business)
-- - 3 Asset Tag Packs (Starter, Professional, Premium)
-- - 3 Asset Tags Software Tiers (Essential, Professional, Business)
-- 
-- Total: 12 new addons
-- 
-- Old addons (smart_sensor_bundles, maintenance_kit_basic, etc.) will still exist
-- but will be filtered out from the tiered sections and only show in "Other Add-ons"
-- if they don't match the new naming conventions.

