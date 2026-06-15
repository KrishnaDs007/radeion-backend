CREATE TABLE "data_query_presets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_profile_id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "data_set" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_query_presets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_query_presets_owner_profile_id_name_key" ON "data_query_presets"("owner_profile_id", "name");
CREATE INDEX "data_query_presets_owner_profile_id_idx" ON "data_query_presets"("owner_profile_id");
CREATE INDEX "data_query_presets_organization_id_idx" ON "data_query_presets"("organization_id");
CREATE INDEX "data_query_presets_data_set_idx" ON "data_query_presets"("data_set");

ALTER TABLE "data_query_presets" ADD CONSTRAINT "data_query_presets_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_query_presets" ADD CONSTRAINT "data_query_presets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
