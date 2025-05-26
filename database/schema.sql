
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  coins DECIMAL(10,2) DEFAULT 0,
  chips DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tree upgrades table
CREATE TABLE tree_upgrades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tree_level INTEGER DEFAULT 1,
  last_claim TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (for conversions and casino activities)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'bet', 'win', 'conversion', 'chip_conversion', 'topup', 'withdrawal'
  game VARCHAR(50), -- casino game name if applicable
  amount DECIMAL(10,2), -- chips amount
  coins_amount DECIMAL(10,2), -- checkels amount for conversions
  chips_amount DECIMAL(10,2), -- chips amount for conversions
  description TEXT,
  php_amount DECIMAL(10,2), -- PHP equivalent for top-ups/withdrawals
  reference VARCHAR(255), -- payment reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Top-up requests table
CREATE TABLE topup_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'credit_card', 'debit_card', 'paymaya', 'gcash'
  reference VARCHAR(255) NOT NULL,
  notes TEXT,
  receipt_url TEXT, -- URL to stored receipt image
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  processed_by UUID REFERENCES users(id), -- admin who processed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Withdrawal requests table
CREATE TABLE withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  php_amount DECIMAL(10,2) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- for demo purposes, all completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX idx_topup_requests_status ON topup_requests(status);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tree_upgrades_updated_at BEFORE UPDATE ON tree_upgrades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password should be hashed in production)
INSERT INTO users (username, password_hash, is_admin, coins, chips) 
VALUES ('admin', 'admin_password_hash', TRUE, 1000, 1000);

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (except admins)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR is_admin = true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Tree upgrades policies
CREATE POLICY "Users can view own tree upgrades" ON tree_upgrades
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Top-up requests policies
CREATE POLICY "Users can view own topup requests" ON topup_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own topup requests" ON topup_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Withdrawal requests policies
CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
