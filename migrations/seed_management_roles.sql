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
  ('leader_cs', 'management', 'Leader Customer Service')
ON CONFLICT (name) DO NOTHING;
