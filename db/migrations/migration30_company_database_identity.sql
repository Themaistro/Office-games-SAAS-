-- One company per database. This boundary includes every current and future
-- table automatically; it is not partial row filtering presented as tenancy.
CREATE TABLE IF NOT EXISTS deployment_identity (
  id integer PRIMARY KEY CHECK(id=1),
  company_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL CHECK(length(trim(company_name))>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO deployment_identity(id,company_id,company_name)
VALUES(1,'00000000-0000-4000-8000-000000000001','Office Games')
ON CONFLICT(id) DO NOTHING;
