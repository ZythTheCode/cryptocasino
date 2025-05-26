import { supabase } from '../lib/supabase'

export async function runMigrations() {
  try {
    console.log('Starting database migration...')

    // Check if users table exists by trying to query it
    const { data: users, error: tablesError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (tablesError) {
      // If error is "relation does not exist", schema needs to be created
      if (tablesError.code === '42P01') {
        console.log('Users table not found - schema needs to be created')
        return false
      }
      console.error('Error checking tables:', tablesError)
      return false
    }

    console.log('Database schema verified')
    return true
  } catch (error) {
    console.error('Migration error:', error)
    return false
  }
}

// Helper function to migrate from localStorage to Supabase
export async function migrateLocalStorageToSupabase() {
  try {
    console.log('Migrating localStorage data to Supabase...')

    // Get all users from localStorage
    const allUsers = JSON.parse(localStorage.getItem('casinoUsers') || '{}')
    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}')

    if (Object.keys(allUsers).length === 0 && !currentUser.username) {
      console.log('No users to migrate')
      return
    }

    // Add current user to allUsers if not already there
    if (currentUser.username && !allUsers[currentUser.username]) {
      allUsers[currentUser.username] = currentUser
    }

    console.log(`Migrating ${Object.keys(allUsers).length} users...`)

    // Migrate all users
    const usersMigrationData = Object.entries(allUsers).map(([username, userData]: [string, any]) => ({
      username,
      password_hash: 'migrated_user', // Users will need to reset passwords
      is_admin: userData.isAdmin || false,
      coins: userData.coins || 0,
      chips: userData.chips || 0
    }))

    const { data: migratedUsers, error: usersError } = await supabase
      .from('users')
      .upsert(usersMigrationData, { onConflict: 'username' })
      .select('id, username')

    if (usersError) throw usersError

    console.log('Users migrated successfully')

    // Create user mapping for transactions
    const userMapping: { [username: string]: string } = {}
    migratedUsers?.forEach(user => {
      userMapping[user.username] = user.id
    })

    // Migrate tree upgrades and transactions for each user
    for (const [username, userData] of Object.entries(allUsers)) {
      const userId = userMapping[username]
      if (!userId) continue

      // Migrate tree upgrades
      if ((userData as any).upgrades) {
        const upgrades = (userData as any).upgrades
        await supabase.from('tree_upgrades').upsert([{
          user_id: userId,
          tree_level: upgrades.treeLevel || 1,
          last_claim: upgrades.lastClaim || new Date().toISOString()
        }], { onConflict: 'user_id' })
      }

      // Migrate transactions
      const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`) || '[]')
      const casinoTransactions = JSON.parse(localStorage.getItem(`casino_transactions_${username}`) || '[]')

      const allTransactions = [...transactions, ...casinoTransactions]
        .filter(tx => tx && tx.timestamp) // Filter out invalid transactions
        .map(tx => ({
          user_id: userId,
          type: tx.type || 'unknown',
          game: tx.game || null,
          amount: tx.amount || 0,
          coins_amount: tx.coinsAmount || null,
          chips_amount: tx.chipsAmount || null,
          description: tx.description || tx.type || 'Migrated transaction',
          php_amount: tx.phpAmount || null,
          reference: tx.reference || null,
          created_at: tx.timestamp
        }))

      if (allTransactions.length > 0) {
        const { error: txError } = await supabase.from('transactions').insert(allTransactions)
        if (txError) {
          console.error(`Error migrating transactions for ${username}:`, txError)
        } else {
          console.log(`Migrated ${allTransactions.length} transactions for ${username}`)
        }
      }
    }

    // Migrate pending top-ups
    const pendingTopUps = JSON.parse(localStorage.getItem('pendingTopUps') || '[]')
    if (pendingTopUps.length > 0) {
      const topupRequests = pendingTopUps
        .filter((topup: any) => userMapping[topup.username])
        .map((topup: any) => ({
          user_id: userMapping[topup.username],
          amount: topup.amount,
          payment_method: topup.paymentMethod,
          reference: topup.reference,
          notes: topup.notes,
          status: 'pending',
          created_at: topup.timestamp
        }))

      if (topupRequests.length > 0) {
        const { error: topupError } = await supabase.from('topup_requests').insert(topupRequests)
        if (topupError) {
          console.error('Error migrating top-up requests:', topupError)
        } else {
          console.log(`Migrated ${topupRequests.length} pending top-up requests`)
        }
      }
    }

    console.log('Migration completed successfully')

    // Optionally clear localStorage after successful migration
    // You might want to keep it as backup initially
    console.log('Migration complete. LocalStorage data kept as backup.')

  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}