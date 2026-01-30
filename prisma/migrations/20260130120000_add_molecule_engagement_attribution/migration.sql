-- Migration: Add molecule engagement and attribution system
-- This migration adds:
-- 1. tags table for categorization
-- 2. molecule_contributors for attribution tracking
-- 3. molecule_favorites (replaces upvotes)
-- 4. molecule_views for view tracking
-- 5. molecule_tags junction table
-- 6. favorite_count and view_count columns on molecules
-- 7. Triggers to sync favorite_count
-- 8. Backfill data from existing upvotes
-- 9. RLS policies for new tables
-- 10. Seed predefined tags

-- =============================================================================
-- PART 1: CREATE NEW TABLES
-- =============================================================================

-- Tags table for categorization
CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tags_name_key" UNIQUE ("name"),
    CONSTRAINT "tags_slug_key" UNIQUE ("slug")
);

-- Molecule contributors for attribution
CREATE TABLE IF NOT EXISTS "public"."molecule_contributors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "molecule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contribution_type" TEXT NOT NULL DEFAULT 'contributor',
    "contributed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "molecule_contributors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "molecule_contributors_molecule_id_user_id_key" UNIQUE ("molecule_id", "user_id")
);

-- Molecule favorites (replaces upvotes)
CREATE TABLE IF NOT EXISTS "public"."molecule_favorites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "molecule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "molecule_favorites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "molecule_favorites_molecule_id_user_id_key" UNIQUE ("molecule_id", "user_id")
);

-- Molecule views for tracking
CREATE TABLE IF NOT EXISTS "public"."molecule_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "molecule_id" UUID NOT NULL,
    "user_id" UUID,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "session_id" TEXT,
    CONSTRAINT "molecule_views_pkey" PRIMARY KEY ("id")
);

-- Molecule tags junction table
CREATE TABLE IF NOT EXISTS "public"."molecule_tags" (
    "molecule_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "molecule_tags_pkey" PRIMARY KEY ("molecule_id", "tag_id")
);

-- =============================================================================
-- PART 2: ADD COLUMNS TO MOLECULES
-- =============================================================================

ALTER TABLE "public"."molecules"
    ADD COLUMN IF NOT EXISTS "favorite_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- PART 3: ADD FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- molecule_contributors FKs
ALTER TABLE "public"."molecule_contributors"
    ADD CONSTRAINT "molecule_contributors_molecule_id_fkey"
    FOREIGN KEY ("molecule_id")
    REFERENCES "public"."molecules"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

ALTER TABLE "public"."molecule_contributors"
    ADD CONSTRAINT "molecule_contributors_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "next_auth"."users"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

-- molecule_favorites FKs
ALTER TABLE "public"."molecule_favorites"
    ADD CONSTRAINT "molecule_favorites_molecule_id_fkey"
    FOREIGN KEY ("molecule_id")
    REFERENCES "public"."molecules"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

ALTER TABLE "public"."molecule_favorites"
    ADD CONSTRAINT "molecule_favorites_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "next_auth"."users"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

-- molecule_views FKs
ALTER TABLE "public"."molecule_views"
    ADD CONSTRAINT "molecule_views_molecule_id_fkey"
    FOREIGN KEY ("molecule_id")
    REFERENCES "public"."molecules"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

ALTER TABLE "public"."molecule_views"
    ADD CONSTRAINT "molecule_views_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "next_auth"."users"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;

-- molecule_tags FKs
ALTER TABLE "public"."molecule_tags"
    ADD CONSTRAINT "molecule_tags_molecule_id_fkey"
    FOREIGN KEY ("molecule_id")
    REFERENCES "public"."molecules"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

ALTER TABLE "public"."molecule_tags"
    ADD CONSTRAINT "molecule_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id")
    REFERENCES "public"."tags"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

-- =============================================================================
-- PART 4: ADD INDEXES
-- =============================================================================

-- molecule_contributors indexes
CREATE INDEX IF NOT EXISTS "idx_molecule_contributors_molecule_id"
    ON "public"."molecule_contributors"("molecule_id");
CREATE INDEX IF NOT EXISTS "idx_molecule_contributors_user_id"
    ON "public"."molecule_contributors"("user_id");

-- molecule_favorites indexes
CREATE INDEX IF NOT EXISTS "idx_molecule_favorites_molecule_id"
    ON "public"."molecule_favorites"("molecule_id");
CREATE INDEX IF NOT EXISTS "idx_molecule_favorites_user_id"
    ON "public"."molecule_favorites"("user_id");

-- molecule_views indexes
CREATE INDEX IF NOT EXISTS "idx_molecule_views_molecule_id"
    ON "public"."molecule_views"("molecule_id");
CREATE INDEX IF NOT EXISTS "idx_molecule_views_user_id"
    ON "public"."molecule_views"("user_id");
CREATE INDEX IF NOT EXISTS "idx_molecule_views_dedup"
    ON "public"."molecule_views"("molecule_id", "user_id", "session_id");

