-- ========================================================
-- SWIFT EXPRESS LOGISTICS - SUPABASE DATABASE SCHEMA
-- PostgreSQL Schema, RLS Policies, Safe Migrations & Triggers
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. USERS & PROFILES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'Customer' CHECK (role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager', 'Driver', 'Customer')),
    company_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 2. VEHICLES (FLEET) TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Cargo Van', 'Heavy Truck', 'Freight Plane', 'Delivery Motorcycle', 'Container Ship', 'Electric Van')),
    capacity_kg NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'In Transit', 'Maintenance', 'Decommissioned')),
    fuel_type VARCHAR(50) DEFAULT 'Diesel',
    last_maintenance DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 3. DRIVERS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_expiry DATE,
    assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'On Duty', 'Off Duty', 'On Leave')),
    current_location VARCHAR(255),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_deliveries INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 4. SHIPMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Sender Details
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    sender_email VARCHAR(255),
    sender_address TEXT NOT NULL,
    sender_city VARCHAR(100) NOT NULL,
    sender_country VARCHAR(100) NOT NULL,
    
    -- Receiver Details
    receiver_name VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(50) NOT NULL,
    receiver_email VARCHAR(255),
    receiver_address TEXT NOT NULL,
    receiver_city VARCHAR(100) NOT NULL,
    receiver_country VARCHAR(100) NOT NULL,
    
    -- Package Specs & Provider
    company_name VARCHAR(255) DEFAULT 'Swift Express Logistics',
    logistics_provider VARCHAR(100) DEFAULT 'Swift Express',
    package_type VARCHAR(100) NOT NULL DEFAULT 'Box',
    weight_kg NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
    quantity INT DEFAULT 1,
    dimensions VARCHAR(100) DEFAULT '20x20x20 cm',
    service_type VARCHAR(100) DEFAULT 'Express Delivery',
    declared_value NUMERIC(10, 2) DEFAULT 0.00,
    special_instructions TEXT,
    comment TEXT,
    
    -- Status & Routing
    status VARCHAR(50) DEFAULT 'In Transit',
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    current_location VARCHAR(255),
    current_lat NUMERIC(10, 6),
    current_lng NUMERIC(10, 6),
    dispatch_date DATE DEFAULT CURRENT_DATE,
    estimated_delivery DATE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    
    -- Assignment & Financials
    assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Paid' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SAFE COLUMN ALTERATIONS FOR EXISTING DATABASE TABLES
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT 'Swift Express Logistics';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS logistics_provider VARCHAR(100) DEFAULT 'Swift Express';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS dispatch_date DATE DEFAULT CURRENT_DATE;

-- --------------------------------------------------------
-- 5. TRACKING EVENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    updated_by VARCHAR(255) DEFAULT 'Admin',
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 6. QUOTES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    pickup_country VARCHAR(100) NOT NULL,
    pickup_address TEXT NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    destination_address TEXT NOT NULL,
    package_type VARCHAR(100) NOT NULL,
    weight_kg NUMERIC(8, 2) NOT NULL,
    length_cm NUMERIC(8, 2),
    width_cm NUMERIC(8, 2),
    height_cm NUMERIC(8, 2),
    delivery_type VARCHAR(100) NOT NULL,
    description TEXT,
    additional_notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Converted')),
    estimated_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 7. INVOICES & PAYMENTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid', 'Overdue', 'Cancelled')),
    due_date DATE NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    transaction_ref VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('Credit Card', 'Bank Transfer', 'PayPal', 'Cash on Delivery', 'Stripe')),
    payment_status VARCHAR(50) DEFAULT 'Completed' CHECK (payment_status IN ('Completed', 'Pending', 'Failed', 'Refunded')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 8. CONTACT MESSAGES & NOTIFICATIONS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read', 'Replied', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 9. WEBSITE CMS & DYNAMIC CONTENT
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(255) NOT NULL,
    author_title VARCHAR(255),
    company VARCHAR(255),
    avatar_url TEXT,
    content TEXT NOT NULL,
    rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    author VARCHAR(100) DEFAULT 'Swift Express Team',
    status VARCHAR(50) DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
    tags TEXT[],
    seo_title VARCHAR(255),
    seo_description TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.cms_content (
    id VARCHAR(100) PRIMARY KEY,
    section_name VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 10. REALTIME SUBSCRIPTION ENABLEMENT (IDEMPOTENT BLOCK)
-- --------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shipments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tracking_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- --------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Profiles: users can read their own profile; admins can read all profiles.
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Admins can manage profiles" ON public.profiles
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );

    -- Shipments: public read for customers/tracking; writes only by authenticated admins.
    DROP POLICY IF EXISTS "Public shipments read" ON public.shipments;
    DROP POLICY IF EXISTS "Allow authenticated admin writes shipments" ON public.shipments;
    DROP POLICY IF EXISTS "Allow authenticated admin updates shipments" ON public.shipments;
    CREATE POLICY "Public shipments read" ON public.shipments
      FOR SELECT USING (true);
    CREATE POLICY "Allow authenticated admin writes shipments" ON public.shipments
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );
    CREATE POLICY "Allow authenticated admin updates shipments" ON public.shipments
      FOR UPDATE USING (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      )
      WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );

    -- Tracking events: public read; writes only by authenticated admins.
    DROP POLICY IF EXISTS "Public tracking events read" ON public.tracking_events;
    DROP POLICY IF EXISTS "Allow authenticated admin writes tracking_events" ON public.tracking_events;
    DROP POLICY IF EXISTS "Allow authenticated admin updates tracking_events" ON public.tracking_events;
    CREATE POLICY "Public tracking events read" ON public.tracking_events
      FOR SELECT USING (true);
    CREATE POLICY "Allow authenticated admin writes tracking_events" ON public.tracking_events
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );
    CREATE POLICY "Allow authenticated admin updates tracking_events" ON public.tracking_events
      FOR UPDATE USING (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      )
      WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );

    -- Quotes: allow public insert/read for quote requests.
    DROP POLICY IF EXISTS "Public quotes insert" ON public.quotes;
    DROP POLICY IF EXISTS "Allow full access quotes" ON public.quotes;
    CREATE POLICY "Allow public quotes access" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

    -- Drivers & Vehicles: allow public read, admin write.
    DROP POLICY IF EXISTS "Allow full access drivers" ON public.drivers;
    CREATE POLICY "Allow public drivers read" ON public.drivers
      FOR SELECT USING (true);
    CREATE POLICY "Allow admin drivers write" ON public.drivers
      FOR ALL USING (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      )
      WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );

    DROP POLICY IF EXISTS "Allow full access vehicles" ON public.vehicles;
    CREATE POLICY "Allow public vehicles read" ON public.vehicles
      FOR SELECT USING (true);
    CREATE POLICY "Allow admin vehicles write" ON public.vehicles
      FOR ALL USING (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      )
      WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Super Admin', 'Admin', 'Dispatcher', 'Manager')
        )
      );
