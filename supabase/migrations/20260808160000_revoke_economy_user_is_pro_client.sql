-- Residual abuse hardening: clients must not probe arbitrary UUIDs for Pro status.
-- economy_user_is_pro is an internal SECURITY DEFINER helper used by league RPCs
-- and Stripe/economy paths. Authenticated was re-granted EXECUTE in
-- 20260808130200_admin_roles_user_id.sql; revoke client roles again.
--
-- Peer Pro badges in get_league_standings remain a product surface (scoped),
-- not a free UUID oracle.

REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.economy_user_is_pro(uuid) FROM authenticated;

-- Defense in depth: entitlement grant helper must stay service-role only.
DO $$
BEGIN
  IF to_regprocedure('public.user_has_entitlement_grant(uuid, text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.user_has_entitlement_grant(uuid, text) FROM authenticated';
  END IF;
END $$;
