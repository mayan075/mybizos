-- Migration: 0003_row-level-security.sql
-- Enables PostgreSQL Row-Level Security (RLS) on all tenant-scoped tables.
-- Policy logic:
--   - When app.current_org_id is set → only rows where org_id matches are visible.
--   - When app.current_org_id is NULL or empty → all rows are visible (safe for
--     migrations and superuser operations).

-- ─── contacts ────────────────────────────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contacts ON contacts
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── companies ───────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_companies ON companies
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── deals ───────────────────────────────────────────────────────────────────
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_deals ON deals
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── pipelines ───────────────────────────────────────────────────────────────
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_pipelines ON pipelines
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── pipeline_stages ─────────────────────────────────────────────────────────
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_pipeline_stages ON pipeline_stages
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── activities ──────────────────────────────────────────────────────────────
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_activities ON activities
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── conversations ────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── messages ────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_messages ON messages
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── campaigns ───────────────────────────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── campaign_recipients ─────────────────────────────────────────────────────
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_campaign_recipients ON campaign_recipients
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── drip_sequences ──────────────────────────────────────────────────────────
ALTER TABLE drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_sequences FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_drip_sequences ON drip_sequences
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── sequence_enrollments ────────────────────────────────────────────────────
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sequence_enrollments ON sequence_enrollments
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── ai_agents ───────────────────────────────────────────────────────────────
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_agents ON ai_agents
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── ai_call_logs ────────────────────────────────────────────────────────────
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_call_logs ON ai_call_logs
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── wallet_accounts ─────────────────────────────────────────────────────────
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_wallet_accounts ON wallet_accounts
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── wallet_transactions ─────────────────────────────────────────────────────
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_wallet_transactions ON wallet_transactions
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── invoices ────────────────────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_invoices ON invoices
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── estimates ───────────────────────────────────────────────────────────────
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_estimates ON estimates
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── appointments ────────────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_appointments ON appointments
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── availability_rules ──────────────────────────────────────────────────────
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_availability_rules ON availability_rules
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── forms ───────────────────────────────────────────────────────────────────
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_forms ON forms
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── form_submissions ────────────────────────────────────────────────────────
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_form_submissions ON form_submissions
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── notifications ───────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notifications ON notifications
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── social_posts ────────────────────────────────────────────────────────────
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_social_posts ON social_posts
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── call_history ────────────────────────────────────────────────────────────
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_call_history ON call_history
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── reviews ─────────────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_reviews ON reviews
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );

-- ─── review_campaigns ────────────────────────────────────────────────────────
ALTER TABLE review_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_campaigns FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_review_campaigns ON review_campaigns
  USING (
    org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR current_setting('app.current_org_id', true) IS NULL
    OR current_setting('app.current_org_id', true) = ''
  );
