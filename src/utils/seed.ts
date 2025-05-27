
import { supabase } from '@/lib/supabase'

export async function seedDatabase() {
  try {
    // Check if users already exist
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      console.log('Database already seeded')
      return
    }

    // Create test users
    const users = [
      {
        username: 'user',
        password: 'password123',
        chips: 1000,
        coins: 500,
        is_admin: false
      },
      {
        username: 'admin',
        password: 'admin123',
        chips: 10000,
        coins: 5000,
        is_admin: true
      }
    ]

    for (const user of users) {
      const { error } = await supabase
        .from('users')
        .insert([user])

      if (error) {
        console.error('Error seeding user:', error)
      } else {
        console.log(`Created user: ${user.username}`)
      }
    }

    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}
