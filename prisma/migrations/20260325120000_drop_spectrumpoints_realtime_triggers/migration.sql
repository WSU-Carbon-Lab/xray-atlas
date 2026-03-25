DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spectrumpoints'
      AND NOT t.tgisinternal
      AND pg_get_triggerdef(t.oid) LIKE '%realtime.broadcast_changes%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.spectrumpoints', rec.trigger_name);
  END LOOP;
END $$;
