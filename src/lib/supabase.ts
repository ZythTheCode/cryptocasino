import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });

  // Don't throw immediately, let the app load but show clear error messages
  console.warn('🚨 Supabase will not work without proper environment variables!');
  console.warn('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Secrets in Replit');
}

// Create client even if env vars are missing (will fail gracefully)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface User {
  id: string
  username: string
  password_hash: string
  is_admin: boolean
  coins: number
  chips: number
  created_at: string
  updated_at: string
  is_banned?: boolean
}

export interface TreeUpgrade {
  id: string
  user_id: string
  tree_level: number
  last_claim: string
  current_checkels?: number
  last_leave_time?: string
  offline_generation_active?: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'bet' | 'win' | 'conversion' | 'chip_conversion' | 'topup' | 'withdrawal'
  game?: string
  amount?: number
  coins_amount?: number
  chips_amount?: number
  description: string
  php_amount?: number
  reference?: string
  created_at: string
}

export interface TopupRequest {
  id: string
  user_id: string
  username: string
  amount: number
  payment_method: 'credit_card' | 'debit_card' | 'paymaya' | 'gcash'
  reference: string
  reference_number: string
  notes?: string
  receipt_url?: string
  receipt_data?: string
  receipt_name?: string
  status: 'pending' | 'approved' | 'rejected'
  processed_by?: string
  created_at: string
  processed_at?: string
}

export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  php_amount: number
  account_name: string
  account_number: string
  bank_name: string
  status: string
  created_at: string
}