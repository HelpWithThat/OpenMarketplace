export interface StorageProvider {
  name: string
  upload(file: Buffer | Blob, path: string, contentType: string): Promise<StorageFile>
  getUrl(path: string): Promise<string>
  delete(path: string): Promise<void>
}

export interface StorageFile {
  path: string
  url: string
  size: number
  contentType: string
}
