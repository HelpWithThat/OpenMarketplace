import type { ReactNode } from 'react'
import Link from 'next/link'
import { config } from '@/lib/config'

export function ChromeHeader({
  right,
}: {
  right?: ReactNode
}) {
  return (
    <header className="chrome-bar">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-primary-foreground">
          {config.app.name}
        </Link>
        {right}
      </div>
    </header>
  )
}
