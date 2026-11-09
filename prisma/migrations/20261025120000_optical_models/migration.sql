-- CreateEnum
CREATE TYPE "public"."OpticalModelVisibility" AS ENUM ('private', 'shared', 'public');

-- CreateEnum
CREATE TYPE "public"."OpticalModelVersionStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "public"."OpticalModelParentKind" AS ENUM ('fork', 'merge');

-- CreateEnum
CREATE TYPE "public"."OpticalModelAuthorRole" AS ENUM ('owner', 'coauthor');

-- CreateEnum
CREATE TYPE "public"."OpticalModelSignature" AS ENUM ('pending', 'signed');

-- CreateEnum
CREATE TYPE "public"."OpticalModelReviewState" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "public"."optical_model" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tag" VARCHAR(16) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_orcid" VARCHAR(19) NOT NULL,
    "owner_user_id" VARCHAR(19),
    "visibility" "public"."OpticalModelVisibility" NOT NULL DEFAULT 'private',
    "default_for_experiment_id" UUID,
    "forked_from_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optical_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" UUID NOT NULL,
    "version_number" INTEGER,
    "status" "public"."OpticalModelVersionStatus" NOT NULL DEFAULT 'draft',
    "normalization" JSONB,
    "authors_snapshot" JSONB,
    "checksum" VARCHAR(64),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optical_model_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_version_parent" (
    "version_id" UUID NOT NULL,
    "parent_version_id" UUID NOT NULL,
    "kind" "public"."OpticalModelParentKind" NOT NULL,

    CONSTRAINT "optical_model_version_parent_pkey" PRIMARY KEY ("version_id","parent_version_id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_dataset" (
    "version_id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "pinned_major" INTEGER NOT NULL,
    "pinned_minor" INTEGER NOT NULL,
    "pinned_patch" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',

    CONSTRAINT "optical_model_dataset_pkey" PRIMARY KEY ("version_id","experiment_id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_peak" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "experiment_id" UUID,
    "polarization_id" UUID,
    "center_ev" DOUBLE PRECISION NOT NULL,
    "kind" TEXT NOT NULL,
    "transition" TEXT,
    "amplitude" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "shape" TEXT,
    "center_err" DOUBLE PRECISION,
    "amplitude_err" DOUBLE PRECISION,
    "width_err" DOUBLE PRECISION,
    "params" JSONB,
    "fit_provenance" JSONB,

    CONSTRAINT "optical_model_peak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_tensor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "manifest" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optical_model_tensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."optical_model_share" (
    "model_id" UUID NOT NULL,
    "grantee_orcid" VARCHAR(19) NOT NULL,
    "granted_by_orcid" VARCHAR(19) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optical_model_share_pkey" PRIMARY KEY ("model_id","grantee_orcid")
);

-- CreateTable
CREATE TABLE "public"."optical_model_author" (
    "model_id" UUID NOT NULL,
    "orcid" VARCHAR(19) NOT NULL,
    "user_id" VARCHAR(19),
    "role" "public"."OpticalModelAuthorRole" NOT NULL,
    "signature" "public"."OpticalModelSignature" NOT NULL DEFAULT 'pending',
    "signed_at" TIMESTAMPTZ(6),
    "session_id" UUID,

    CONSTRAINT "optical_model_author_pkey" PRIMARY KEY ("model_id","orcid")
);

-- CreateTable
CREATE TABLE "public"."optical_model_review" (
    "model_id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "state" "public"."OpticalModelReviewState" NOT NULL,
    "reviewer_user_id" VARCHAR(19),
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "optical_model_review_pkey" PRIMARY KEY ("model_id","experiment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_tag_key" ON "public"."optical_model"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_default_for_experiment_id_key" ON "public"."optical_model"("default_for_experiment_id");

-- CreateIndex
CREATE INDEX "idx_optical_model_owner_orcid" ON "public"."optical_model"("owner_orcid");

-- CreateIndex
CREATE INDEX "idx_optical_model_version_model_status" ON "public"."optical_model_version"("model_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_version_model_number_key" ON "public"."optical_model_version"("model_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_version_one_draft_key" ON "public"."optical_model_version"("model_id") WHERE (status = 'draft');

-- CreateIndex
CREATE INDEX "idx_optical_model_version_parent_parent" ON "public"."optical_model_version_parent"("parent_version_id");

-- CreateIndex
CREATE INDEX "idx_optical_model_dataset_experiment" ON "public"."optical_model_dataset"("experiment_id");

-- CreateIndex
CREATE INDEX "idx_optical_model_peak_version_center" ON "public"."optical_model_peak"("version_id", "center_ev");

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_peak_version_ordinal_key" ON "public"."optical_model_peak"("version_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "optical_model_tensor_version_id_key" ON "public"."optical_model_tensor"("version_id");

-- CreateIndex
CREATE INDEX "idx_optical_model_share_grantee" ON "public"."optical_model_share"("grantee_orcid");

-- CreateIndex
CREATE INDEX "idx_optical_model_author_orcid" ON "public"."optical_model_author"("orcid");

-- CreateIndex
CREATE INDEX "idx_optical_model_review_experiment" ON "public"."optical_model_review"("experiment_id");

-- AddForeignKey
ALTER TABLE "public"."optical_model" ADD CONSTRAINT "optical_model_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "next_auth"."user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model" ADD CONSTRAINT "optical_model_default_for_experiment_id_fkey" FOREIGN KEY ("default_for_experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model" ADD CONSTRAINT "optical_model_forked_from_version_id_fkey" FOREIGN KEY ("forked_from_version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_version" ADD CONSTRAINT "optical_model_version_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."optical_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_version_parent" ADD CONSTRAINT "optical_model_version_parent_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_version_parent" ADD CONSTRAINT "optical_model_version_parent_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_dataset" ADD CONSTRAINT "optical_model_dataset_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_dataset" ADD CONSTRAINT "optical_model_dataset_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_peak" ADD CONSTRAINT "optical_model_peak_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_peak" ADD CONSTRAINT "optical_model_peak_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_peak" ADD CONSTRAINT "optical_model_peak_polarization_id_fkey" FOREIGN KEY ("polarization_id") REFERENCES "public"."polarizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_tensor" ADD CONSTRAINT "optical_model_tensor_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."optical_model_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_share" ADD CONSTRAINT "optical_model_share_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."optical_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_author" ADD CONSTRAINT "optical_model_author_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."optical_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_author" ADD CONSTRAINT "optical_model_author_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_review" ADD CONSTRAINT "optical_model_review_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."optical_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_review" ADD CONSTRAINT "optical_model_review_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."optical_model_review" ADD CONSTRAINT "optical_model_review_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "next_auth"."user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Row level security: enabled with no policies, so the Supabase anon and authenticated roles see no
-- rows. The application reads and writes through the `prisma` role, which owns these tables.
ALTER TABLE "public"."optical_model" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_version_parent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_dataset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_peak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_tensor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_share" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_author" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."optical_model_review" ENABLE ROW LEVEL SECURITY;

-- Value constraints that Prisma cannot express.
ALTER TABLE "public"."optical_model_peak"
  ADD CONSTRAINT "optical_model_peak_kind_check"
  CHECK ("kind" IN ('pi-star', 'sigma-star', 'other'));
ALTER TABLE "public"."optical_model_peak"
  ADD CONSTRAINT "optical_model_peak_width_check"
  CHECK ("width" IS NULL OR "width" >= 0);
ALTER TABLE "public"."optical_model_version"
  ADD CONSTRAINT "optical_model_version_number_check"
  CHECK ("version_number" IS NULL OR "version_number" >= 1);
ALTER TABLE "public"."optical_model_version"
  ADD CONSTRAINT "optical_model_version_status_number_check"
  CHECK (
    ("status" = 'draft' AND "version_number" IS NULL)
    OR ("status" = 'published' AND "version_number" IS NOT NULL)
  );
