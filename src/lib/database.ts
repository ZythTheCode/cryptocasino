import { supabase } from './supabase'
import type { User, Transaction, TopupRequest, WithdrawalRequest, TreeUpgrade } from './supabase'

// Auth functions
export async function signUp(username: string, passwordHash: string) {
  // In a real app, you'd use Supabase Auth, but for this demo we'll use custom auth
  const { data, error } = await supabase
    .from('users')
    .insert([
      { 
        username, 
        password_hash: passwordHash, // In production, hash this!
        coins: 0, // Start with 0 ₵ Checkels
        chips: 0,
        is_admin: false,
        is_banned: false
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
  // Map to actual database column names
  const dbRequestData = {
    user_id: requestData.user_id,
    amount: requestData.amount,
    payment_method: requestData.payment_method,
    reference: requestData.reference_number, // Use 'reference' instead of 'reference_number'
    receipt: requestData.receipt_data, // Use 'receipt' instead of 'receipt_data'
    notes: requestData.notes,
    status: requestData.status
  };
  
  const { data, error } = await supabase
    .from('topup_requests')
    .insert([dbRequestData])
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
  account_name?: string
  status?: string
}) {
  // Map to actual database column names
  const dbRequestData = {
    user_id: requestData.user_id,
    amount: requestData.amount,
    payment_method: requestData.payment_method,
    account_details: requestData.account_details,
    account_name: requestData.account_name || requestData.username || null, // Ensure fallback to null if no username
    status: requestData.status || 'pending',
    php_amount: requestData.amount * 10 // Calculate PHP amount (1 chip = 10 PHP)
  };
  
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert([dbRequestData])
    .select()
    .single()

  if (error) {
    console.error('Withdrawal request error:', error);
    throw error;
  }
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
  // First check for duplicates and clean them up
  const { data: allRecords, error: getAllError } = await supabase
    .from('tree_upgrades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (getAllError && getAllError.code !== 'PGRST116') throw getAllError

  if (allRecords && allRecords.length > 1) {
    // Keep the most recent record and delete the rest
    const keepRecord = allRecords[0]
    const deleteIds = allRecords.slice(1).map(record => record.id)
    
    if (deleteIds.length > 0) {
      await supabase
        .from('tree_upgrades')
        .delete()
        .in('id', deleteIds)
    }
    
    return keepRecord
  }

  return allRecords && allRecords.length > 0 ? allRecords[0] : null
}

export async function createTreeUpgrade(userId: string) {
  // First check if one already exists and clean up duplicates
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

  if (error) {
    // If insertion failed due to duplicate, try to get existing record
    if (error.code === '23505') {
      // Wait a moment for any concurrent operations to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      return await getTreeUpgrade(userId)
    }
    throw error
  }
  return data
}

export async function updateTreeUpgrade(userId: string, updates: Partial<any>) {
  try {
    // First ensure we have a tree upgrade record and clean up duplicates
    const existing = await getTreeUpgrade(userId)
    if (!existing) {
      return await createTreeUpgrade(userId)
    }

    // Prepare the update object with only valid database fields
    const safeUpdates: any = {
      updated_at: new Date().toISOString()
    }
    
    if (updates.tree_level !== undefined && typeof updates.tree_level === 'number') {
      safeUpdates.tree_level = Math.max(1, Math.floor(updates.tree_level))
    }
    
    if (updates.last_claim !== undefined) {
      // Ensure we have a valid date string
      const claimDate = typeof updates.last_claim === 'string' 
        ? updates.last_claim 
        : new Date(updates.last_claim).toISOString()
      safeUpdates.last_claim = claimDate
    }

    // Only proceed if we have meaningful updates beyond timestamp
    const hasRealUpdates = Object.keys(safeUpdates).some(key => key !== 'updated_at')
    if (!hasRealUpdates) {
      return existing
    }

    // Update by ID to ensure we only update one specific record
    const { data, error } = await supabase
      .from('tree_upgrades')
      .update(safeUpdates)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Tree upgrade update error:', error)
      // If it's a column doesn't exist error, return existing data
      if (error.message?.includes('column') || error.code === '42703') {
        console.log('Database schema mismatch, using existing data')
        return existing
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update tree upgrade:', error)
    // Always try to return existing data as fallback
    try {
      const existing = await getTreeUpgrade(userId)
      return existing || { 
        id: `fallback-${userId}`,
        user_id: userId, 
        tree_level: 1, 
        last_claim: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      return { 
        id: `fallback-${userId}`,
        user_id: userId, 
        tree_level: 1, 
        last_claim: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }
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
      // Silently handle database errors - localStorage will be used instead
      console.log('Could not update tree upgrade in database, using localStorage only')
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
      // Silently handle database errors
      console.log('Could not clear offline generation in database')
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