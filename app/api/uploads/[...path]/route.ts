import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads')

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  if (!segments?.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resolved = path.resolve(UPLOAD_ROOT, ...segments)
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(UPLOAD_ROOT + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buf = await readFile(resolved)
  const ext = path.extname(resolved).toLowerCase()
  return new NextResponse(Uint8Array.from(buf), {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=0',
    },
  })
}
