import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import { getStorageProvider } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const userId = user.id
    const timestamp = Date.now()
    const filename = `${userId}/${timestamp}-${file.name}`
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const storage = getStorageProvider()
    
    const result = await storage.upload(buffer, filename, file.type)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
