-- Cloudflare D1 SQL Schema for Autonomous Web AI Agent
-- Ejecutar en Cloudflare D1 mediante: wrangler d1 execute agentweb_db --file=./schema.sql

DROP TABLE IF EXISTS chat_sessions;

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  click_id TEXT,
  name TEXT,
  whatsapp TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'INIT',
  payment_id TEXT,
  payment_url TEXT,
  qr_code_base64 TEXT,
  credentials_username TEXT,
  credentials_password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices optimizados para lecturas en el Edge (< 5ms)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_click_id ON chat_sessions(click_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_payment_id ON chat_sessions(payment_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_whatsapp ON chat_sessions(whatsapp);
