import { StorageProvider, StorageFile } from './types'
import { writeFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

export class LocalStorageProvider implements StorageProvider {
  name = 'Local Disk Storage'
  private baseDir: string
  private baseUrl: string

  constructor(baseDir = 'uploads', baseUrl = '/api/uploads') {
    this.baseDir = baseDir
    this.baseUrl = baseUrl
  }

  async upload(file: Buffer | Blob, filePath: string, contentType: string): Promise<StorageFile> {
    const fullPath = join(process.cwd(), this.baseDir, filePath)
    const dir = dirname(fullPath)
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    let buffer: Buffer
    if (file instanceof Blob) {
      buffer = Buffer.from(await file.arrayBuffer())
    } else {
      buffer = file
    }

    await writeFile(fullPath, buffer)

    return {
      path: filePath,
      url: `${this.baseUrl}/${filePath}`,
      size: buffer.length,
      contentType,
    }
  }

  async getUrl(path: string): Promise<string> {
    return `${this.baseUrl}/${path}`
  }

  async delete(path: string): Promise<void> {
    // Optional: implement file deletion
    console.log(`[Local] Would delete ${path}`)
  }
}
