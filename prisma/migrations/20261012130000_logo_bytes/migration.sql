-- AlterTable: mover el logo de data-URL (TEXT) a bytes + mime.
ALTER TABLE "school_settings"
ADD COLUMN     "logoData" BYTEA,
ADD COLUMN     "logoMime" TEXT;

-- Migrar logos existentes guardados como data URL base64.
UPDATE "school_settings"
SET "logoMime" = regexp_replace("logoUrl", '^data:([^;]+);base64,.*$', '\1'),
    "logoData" = decode(regexp_replace("logoUrl", '^data:[^;]+;base64,', ''), 'base64')
WHERE "logoUrl" LIKE 'data:%base64,%';

ALTER TABLE "school_settings" DROP COLUMN "logoUrl";
