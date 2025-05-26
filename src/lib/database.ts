
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
  console.log('Attempting to sign in user:', username);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', password) // In production, verify hashed password
    .single() // This ensures we get a single object, not an array

  if (error) {
    console.error('Sign in error:', error);
    if (error.code === 'PGRST116') {
      // No rows returned - user doesn't exist or wrong password
      throw new Error('Invalid username or password')
    }
    throw error
  }

  console.log('Sign in successful for user:', data.username, 'Admin:', data.is_admin);
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

export async function makeUserAdmin(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Admin functions for user management
export async function addUserBalance(userId: string, coinsToAdd: number, chipsToAdd: number) {
  // First get current balance
  const { data: currentUser, error: getUserError } = await supabase
    .from('users')
    .select('coins, chips')
    .eq('id', userId)
    .single()

  if (getUserError) throw getUserError

  // Update with new balance
  const { data, error } = await supabase
    .from('users')
    .update({ 
      coins: (currentUser.coins || 0) + coinsToAdd,
      chips: (currentUser.chips || 0) + chipsToAdd
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error

  // Add transaction record for admin action
  try {
    await addTransaction({
      user_id: userId,
      type: 'topup',
      coins_amount: coinsToAdd,
      chips_amount: chipsToAdd,
      description: `Admin balance adjustment: +${coinsToAdd} checkels, +${chipsToAdd} chips`
    });
  } catch (transactionError) {
    console.error('Failed to record admin transaction:', transactionError);
  }

  return data
}

export async function banUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: true })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function unbanUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_banned: false })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw error
  return true
}

export async function resetUserBalance(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ coins: 0, chips: 0 })
    .eq('id', userId)
    .select()
    .single()

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
      users!transactions_user_id_fkey(username)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Top-up functions
export async function createTopupRequest(request: any) {
  try {
    const { data, error } = await supabase
      .from('topup_requests')
      .insert([{
        user_id: request.user_id,
        username: request.username,
        amount: request.amount,
        payment_method: request.payment_method,
        reference_number: request.reference_number,
        notes: request.notes,
        receipt_name: request.receipt_name,
        receipt_data: request.receipt_data,
        status: request.status || 'pending'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating topup request:', error)
    return false
  }
}

export async function getPendingTopupRequests() {
  const { data, error } = await supabase
    .from('topup_requests')
    .select(`
      *,
      users!topup_requests_user_id_fkey(username)
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
