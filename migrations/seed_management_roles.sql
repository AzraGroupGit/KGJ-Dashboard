-- ============================================================================
-- Seed: Management (Leader) Roles
-- Run this in Supabase SQL Editor to create the management leader roles.
-- These roles use role_group = 'management' so they can login via the
-- Management card on the login page.
-- ============================================================================

INSERT INTO roles (name, role_group, description)
VALUES
  ('leader_hc', 'management', 'Leader HC — Human Capital'),
  ('leader_operational', 'management', 'Leader Operational'),
  ('leader_production', 'management', 'Leader Production'),
  ('leader_marketing', 'management', 'Leader Marketing'),
  ('leader_sales', 'management', 'Leader Sales'),
  ('leader_fat', 'management', 'Leader FAT — Finance, Accounting, Tax'),
  ('leader_rnd', 'management', 'Leader RND — Research & Development'),
  ('leader_safar', 'management', 'Leader Safar'),
  ('leader_ga', 'management', 'Leader GA — General Affairs')
ON CONFLICT (name) DO NOTHING;
