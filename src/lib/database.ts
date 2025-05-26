
import { supabase } from './supabase'
import type { User, Transaction, TopupRequest, WithdrawalRequest, TreeUpgrade } from './supabase'

// Auth functions
export async function signUp(username: string, password: string) {
  // In a real app, you'd use Supabase Auth, but for this demo we'll use custom auth
  const { data, error } = await supabase
    .from('users')
    .insert([
      { 
        username, 
        password_hash: password, // In production, hash this!
        coins: 10,
        chips: 0 
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function signIn(username: string, password: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', password) // In production, verify hashed password
    .single()

  if (error) throw error
  return data
}

// User functions
export async function updateUserBalance(userId: string, updates: Partial<Pick<User, 'coins' | 'chips'>>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Tree upgrade functions
export async function getTreeUpgrade(userId: string) {
  const { data, error } = await supabase
    .from('tree_upgrades')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createTreeUpgrade(userId: string) {
  const { data, error } = await supabase
    .from('tree_upgrades')
    .insert([{ user_id: userId }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTreeUpgrade(userId: string, updates: Partial<TreeUpgrade>) {
  const { data, error } = await supabase
    .from('tree_upgrades')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Transaction functions
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserTransactions(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getAllTransactions(limit = 100) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      users!inner(username)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Top-up functions
export async function createTopupRequest(request: Omit<TopupRequest, 'id' | 'created_at' | 'status'>) {
  const { data, error } = await supabase
    .from('topup_requests')
    .insert([request])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPendingTopupRequests() {
  const { data, error } = await supabase
    .from('topup_requests')
    .select(`
      *,
      users!inner(username)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateTopupRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected', 
  processedBy: string
) {
  const { data, error } = await supabase
    .from('topup_requests')
    .update({ 
      status, 
      processed_by: processedBy, 
      processed_at: new Date().toISOString() 
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Withdrawal functions
export async function createWithdrawalRequest(request: Omit<WithdrawalRequest, 'id' | 'created_at' | 'status'>) {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert([{ ...request, status: 'completed' }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserWithdrawals(userId: string) {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Storage functions for receipts
export async function uploadReceipt(file: File, topupId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${topupId}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)

  if (error) throw error
  
  const { data: publicUrlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}
