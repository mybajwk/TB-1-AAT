-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. MASTER DATA (Replaces ENUMs)
-- ==========================================

CREATE TABLE report_visibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'public', 'private', 'anonymous'
    description TEXT
);

CREATE TABLE report_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'pending', 'in_progress', 'resolved', 'rejected'
    description TEXT,
    is_final BOOLEAN DEFAULT FALSE -- Flag to indicate if this status closes the ticket
);

CREATE TABLE notification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'report_update', 'system_alert', 'new_assignment'
    description TEXT
);

-- ==========================================
-- 2. USER MANAGEMENT & RBAC
-- ==========================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url TEXT,
    nik VARCHAR(20) UNIQUE, -- National ID for citizens
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Authorities Extension Table
CREATE TABLE authorities (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    jurisdiction_level VARCHAR(50), -- e.g., 'city', 'district', 'national'
    responsibilities TEXT
);

-- ==========================================
-- 3. REPORTING SYSTEM
-- ==========================================

CREATE TABLE report_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'Kriminalitas', 'Kebersihan'
    description TEXT,
    target_agency_type VARCHAR(100), -- Hint for auto-assignment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES report_categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location_latitude DECIMAL(9,6),
    location_longitude DECIMAL(9,6),
    address_text TEXT,
    
    -- Changed from ENUM to FK
    visibility_id UUID REFERENCES report_visibilities(id),
    status_id UUID REFERENCES report_statuses(id),
    
    assigned_authority_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media attached to reports
CREATE TABLE report_multimedia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50), -- 'image', 'video'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for report status changes
CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    changed_by_user_id UUID REFERENCES users(id),
    
    -- Changed from ENUM to FK
    previous_status_id UUID REFERENCES report_statuses(id),
    new_status_id UUID REFERENCES report_statuses(id),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. INTERACTION & SOCIAL
-- ==========================================

CREATE TABLE report_upvotes (
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. NOTIFICATIONS
-- ==========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    
    -- Changed from ENUM to FK
    type_id UUID REFERENCES notification_types(id),
    
    related_resource_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. DATA SEEDING
-- ==========================================

-- 6.1. Roles
INSERT INTO roles (name, description) VALUES 
('citizen', 'Regular user who can create reports'),
('authority', 'Government official handling reports'),
('admin', 'System administrator');

-- 6.2. Report Visibilities
INSERT INTO report_visibilities (name, description) VALUES 
('public', 'Visible to everyone'), 
('private', 'Visible to reporter and receiver'), 
('anonymous', 'Visible to receiver, reporter identity hidden');

-- 6.3. Report Statuses
INSERT INTO report_statuses (name, description, is_final) VALUES 
('pending', 'Report received, waiting for assignment', FALSE),
('in_progress', 'Authority is working on it', FALSE),
('resolved', 'Issue has been fixed', TRUE),
('rejected', 'Report cannot be processed', TRUE);

-- 6.4. Notification Types
INSERT INTO notification_types (name, description) VALUES 
('report_update', 'Status of report changed'), 
('system_alert', 'Platform wide announcement'), 
('new_assignment', 'Authority received new task');

-- 6.5. Report Categories
INSERT INTO report_categories (name, description, target_agency_type) VALUES 
('Kriminalitas', 'Theft, violence, suspicious activity', 'Police'),
('Kebersihan', 'Garbage piles, dirty streets', 'Sanitation'),
('Kesehatan', 'Disease outbreak, unsanitary food', 'Health'),
('Fasilitas Umum', 'Broken street lights, potholes, park damage', 'Public Works'),
('Lainnya', 'Other issues not listed above', 'General');

-- ==========================================
-- 7. ANALYTICS & DATA WAREHOUSE
-- ==========================================

-- Aggregated daily stats for dashboards
CREATE TABLE analytics_daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    category_id UUID REFERENCES report_categories(id),
    status_id UUID REFERENCES report_statuses(id),
    region VARCHAR(100), -- Simplified region/district name for filtering
    total_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_date, category_id, status_id, region) -- Prevent duplicates
);

-- Performance metrics for authorities
CREATE TABLE analytics_authority_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    authority_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month_start_date DATE NOT NULL, -- e.g., '2023-10-01'
    reports_assigned INTEGER DEFAULT 0,
    reports_resolved INTEGER DEFAULT 0,
    avg_resolution_time_hours DECIMAL(10, 2), -- Average time to resolve in hours
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(authority_user_id, month_start_date)
);



