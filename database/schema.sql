-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    coins DECIMAL(20,2) DEFAULT 10.00,
    chips DECIMAL(20,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tree_upgrades table
CREATE TABLE IF NOT EXISTS tree_upgrades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tree_level INTEGER DEFAULT 1,
    bonus_yield DECIMAL(10,2) DEFAULT 0.00,
    max_generation_duration INTEGER DEFAULT 1800, -- 30 minutes in seconds
    last_claim TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'bet', 'win', 'conversion', 'chip_conversion', 'topup', 'withdrawal'
    game VARCHAR(50),
    amount DECIMAL(20,2),
    coins_amount DECIMAL(20,2),
    chips_amount DECIMAL(20,2),
    description TEXT NOT NULL,
    php_amount DECIMAL(20,2),
    reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create topup_requests table
CREATE TABLE IF NOT EXISTS topup_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    amount DECIMAL(20,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    receipt_name VARCHAR(255),
    receipt_data TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,2) NOT NULL,
    php_amount DECIMAL(20,2) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_upgrades_user_id ON tree_upgrades(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tree_upgrades_updated_at ON tree_upgrades;
CREATE TRIGGER update_tree_upgrades_updated_at BEFORE UPDATE ON tree_upgrades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional - you can customize these policies)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tree_upgrades ENABLE ROW LEVEL SECURITY;

-- Insert a default admin user (password: admin123)
INSERT INTO users (username, password_hash, is_admin, is_banned, coins, chips) 
VALUES ('admin', 'admin123', true, false, 1000.00, 1000.00)
ON CONFLICT (username) DO UPDATE SET 
  password_hash = 'admin123',
  is_admin = true,
  is_banned = false;


===========================================================================
UPDATE users SET is_admin = true WHERE username = 'your_admin_username';