END $$;

-- --------------------------------------------------------
-- 12. AUTOMATIC TIMESTAMPS & TRACKING CODE TRIGGERS
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT := 'SEL';
    random_suffix TEXT;
    candidate TEXT;
BEGIN
    IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
        random_suffix := TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
        candidate := prefix || '-' || random_suffix;

        WHILE EXISTS (SELECT 1 FROM public.shipments WHERE tracking_number = candidate) LOOP
            random_suffix := TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
            candidate := prefix || '-' || random_suffix;
        END LOOP;

        NEW.tracking_number := candidate;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_tracking_number_trigger ON public.shipments;
CREATE TRIGGER generate_tracking_number_trigger
BEFORE INSERT ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION generate_tracking_number();

DROP TRIGGER IF EXISTS update_shipments_timestamp ON public.shipments;
CREATE TRIGGER update_shipments_timestamp BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- --------------------------------------------------------
-- 13. SEED INITIAL CMS CONTENT & SAMPLE SHIPMENTS
-- --------------------------------------------------------
INSERT INTO public.cms_content (id, section_name, content) VALUES
('hero', 'Homepage Hero', '{
    "tagline": "Fast, Reliable & Global Logistics Solutions",
    "headline": "Connecting Businesses & People Across the Globe",
    "subheadline": "Track shipments in real-time, get instant freight quotes, and experience world-class express courier services.",
    "cta_button_text": "Book Shipment",
    "quote_button_text": "Get a Free Quote"
}'),
('company_info', 'Company Details', '{
    "company_name": "Swift Express Logistics",
    "slogan": "Delivering Excellence at the Speed of Light",
    "phone": "+1 (775) 757-0577",
    "email": "support@swiftexpress.com",
    "address": "742 Logistics Boulevard, Suite 400, New York, NY 10001",
    "working_hours": "Mon - Sat: 8:00 AM - 9:00 PM EST"
}') ON CONFLICT (id) DO NOTHING;

-- Seed Sample Shipments
INSERT INTO public.shipments (
    tracking_number, sender_name, sender_phone, sender_email, sender_address, sender_city, sender_country,
    receiver_name, receiver_phone, receiver_email, receiver_address, receiver_city, receiver_country,
    company_name, logistics_provider, package_type, weight_kg, quantity, service_type, status,
    origin, destination, current_location, current_lat, current_lng, dispatch_date, estimated_delivery, comment, shipping_cost, payment_status
) VALUES
(
    'SEL-20260723-884920', 'John Harrison', '+1 202 555 0147', 'john@example.com', '1200 Pennsylvania Ave NW', 'Washington', 'United States',
    'Emma Watson', '+44 20 7946 0912', 'emma@example.co.uk', '221B Baker Street', 'London', 'United Kingdom',
    'Swift Express Logistics', 'DHL Express', 'Carton', 4.50, 1, 'Express Delivery', 'In Transit',
    'Washington, USA', 'London, UK', 'Sorting Center, Heathrow Airport, UK', 51.4700, -0.4543, '2026-07-23', '2026-07-25', 'Handle with extreme care. High priority fragile package.', 145.00, 'Paid'
),
(
    'SEL-20260723-339102', 'Global Tech Corp', '+1 415 555 0199', 'shipping@globaltech.io', '500 Howard Street', 'San Francisco', 'United States',
    'Tokyo Robotics Lab', '+81 3 5555 0143', 'import@tokyorobotics.jp', '1-1 Chiyoda', 'Tokyo', 'Japan',
    'Swift Express Logistics', 'FedEx Express', 'Box', 18.00, 2, 'Air Freight', 'Customs Clearance',
    'San Francisco, USA', 'Tokyo, Japan', 'Narita Customs Facility, Tokyo', 35.7720, 140.3929, '2026-07-22', '2026-07-26', 'Contains electronic testing equipment.', 320.00, 'Paid'
) ON CONFLICT (tracking_number) DO NOTHING;
