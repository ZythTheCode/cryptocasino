
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
}

export interface TreeUpgrade {
  id: string
  user_id: string
  tree_level: number
  last_claim: string
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
  amount: number
  payment_method: 'credit_card' | 'debit_card' | 'paymaya' | 'gcash'
  reference: string
  notes?: string
  receipt_url?: string
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
