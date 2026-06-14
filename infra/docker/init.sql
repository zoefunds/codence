-- Codence Database Initialization
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Using text columns with CHECK constraints instead of native enums
-- for simpler ORM compatibility while still enforcing valid values.

-- ══════════════════════════════════════════
-- IDENTITY DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL,
  type        text NOT NULL DEFAULT 'team' CHECK (type IN ('personal', 'team')),
  avatar_url  text,
  settings    jsonb NOT NULL DEFAULT '{}',
  plan        text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_orgs_slug ON organizations (slug);

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  email_normalized text GENERATED ALWAYS AS (lower(trim(email))) STORED,
  password_hash    text NOT NULL,
  display_name     text NOT NULL,
  avatar_url       text,
  email_verified_at timestamptz,
  personal_org_id  uuid REFERENCES organizations(id),
  is_active        bool NOT NULL DEFAULT true,
  last_login_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_users_email ON users (email_normalized);
CREATE INDEX idx_users_created ON users (created_at);

CREATE TABLE org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'reviewer', 'viewer')),
  invited_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_at  timestamptz,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_org_members_unique ON org_members (org_id, user_id);
CREATE INDEX idx_org_members_user ON org_members (user_id);

-- ══════════════════════════════════════════
-- WALLET DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE wallets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address               text NOT NULL,
  encrypted_private_key bytea NOT NULL,
  dek_wrap              bytea NOT NULL,
  kdf_params            jsonb NOT NULL,
  key_version           int NOT NULL DEFAULT 1,
  recovery_blob         bytea,
  recovery_code_hash    text,
  exported_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_wallets_address ON wallets (address);

-- ══════════════════════════════════════════
-- GITHUB DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE github_installations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id   bigint NOT NULL,
  account_login     text NOT NULL,
  account_type      text NOT NULL,
  permissions       jsonb NOT NULL DEFAULT '{}',
  events            text[] NOT NULL DEFAULT '{}',
  suspended_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_gh_install_id ON github_installations (installation_id);
CREATE INDEX idx_gh_install_org ON github_installations (org_id);

-- ══════════════════════════════════════════
-- REPOSITORY DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE repositories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id   uuid REFERENCES github_installations(id) ON DELETE SET NULL,
  github_repo_id    bigint,
  full_name         text,
  default_branch    text DEFAULT 'main',
  primary_language  text,
  auto_review       bool NOT NULL DEFAULT false,
  review_config     jsonb NOT NULL DEFAULT '{}',
  last_synced_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_repos_org ON repositories (org_id);
CREATE UNIQUE INDEX idx_repos_gh_id ON repositories (github_repo_id) WHERE github_repo_id IS NOT NULL;

-- ══════════════════════════════════════════
-- REVIEW DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repo_id         uuid REFERENCES repositories(id) ON DELETE SET NULL,
  created_by      uuid NOT NULL REFERENCES users(id),
  source          text NOT NULL CHECK (source IN ('github_pr', 'github_push', 'upload', 'paste')),
  title           text NOT NULL,
  description     text,
  pr_number       int,
  commit_sha      text,
  branch          text,
  code_hash       text NOT NULL,
  blob_url        text,
  language        text,
  languages       text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ingesting', 'analyzing', 'consensus', 'done', 'failed')),
  error_message   text,
  chain_tx_hash   text,
  chain_review_id text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_org ON reviews (org_id, created_at DESC);
CREATE INDEX idx_reviews_repo ON reviews (repo_id, created_at DESC) WHERE repo_id IS NOT NULL;
CREATE INDEX idx_reviews_status ON reviews (status) WHERE status NOT IN ('done', 'failed');
CREATE INDEX idx_reviews_created_by ON reviews (created_by);

CREATE TABLE review_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  file_path     text NOT NULL,
  language      text,
  content_hash  text NOT NULL,
  blob_key      text NOT NULL,
  line_count    int NOT NULL DEFAULT 0,
  size_bytes    bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_files_review ON review_files (review_id);
CREATE UNIQUE INDEX idx_review_files_path ON review_files (review_id, file_path);

