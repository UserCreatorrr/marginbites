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

-- 2. T-SPOONLAB MIGRATION (Tenant Config)
CREATE TABLE public.tenant_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tspoonlab_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PROVEEDORES (Vendors)
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tspoonlab_id TEXT, -- Para mapear si viene de TSpoonlab
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ARTICULOS (Products/Ingredients)
CREATE TABLE public.articulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    tspoonlab_id TEXT,
    unit TEXT, -- e.g. 'kg', 'Litros', 'Uds'
    cost_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PEDIDOS (Orders)
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'received', 'cancelled')) DEFAULT 'draft',
    total_amount NUMERIC(10, 2),
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: { articulo_id, name, quantity, unit, price }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ALBARANES (Invoices - scanned via AI)
CREATE TABLE public.albaranes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('needs_review', 'approved')) DEFAULT 'needs_review',
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- AI Extracted data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ESCANDALLOS (Recipes / Smart Bleeding)
CREATE TABLE public.escandallos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    sale_price NUMERIC(10, 2),
    cost_price NUMERIC(10, 2), -- Calculated field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Items inside Escandallos (Ingredients per Recipe)
CREATE TABLE public.escandallo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escandallo_id UUID REFERENCES public.escandallos(id) ON DELETE CASCADE,
    articulo_id UUID REFERENCES public.articulos(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) on all tables to ensure users only see their own data
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albaranes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escandallos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escandallo_items ENABLE ROW LEVEL SECURITY;

-- Create policies for normal usage
CREATE POLICY "Users can only see their own tenant config" ON public.tenant_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own proveedores" ON public.proveedores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own articulos" ON public.articulos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own pedidos" ON public.pedidos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own albaranes" ON public.albaranes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own escandallos" ON public.escandallos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own escandallo items" ON public.escandallo_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.escandallos e WHERE e.id = escandallo_items.escandallo_id AND e.user_id = auth.uid()));
