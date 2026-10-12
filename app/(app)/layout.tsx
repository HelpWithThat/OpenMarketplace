'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="flex min-h-screen flex-col">
      <header className="chrome-bar sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-primary-foreground">
              {config.app.name}
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href="/dashboard"
                className={cn(
                  'text-sm text-primary-foreground/85 hover:text-primary-foreground',
                  isActive('/dashboard') && 'font-bold text-primary-foreground underline decoration-2 underline-offset-4'
                )}
              >
                Dashboard
              </Link>
              {user?.isWorker && (
                <Link
                  href="/jobs"
                  className={cn(
                    'text-sm text-primary-foreground/85 hover:text-primary-foreground',
                    isActive('/jobs') && 'font-bold text-primary-foreground underline decoration-2 underline-offset-4'
                  )}
                >
                  Find Work
                </Link>
              )}
              {user?.isBuyer && (
                <Link
                  href="/post-job"
                  className={cn(
                    'text-sm text-primary-foreground/85 hover:text-primary-foreground',
                    isActive('/post-job') && 'font-bold text-primary-foreground underline decoration-2 underline-offset-4'
                  )}
                >
                  Post Job
                </Link>
              )}
              <Link
                href="/messages"
                className={cn(
                  'text-sm text-primary-foreground/85 hover:text-primary-foreground',
                  pathname?.startsWith('/messages') && 'font-bold text-primary-foreground underline decoration-2 underline-offset-4'
                )}
              >
                Messages
              </Link>
            </nav>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
              >
                {user?.name || 'Account'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                Profile
              </DropdownMenuItem>
              {user?.isWorker && (
                <DropdownMenuItem onClick={() => router.push('/smart-match')}>
                  SmartMatch
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <nav className="chrome-bar fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="flex justify-around gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className={cn('flex-1', isActive('/dashboard') ? 'chrome-tab-active' : 'chrome-tab')}
          >
            Dashboard
          </Button>
          {user?.isWorker && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/jobs')}
              className={cn('flex-1', isActive('/jobs') ? 'chrome-tab-active' : 'chrome-tab')}
            >
              Find Work
            </Button>
          )}
          {user?.isBuyer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/post-job')}
              className={cn('flex-1', isActive('/post-job') ? 'chrome-tab-active' : 'chrome-tab')}
            >
              Post
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/messages')}
            className={cn(
              'flex-1',
              pathname?.startsWith('/messages') ? 'chrome-tab-active' : 'chrome-tab'
            )}
          >
            Messages
          </Button>
        </div>
      </nav>
    </div>
  )
}
