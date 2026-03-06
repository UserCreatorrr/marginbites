-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS EXTENSION (Roles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically set superadmin
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email = 'pabloperez@visualandgrowth.es' THEN 'superadmin' 
      ELSE 'user' 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. T-SPOONLAB MIGRATION CONFIG (Per user/tenant)
CREATE TABLE public.tenant_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tspoonlab_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. CORE ENTITIES
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tspoonlab_id TEXT, -- Para mapeo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.articulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    unit TEXT,
    tspoonlab_id TEXT, -- Para mapeo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PEDIDOS & ALBARANES
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'delivered', 'cancelled')) DEFAULT 'draft',
    total_amount NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.pedido_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    articulo_id UUID REFERENCES public.articulos(id),
    quantity NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.albaranes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id),
    document_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('processing', 'needs_review', 'approved')) DEFAULT 'processing',
    extracted_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. STOCK LEDGER
CREATE TABLE public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    articulo_id UUID REFERENCES public.articulos(id) ON DELETE CASCADE,
    albaran_id UUID REFERENCES public.albaranes(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity NUMERIC(10,2) NOT NULL,
    unit_cost NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- RLS POLICIES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albaranes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- Helper function to check if superadmin
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Policies (Simplified: Users see own data, superadmin sees all)
-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR is_superadmin());

-- tenant_config
CREATE POLICY "Users can manage own config" ON public.tenant_config FOR ALL USING (auth.uid() = user_id OR is_superadmin());

-- proveedores
CREATE POLICY "Users can manage own proveedores" ON public.proveedores FOR ALL USING (auth.uid() = user_id OR is_superadmin());

-- articulos
CREATE POLICY "Users can manage own articulos" ON public.articulos FOR ALL USING (auth.uid() = user_id OR is_superadmin());

-- pedidos
CREATE POLICY "Users can manage own pedidos" ON public.pedidos FOR ALL USING (auth.uid() = user_id OR is_superadmin());

-- pedido_items
CREATE POLICY "Users can manage own pedido_items" ON public.pedido_items FOR ALL USING (
    EXISTS(SELECT 1 FROM public.pedidos WHERE id = pedido_items.pedido_id AND (user_id = auth.uid() OR is_superadmin()))
);

-- albaranes
CREATE POLICY "Users can manage own albaranes" ON public.albaranes FOR ALL USING (auth.uid() = user_id OR is_superadmin());

-- stock_ledger
CREATE POLICY "Users can manage own stock" ON public.stock_ledger FOR ALL USING (auth.uid() = user_id OR is_superadmin());

