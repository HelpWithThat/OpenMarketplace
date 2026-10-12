import { StorageProvider, StorageFile } from './types'
import { createClient } from '@supabase/supabase-js'

export class SupabaseStorageProvider implements StorageProvider {
  name = 'Supabase Storage'
  private client: any
  private bucket: string

  constructor(url: string, key: string, bucket = 'marketplace-files') {
    this.client = createClient(url, key)
    this.bucket = bucket
  }

  async upload(file: Buffer | Blob, path: string, contentType: string): Promise<StorageFile> {
    let data: Blob
    let size: number
    if (file instanceof Blob) {
      data = file
      size = file.size
    } else {
      data = new Blob([new Uint8Array(file)], { type: contentType })
      size = file.length
    }

    const { data: uploadData, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, data, {
        contentType,
        upsert: false,
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    const { data: urlData } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(path)

    return {
      path,
      url: urlData.publicUrl,
      size,
      contentType,
    }
  }

  async getUrl(path: string): Promise<string> {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(path)
    return data.publicUrl
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path])
    
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`)
    }
  }
}
