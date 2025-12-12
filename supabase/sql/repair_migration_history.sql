-- ============================================================================
-- MIGRATION HISTORY REPAIR SCRIPT
-- ============================================================================
-- Generated: 2025-11-26 07:27:49
-- This script repairs the supabase_migrations.schema_migrations table
-- to match your local migration files.
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. After running, try: supabase db pull
-- ============================================================================

-- First, mark the problematic migration as reverted (if it exists)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251125000001';

-- Now insert/update all local migrations as 'applied'
-- This ensures the remote database knows about all your local migrations
-- Migration: 20250115000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250115000000', 'Migration 20250115000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250115000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250115000000', 'Migration 20250115000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250201000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250201000000', 'Migration 20250201000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250202000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250202000002', 'Migration 20250202000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250202000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250202000003', 'Migration 20250202000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000001', 'Migration 20250204000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000002', 'Migration 20250204000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000003', 'Migration 20250204000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000004', 'Migration 20250204000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000005', 'Migration 20250204000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000006', 'Migration 20250204000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000007
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000007', 'Migration 20250204000007')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000008
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000008', 'Migration 20250204000008')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000009
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000009', 'Migration 20250204000009')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000010
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000010', 'Migration 20250204000010')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000011
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000011', 'Migration 20250204000011')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250204000012
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204000012', 'Migration 20250204000012')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000001', 'Migration 20250205000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000002', 'Migration 20250205000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000003', 'Migration 20250205000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000004', 'Migration 20250205000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000005', 'Migration 20250205000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000006', 'Migration 20250205000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000007
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000007', 'Migration 20250205000007')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000008
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000008', 'Migration 20250205000008')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000009
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000009', 'Migration 20250205000009')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000010
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000010', 'Migration 20250205000010')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000011
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000011', 'Migration 20250205000011')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000012
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000012', 'Migration 20250205000012')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000013
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000013', 'Migration 20250205000013')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000014
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000014', 'Migration 20250205000014')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250205000015
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205000015', 'Migration 20250205000015')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000000', 'Migration 20250206000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000001', 'Migration 20250206000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000001', 'Migration 20250206000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000002', 'Migration 20250206000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000002', 'Migration 20250206000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000003', 'Migration 20250206000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000003', 'Migration 20250206000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000004', 'Migration 20250206000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250206000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250206000004', 'Migration 20250206000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000001', 'Migration 20250207000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000001', 'Migration 20250207000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000002', 'Migration 20250207000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000002', 'Migration 20250207000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000003', 'Migration 20250207000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250207000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250207000004', 'Migration 20250207000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250208090000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250208090000', 'Migration 20250208090000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250208095000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250208095000', 'Migration 20250208095000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250208103000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250208103000', 'Migration 20250208103000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250208113000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250208113000', 'Migration 20250208113000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250213000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250213000001', 'Migration 20250213000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250214000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250214000000', 'Migration 20250214000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000000', 'Migration 20250215000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000001', 'Migration 20250215000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000002', 'Migration 20250215000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000003', 'Migration 20250215000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000004', 'Migration 20250215000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000005', 'Migration 20250215000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250215000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250215000006', 'Migration 20250215000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000000', 'Migration 20250216000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000001', 'Migration 20250216000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000002', 'Migration 20250216000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000003', 'Migration 20250216000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000004', 'Migration 20250216000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000005', 'Migration 20250216000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000006', 'Migration 20250216000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000007
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000007', 'Migration 20250216000007')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000008
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000008', 'Migration 20250216000008')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000009
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000009', 'Migration 20250216000009')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000010
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000010', 'Migration 20250216000010')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250216000011
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250216000011', 'Migration 20250216000011')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000000', 'Migration 20250220000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000000', 'Migration 20250220000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000001', 'Migration 20250220000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000001', 'Migration 20250220000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000002', 'Migration 20250220000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000002', 'Migration 20250220000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000003', 'Migration 20250220000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000003', 'Migration 20250220000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000004', 'Migration 20250220000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000004', 'Migration 20250220000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000005', 'Migration 20250220000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000005', 'Migration 20250220000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000006', 'Migration 20250220000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000006', 'Migration 20250220000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000007
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000007', 'Migration 20250220000007')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000008
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000008', 'Migration 20250220000008')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000009
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000009', 'Migration 20250220000009')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000012
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000012', 'Migration 20250220000012')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000013
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000013', 'Migration 20250220000013')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000014
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000014', 'Migration 20250220000014')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000015
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000015', 'Migration 20250220000015')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000016
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000016', 'Migration 20250220000016')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000017
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000017', 'Migration 20250220000017')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000018
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000018', 'Migration 20250220000018')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000019
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000019', 'Migration 20250220000019')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250220000020
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250220000020', 'Migration 20250220000020')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000000', 'Migration 20250221000000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000001', 'Migration 20250221000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000001', 'Migration 20250221000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000002', 'Migration 20250221000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000002', 'Migration 20250221000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000003', 'Migration 20250221000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000003
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000003', 'Migration 20250221000003')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000004', 'Migration 20250221000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000004
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000004', 'Migration 20250221000004')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000005
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000005', 'Migration 20250221000005')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000006
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000006', 'Migration 20250221000006')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000007
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000007', 'Migration 20250221000007')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000008
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000008', 'Migration 20250221000008')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000009
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000009', 'Migration 20250221000009')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250221000010
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250221000010', 'Migration 20250221000010')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250222000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250222000001', 'Migration 20250222000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250223000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250223000001', 'Migration 20250223000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20250223000002
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250223000002', 'Migration 20250223000002')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251021081840
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251021081840', 'Migration 20251021081840')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251110061419
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251110061419', 'Migration 20251110061419')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251110064854
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251110064854', 'Migration 20251110064854')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111090000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111090000', 'Migration 20251111090000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111091000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111091000', 'Migration 20251111091000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111092000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111092000', 'Migration 20251111092000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111100000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111100000', 'Migration 20251111100000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111101500
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111101500', 'Migration 20251111101500')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111115000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111115000', 'Migration 20251111115000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111121000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111121000', 'Migration 20251111121000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111132000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111132000', 'Migration 20251111132000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111133000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111133000', 'Migration 20251111133000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111134000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111134000', 'Migration 20251111134000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111135000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111135000', 'Migration 20251111135000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111140000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111140000', 'Migration 20251111140000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111141000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111141000', 'Migration 20251111141000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111150000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111150000', 'Migration 20251111150000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251111152000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111152000', 'Migration 20251111152000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251112071947
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251112071947', 'Migration 20251112071947')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251112073150
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251112073150', 'Migration 20251112073150')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251112120000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251112120000', 'Migration 20251112120000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251112130000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251112130000', 'Migration 20251112130000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113153000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113153000', 'Migration 20251113153000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113154000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113154000', 'Migration 20251113154000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113155000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113155000', 'Migration 20251113155000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113156000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113156000', 'Migration 20251113156000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113160000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113160000', 'Migration 20251113160000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113161000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113161000', 'Migration 20251113161000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113162000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113162000', 'Migration 20251113162000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113163000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113163000', 'Migration 20251113163000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113164000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113164000', 'Migration 20251113164000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113165000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113165000', 'Migration 20251113165000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113170000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113170000', 'Migration 20251113170000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251113171000
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251113171000', 'Migration 20251113171000')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251114000001
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251114000001', 'Migration 20251114000001')
ON CONFLICT (version) DO NOTHING;
-- Migration: 20251125220500
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251125220500', 'Migration 20251125220500')
ON CONFLICT (version) DO NOTHING;

-- Verify the repair
SELECT 
    version,
    name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- ============================================================================
-- END OF REPAIR SCRIPT
-- ============================================================================
