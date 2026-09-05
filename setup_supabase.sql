-- SQL Script para Inicializar las Tablas del Agente IA Multi-Tenant en Supabase

-- 1. Asegurar Permisos para service_role y roles de API
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- 2. Tabla para Clientes de la Agencia (Kommo + Configuración IA)
CREATE TABLE IF NOT EXISTS public.agency_crm_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR(50) UNIQUE NOT NULL, -- ej: 'fabri', 'favio', 'bettbit'
    client_name VARCHAR(100) NOT NULL,
    kommo_subdomain VARCHAR(100) NOT NULL, -- ej: 'suzydiazrojas.kommo.com'
    kommo_api_token TEXT NOT NULL,
    casino_offer_url TEXT NOT NULL, -- ej: 'https://bettbit.com/?clickid={clickid}&id=JO8420'
    system_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla para Sesiones e Historial de Leads por Cliente
CREATE TABLE IF NOT EXISTS public.lead_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES public.agency_crm_clients(client_id) ON DELETE CASCADE,
    kommo_lead_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    redtrack_clickid VARCHAR(100),
    status VARCHAR(30) DEFAULT 'AI_ACTIVE', -- 'AI_ACTIVE' o 'HUMAN_TAKEOVER'
    chat_history JSONB DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, kommo_lead_id)
);

-- 4. Tabla para Logs y Métricas de Conversación de la IA
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL,
    kommo_lead_id VARCHAR(100) NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    clickid_delivered VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Desactivar RLS y Otorgar Permisos Totales a service_role, anon y postgres
ALTER TABLE public.agency_crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.agency_crm_clients TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.lead_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_logs TO postgres, anon, authenticated, service_role;

-- 6. Insertar cliente inicial BettBit / Casino Demo
INSERT INTO public.agency_crm_clients (client_id, client_name, kommo_subdomain, kommo_api_token, casino_offer_url, system_prompt)
VALUES (
    'bettbit',
    'Casino BettBit',
    'suportecassino365.kommo.com',
    'COLOCAR_AQUI_TOKEN_KOMMO',
    'https://bettbit.com/?clickid={clickid}&id=JO8420',
    'Eres el Asesor VIP del casino BettBit. Tu objetivo es saludar amablemente en WhatsApp, responder dudas sobre los juegos y bonos de bienvenida, e incentivar al cliente a registrarse enviándole su enlace único de registro con su ClickID.'
) ON CONFLICT (client_id) DO NOTHING;

