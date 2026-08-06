-- GANN / RSoXS-style uploads report motor angles outside the classic 0-180 NEXAFS
-- polar range (for example theta=210 in transmission_ZnPc.csv). Allow laboratory
-- polar angles in [-360, 360] while keeping a finite bound for bad casts.
ALTER TABLE "public"."polarizations" DROP CONSTRAINT IF EXISTS "polarizations_polardeg_check";

ALTER TABLE "public"."polarizations"
ADD CONSTRAINT "polarizations_polardeg_check"
CHECK ((polardeg >= (-360)::numeric) AND (polardeg <= (360)::numeric));
