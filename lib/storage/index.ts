import { StorageProvider } from './types'
import { LocalStorageProvider } from './local-provider'
import { SupabaseStorageProvider } from './supabase-provider'

export * from './types'

export function getStorageProvider(): StorageProvider {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY
  
  if (supabaseUrl && supabaseKey) {
    console.log('Using Supabase Storage')
    return new SupabaseStorageProvider(
      supabaseUrl,
      supabaseKey,
      process.env.SUPABASE_BUCKET || 'marketplace-files'
    )
  }
  
  console.log('Using Local Disk Storage')
  return new LocalStorageProvider()
}
