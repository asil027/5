-- ============================================================================
-- AURA COFFEE ROASTERS - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Copy and paste this complete script into your Supabase Dashboard -> SQL Editor
-- Click "Run" to initialize all tables, secure Row Level Security (RLS), and seed data.
-- ============================================================================

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    order_type TEXT NOT NULL,
    address TEXT,
    coffee TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    cup_size TEXT,
    milk TEXT,
    temperature TEXT,
    sweetness TEXT,
    notes TEXT,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    time TEXT,
    payment_method TEXT,
    payment_status TEXT,
    transaction_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table was already created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

-- Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders Policies
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;
CREATE POLICY "Public can place orders"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
    ON public.orders FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can update order status" ON public.orders;
CREATE POLICY "Public can update order status"
    ON public.orders FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    rating TEXT DEFAULT '5.0',
    reviews_count INTEGER DEFAULT 100,
    badge TEXT,
    badge_class TEXT DEFAULT 'gold-badge',
    category TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    image TEXT,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Menu Items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Menu Items Policies
DROP POLICY IF EXISTS "Public can read menu" ON public.menu_items;
CREATE POLICY "Public can read menu"
    ON public.menu_items FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can manage menu items" ON public.menu_items;
CREATE POLICY "Public can manage menu items"
    ON public.menu_items FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Seed initial menu items
INSERT INTO public.menu_items (id, name, price, rating, reviews_count, badge, badge_class, category, description, tags, image, in_stock)
VALUES 
(
    'drink-1',
    'Vanilla Latte',
    600,
    '5.0',
    148,
    '⭐ Customer Favorite',
    'gold-badge',
    'featured espresso',
    'Double shot of espresso combined with steamed velvety microfoam, infused with pure Madagascar vanilla extract and finished with master rosetta latte art.',
    '["Espresso", "Madagascar Vanilla", "Velvet Milk"]'::jsonb,
    'assets/images/vanilla-latte.jpg',
    true
),
(
    'drink-2',
    'Caramel Coffee',
    500,
    '5.0',
    192,
    '🔥 Bestseller',
    'bestseller-badge',
    'featured iced espresso',
    'Artisanal layered macchiato featuring sweet cream milk, fresh espresso cascade, and decadent house-crafted butter caramel drizzle with crunchy roasted bean crumble.',
    '["Artisan Caramel", "Cold / Hot", "Layered Macchiato"]'::jsonb,
    'assets/images/caramel-coffee.jpg',
    true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. CAFE SETTINGS & OPERATIONAL DETAILS
CREATE TABLE IF NOT EXISTS public.cafe_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    weekday_hours TEXT NOT NULL,
    sunday_hours TEXT NOT NULL,
    address TEXT NOT NULL,
    hotline TEXT NOT NULL,
    raw_phone TEXT NOT NULL,
    email TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Cafe Settings
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;

-- Cafe Settings Policies
DROP POLICY IF EXISTS "Public can read cafe settings" ON public.cafe_settings;
CREATE POLICY "Public can read cafe settings"
    ON public.cafe_settings FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can update cafe settings" ON public.cafe_settings;
CREATE POLICY "Public can update cafe settings"
    ON public.cafe_settings FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Seed initial cafe settings
INSERT INTO public.cafe_settings (id, weekday_hours, sunday_hours, address, hotline, raw_phone, email)
VALUES (
    'current',
    'Monday – Saturday: 11:00 AM – 10:00 PM PKT',
    'Sunday: Closed (Weekly Roaster Maintenance)',
    'Street 15, Saifabad No. 1, Faisalabad, Punjab, Pakistan',
    '+92 300 1234567',
    '923001234567',
    'info@auraroasters.com'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. CUSTOMER INQUIRIES & LIVE CHAT
CREATE TABLE IF NOT EXISTS public.customer_inquiries (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    contact TEXT,
    message TEXT NOT NULL,
    time TEXT,
    reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Inquiries
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Inquiries Policies
DROP POLICY IF EXISTS "Public can submit inquiries" ON public.customer_inquiries;
CREATE POLICY "Public can submit inquiries"
    ON public.customer_inquiries FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view and manage inquiries" ON public.customer_inquiries;
CREATE POLICY "Public can view and manage inquiries"
    ON public.customer_inquiries FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Seed initial inquiries
INSERT INTO public.customer_inquiries (id, customer_name, contact, message, time, reply)
VALUES 
(
    'inq-101',
    'Usman Tariq',
    '0300-9876543',
    'Do you have fresh Ethiopia Yirgacheffe whole beans in stock today? Looking for 500g pouch.',
    'Today, 06:15 PM PKT',
    'Yes Usman! We have freshly roasted batches from this morning. You can pick it up or we can deliver to you.'
),
(
    'inq-102',
    'Ayesha Bilal',
    'ayesha.b@gmail.com',
    'Can I reserve an outdoor table for 4 persons this evening around 8:00 PM?',
    'Today, 07:30 PM PKT',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. CUSTOMER REVIEWS & RATINGS
CREATE TABLE IF NOT EXISTS public.customer_reviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    coffee TEXT,
    quote TEXT NOT NULL,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Customer Reviews
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Customer Reviews Policies
DROP POLICY IF EXISTS "Public can view reviews" ON public.customer_reviews;
CREATE POLICY "Public can view reviews"
    ON public.customer_reviews FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can submit reviews" ON public.customer_reviews;
CREATE POLICY "Public can submit reviews"
    ON public.customer_reviews FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete reviews" ON public.customer_reviews;
CREATE POLICY "Public can delete reviews"
    ON public.customer_reviews FOR DELETE
    TO anon, authenticated
    USING (true);

-- Seed initial reviews
INSERT INTO public.customer_reviews (id, name, tag, rating, coffee, quote, date)
VALUES 
(
    'rev-1',
    'Zainab Khalid',
    'Regular Customer • Faisalabad',
    5,
    'Vanilla Latte',
    'The Vanilla Latte here is in a league of its own. Not overly sweet, beautifully textured milk, and the Madagascar vanilla complements the espresso without hiding the roast.',
    'Oct 24, 2026'
),
(
    'rev-2',
    'Hamza Malik',
    'Coffee Enthusiast',
    5,
    'Caramel Coffee',
    'The Caramel Coffee is absolute perfection. Beautiful layers, deep espresso, and the salted caramel drizzle is rich. Plus, ordering through WhatsApp is lightning quick!',
    'Oct 25, 2026'
),
(
    'rev-3',
    'Dr. Asad Raza',
    'Home Brewer',
    5,
    'Ethiopia Yirgacheffe Beans',
    'Finally a true third-wave roastery in Saifabad. Bought a bag of the Ethiopia Yirgacheffe for my V60 at home and it brews with unbelievable floral and peach notes.',
    'Oct 26, 2026'
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to public roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