-- ══════════════════════════════════════════
-- FINDINGS DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE findings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  file_id             uuid REFERENCES review_files(id) ON DELETE SET NULL,
  category            text NOT NULL CHECK (category IN ('vulnerability', 'code_smell', 'performance', 'architecture', 'security_config', 'dependency', 'gas_optimization', 'logic_error', 'access_control', 'best_practice')),
  title               text NOT NULL,
  description         text NOT NULL,
  line_start          int,
  line_end            int,
  code_snippet        text,
  consensus_severity  text CHECK (consensus_severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  consensus_verdict   text CHECK (consensus_verdict IN ('confirmed', 'disputed', 'dismissed')),
  confidence          float,
  remediation         text,
  content_hash        text NOT NULL,
  chain_finding_id    text,
  false_positive_flag bool NOT NULL DEFAULT false,
  flagged_by          uuid REFERENCES users(id),
  flagged_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_findings_review ON findings (review_id);
CREATE INDEX idx_findings_severity ON findings (consensus_severity) WHERE consensus_verdict = 'confirmed';
CREATE INDEX idx_findings_category ON findings (category, review_id);

CREATE TABLE validator_votes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id          uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  validator_index     int NOT NULL CHECK (validator_index BETWEEN 0 AND 4),
  vote_exists         bool NOT NULL,
  severity            text CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  exploitability      text CHECK (exploitability IN ('proven', 'likely', 'unlikely', 'none')),
  reasoning           text NOT NULL,
  reasoning_hash      text NOT NULL,
  evidence_quality    float CHECK (evidence_quality BETWEEN 0 AND 1),
  remediation_quality float CHECK (remediation_quality BETWEEN 0 AND 1),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_votes_unique ON validator_votes (finding_id, validator_index);
CREATE INDEX idx_votes_finding ON validator_votes (finding_id);

CREATE TABLE consensus_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           uuid NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
  total_findings      int NOT NULL DEFAULT 0,
  confirmed_count     int NOT NULL DEFAULT 0,
  disputed_count      int NOT NULL DEFAULT 0,
  dismissed_count     int NOT NULL DEFAULT 0,
  severity_breakdown  jsonb NOT NULL DEFAULT '{}',
  overall_risk        text NOT NULL CHECK (overall_risk IN ('critical', 'high', 'medium', 'low', 'clean')),
  avg_confidence      float NOT NULL,
  chain_tx_hash       text,
  finalized_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════
-- AUTH DOMAIN
-- ══════════════════════════════════════════

CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  text NOT NULL,
  ip_address          text,
  user_agent          text,
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE email_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_verify_user ON email_verifications (user_id);

CREATE TABLE password_resets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pw_reset_user ON password_resets (user_id);

-- ══════════════════════════════════════════
-- API KEYS
-- ══════════════════════════════════════════

CREATE TABLE api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES users(id),
  key_hash    text NOT NULL,
  prefix      text NOT NULL,
  label       text NOT NULL,
  scopes      text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_org ON api_keys (org_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE revoked_at IS NULL;

-- ══════════════════════════════════════════
-- AUDIT LOG
-- ══════════════════════════════════════════

CREATE TABLE audit_events (
  id              bigserial PRIMARY KEY,
  org_id          uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  resource_type   text,
  resource_id     text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  ip_address      inet,
  chain_anchor_hash text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org ON audit_events (org_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_events (actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_events (action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_events (resource_type, resource_id);

-- ══════════════════════════════════════════
-- USAGE METERING
-- ══════════════════════════════════════════

CREATE TABLE usage_records (
  id            bigserial PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  review_id     uuid REFERENCES reviews(id) ON DELETE SET NULL,
  metric        text NOT NULL CHECK (metric IN ('review', 'finding', 'consensus_tx')),
  quantity      int NOT NULL DEFAULT 1,
  gas_used      bigint,
  period_start  date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_org_period ON usage_records (org_id, period_start);

-- ══════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'organizations', 'wallets', 'github_installations',
      'repositories', 'reviews', 'findings'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
