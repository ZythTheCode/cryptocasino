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

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('This username is already taken. Please choose a different username.');
    }
    throw new Error('Unable to create your account right now. Please try again in a moment.');
  }
  return data
}

export const createDefaultAdmin = async () => {
  if (!supabase) {
    throw new Error('Database connection not available. Please check configuration.');
  }

  try {
    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .limit(1);

    if (checkError) throw checkError;

    if (existingAdmin && existingAdmin.length > 0) {
      return existingAdmin[0]; // Admin already exists
    }

    // Create default admin user
    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert([{
        username: 'admin',
        password_hash: 'admin123',
        is_admin: true,
        coins: 1000000,
        chips: 1000000,
        is_banned: false
      }])
      .select()
      .single();

    if (createError) throw createError;

    return newAdmin;
  } catch (error: any) {
    console.error('Create admin error:', error);
    throw new Error('Failed to create admin account');
  }
};

export const signIn = async (username: string, password: string) => {
  if (!supabase) {
    throw new Error('Unable to connect to the server. Please try again later.');
  }

  try {
    // Try to create default admin if it doesn't exist
    if (username === 'admin') {
      await createDefaultAdmin();
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      throw new Error('We couldn\'t find an account with that username. Please double-check your username or create a new account.');
    }

    const user = users[0];

    // Check if password matches (simple comparison for now)
    if (user.password_hash !== password) {
      throw new Error('The password you entered is incorrect. Please check your password and try again.');
    }

    if (user.is_banned) {
      throw new Error('Your account has been suspended. Please contact support for assistance.');
    }

    // Update last login time
    const { error: updateError } = await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.warn('Failed to update last login time:', updateError);
    }

    return user;
  } catch (error: any) {
    console.error('SignIn error:', error);
    throw new Error(error.message || 'Something went wrong during login. Please try again.');
  }
};

// Top-up and Withdrawal functions
export async function createTopupRequest(requestData: {
  user_id: string
  username: string
  amount: number
  payment_method: string
  reference_number: string
  receipt_data?: string | null
  notes?: string | null
  status: string
}) {
  const { data, error } = await supabase
    .from('topup_requests')
    .insert([requestData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createWithdrawalRequest(requestData: {
  user_id: string
  username: string
  amount: number
  payment_method: string
  account_details: string
  status: string
}) {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert([requestData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPendingTopupRequests() {
  const { data, error } = await supabase
    .from('topup_requests')
    .select('*, users(username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateTopupRequestStatus(requestId: string, status: string, processedBy: string) {
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

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }
  return data || []
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

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserInfo(userId: string, updates: Partial<User>) {
  // Prevent updating admin status through this function
  const { is_admin, ...safeUpdates } = updates;

  const { data, error } = await supabase
    .from('users')
    .update(safeUpdates)
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
  // First check if user is admin
  const { data: user, error: getUserError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (getUserError) throw getUserError

  if (user.is_admin) {
    throw new Error('Cannot ban admin users')
  }

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
  // First check if user is admin
  const { data: user, error: getUserError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (getUserError) throw getUserError

  if (user.is_admin) {
    throw new Error('Cannot delete admin users')
  }

  // Delete related data first
  await supabase.from('transactions').delete().eq('user_id', userId)
  await supabase.from('tree_upgrades').delete().eq('user_id', userId)
  await supabase.from('topup_requests').delete().eq('user_id', userId)
  await supabase.from('withdrawal_requests').delete().eq('user_id', userId)

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
    .order('created_at', { ascending: false })
    .limit(1)

  if (error && error.code !== 'PGRST116') throw error
  return data && data.length > 0 ? data[0] : null
}

export async function createTreeUpgrade(userId: string) {
  // First check if one already exists
  const existing = await getTreeUpgrade(userId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('tree_upgrades')
    .insert([{ 
      user_id: userId, 
      tree_level: 1, 
      last_claim: new Date().toISOString() 
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTreeUpgrade(userId: string, updates: Partial<any>) {
  // First ensure we have a tree upgrade record
  const existing = await getTreeUpgrade(userId)
  if (!existing) {
    return await createTreeUpgrade(userId)
  }

  // Filter out properties that don't exist in the database schema
  const safeUpdates = {
    tree_level: updates.tree_level,
    last_claim: updates.last_claim,
    updated_at: new Date().toISOString()
  }

  // Remove undefined values
  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key] === undefined) {
      delete safeUpdates[key]
    }
  })

  const { data, error } = await supabase
    .from('tree_upgrades')
    .update(safeUpdates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveTreeState(userId: string, currentCheckels: number, leaveTime: Date) {
  // Save to localStorage as fallback since database columns might not exist
  const treeState = {
    current_checkels: currentCheckels,
    last_leave_time: leaveTime.toISOString(),
    offline_generation_active: true
  }

  localStorage.setItem(`treeState_${userId}`, JSON.stringify(treeState))

  // Try to update database if possible, but don't fail if columns don't exist
  if (supabase) {
    try {
      await updateTreeUpgrade(userId, {
        last_claim: leaveTime.toISOString()
      })
    } catch (error) {
      // Silently handle database column errors
      if (error?.code !== 'PGRST204') {
        console.log('Could not update tree upgrade in database, using localStorage only')
      }
    }
  }
}

export async function clearOfflineGeneration(userId: string) {
  // Clear from localStorage
  localStorage.removeItem(`treeState_${userId}`)

  // Try to update database if possible
  if (supabase) {
    try {
      await updateTreeUpgrade(userId, {
        last_claim: new Date().toISOString()
      })
    } catch (error) {
      // Silently handle database column errors
      if (error?.code !== 'PGRST204') {
        console.log('Could not clear offline generation in database')
      }
    }
  }
}

// Transaction functions
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
  try {
    console.log('Adding transaction:', transaction);

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: transaction.user_id,
        type: transaction.type,
        game: transaction.game || null,
        amount: transaction.amount || null,
        coins_amount: transaction.coins_amount || null,
        chips_amount: transaction.chips_amount || null,
        description: transaction.description,
        php_amount: transaction.php_amount || null,
        reference: transaction.reference || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }

    console.log('Transaction added successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to add transaction:', error);
    throw error;
  }
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

  if (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
  return data || []
}



// Withdrawal functions

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

export interface User {
  id: string
  username: string
  password_hash: string
  is_admin: boolean
  is_banned: boolean
  coins: number
  chips: number
  created_at: string
  updated_at: string
}