-- molecule_tags indexes
CREATE INDEX IF NOT EXISTS "idx_molecule_tags_tag_id"
    ON "public"."molecule_tags"("tag_id");

-- =============================================================================
-- PART 5: BACKFILL molecule_contributors FROM molecules.createdby
-- =============================================================================

INSERT INTO "public"."molecule_contributors" ("molecule_id", "user_id", "contribution_type", "contributed_at")
SELECT
    m."id",
    m."createdby"::UUID,
    'creator',
    m."createdat"
FROM "public"."molecules" m
WHERE m."createdby" IS NOT NULL
ON CONFLICT ("molecule_id", "user_id") DO NOTHING;

-- =============================================================================
-- PART 6: MIGRATE UPVOTES TO FAVORITES
-- =============================================================================

-- Copy existing upvotes to favorites
INSERT INTO "public"."molecule_favorites" ("molecule_id", "user_id", "created_at")
SELECT
    mu."moleculeid",
    mu."userid"::UUID,
    mu."createdat"
FROM "public"."moleculeupvotes" mu
WHERE mu."userid" IS NOT NULL
  AND mu."userid" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT ("molecule_id", "user_id") DO NOTHING;

-- Update favorite_count based on migrated favorites
UPDATE "public"."molecules" m
SET "favorite_count" = (
    SELECT COUNT(*)
    FROM "public"."molecule_favorites" mf
    WHERE mf."molecule_id" = m."id"
);

-- =============================================================================
-- PART 7: CREATE TRIGGERS FOR favorite_count SYNC
-- =============================================================================

-- Function to increment favorite_count
CREATE OR REPLACE FUNCTION increment_molecule_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "public"."molecules"
    SET "favorite_count" = "favorite_count" + 1
    WHERE "id" = NEW."molecule_id";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement favorite_count
CREATE OR REPLACE FUNCTION decrement_molecule_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "public"."molecules"
    SET "favorite_count" = GREATEST("favorite_count" - 1, 0)
    WHERE "id" = OLD."molecule_id";
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on insert
DROP TRIGGER IF EXISTS trigger_increment_favorite_count ON "public"."molecule_favorites";
CREATE TRIGGER trigger_increment_favorite_count
    AFTER INSERT ON "public"."molecule_favorites"
    FOR EACH ROW
    EXECUTE FUNCTION increment_molecule_favorite_count();

-- Trigger on delete
DROP TRIGGER IF EXISTS trigger_decrement_favorite_count ON "public"."molecule_favorites";
CREATE TRIGGER trigger_decrement_favorite_count
    AFTER DELETE ON "public"."molecule_favorites"
    FOR EACH ROW
    EXECUTE FUNCTION decrement_molecule_favorite_count();

-- =============================================================================
-- PART 8: ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- tags: Public read, service role write
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_select_policy" ON "public"."tags"
    FOR SELECT USING (true);
CREATE POLICY "tags_all_service_role" ON "public"."tags"
    FOR ALL USING (is_service_role());

-- molecule_contributors: Public read, service role write
ALTER TABLE "public"."molecule_contributors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "molecule_contributors_select_policy" ON "public"."molecule_contributors"
    FOR SELECT USING (true);
CREATE POLICY "molecule_contributors_all_service_role" ON "public"."molecule_contributors"
    FOR ALL USING (is_service_role());

-- molecule_favorites: Public read, service role write
ALTER TABLE "public"."molecule_favorites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "molecule_favorites_select_policy" ON "public"."molecule_favorites"
    FOR SELECT USING (true);
CREATE POLICY "molecule_favorites_all_service_role" ON "public"."molecule_favorites"
    FOR ALL USING (is_service_role());

-- molecule_views: Public read, service role write
ALTER TABLE "public"."molecule_views" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "molecule_views_select_policy" ON "public"."molecule_views"
    FOR SELECT USING (true);
CREATE POLICY "molecule_views_all_service_role" ON "public"."molecule_views"
    FOR ALL USING (is_service_role());

-- molecule_tags: Public read, service role write
ALTER TABLE "public"."molecule_tags" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "molecule_tags_select_policy" ON "public"."molecule_tags"
    FOR SELECT USING (true);
CREATE POLICY "molecule_tags_all_service_role" ON "public"."molecule_tags"
    FOR ALL USING (is_service_role());

-- =============================================================================
-- PART 9: SEED PREDEFINED TAGS
-- =============================================================================

INSERT INTO "public"."tags" ("name", "slug", "color") VALUES
    ('Polymer', 'polymer', 'primary'),
    ('Small Molecule', 'small-molecule', 'secondary'),
    ('Protein', 'protein', 'success'),
    ('Organic', 'organic', 'warning'),
    ('Inorganic', 'inorganic', 'danger'),
    ('Metal Complex', 'metal-complex', 'default'),
    ('Semiconductor', 'semiconductor', 'primary'),
    ('Photovoltaic', 'photovoltaic', 'warning'),
    ('Catalyst', 'catalyst', 'success'),
    ('Biomolecule', 'biomolecule', 'secondary')
ON CONFLICT ("name") DO NOTHING;
