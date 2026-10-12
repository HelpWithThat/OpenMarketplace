import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function otherPartyName(
  participants: {
    userId: string
    user: {
      name: string
      workerProfile: { displayName: string | null } | null
      buyerProfile: { businessName: string | null } | null
    }
  }[],
  userId: string
) {
  const other = participants.find((p) => p.userId !== userId)?.user
  if (!other) return 'Unknown'
  return other.workerProfile?.displayName || other.buyerProfile?.businessName || other.name
}

function snippet(text: string | undefined, max = 120) {
  if (!text) return 'No messages yet'
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

export default async function MessagesIndexPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id

  const threads = await prisma.messageThread.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: {
      job: {
        select: { id: true, title: true },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              workerProfile: { select: { displayName: true } },
              buyerProfile: { select: { businessName: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        select: { text: true, sentAt: true, senderId: true },
      },
    },
  })

  const unreadEntries = await Promise.all(
    threads.map(async (thread) => {
      const me = thread.participants.find((p) => p.userId === userId)
      const unreadCount = await prisma.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          ...(me?.lastReadAt ? { sentAt: { gt: me.lastReadAt } } : {}),
        },
      })
      return [thread.id, unreadCount] as const
    })
  )
  const unreadByThread = Object.fromEntries(unreadEntries)

  const conversations = [...threads].sort((a, b) => {
    const aTime = a.messages[0]?.sentAt ?? a.updatedAt
    const bTime = b.messages[0]?.sentAt ?? b.updatedAt
    return bTime.getTime() - aTime.getTime()
  })

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Conversations about your jobs</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-base font-medium text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              When you and someone else start talking about a job, those threads will show up here.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {user.isWorker && (
                <Link href="/jobs">
                  <Button>Browse jobs</Button>
                </Link>
              )}
              {user.isBuyer && (
                <Link href="/post-job">
                  <Button variant={user.isWorker ? 'outline' : 'default'}>Post a job</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((thread) => {
            const last = thread.messages[0]
            const unreadCount = unreadByThread[thread.id] ?? 0
            const when = last?.sentAt ?? thread.updatedAt
            const party = otherPartyName(thread.participants, userId)

            return (
              <Link
                key={thread.id}
                href={`/messages/${thread.jobId}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-heading text-base font-bold">{party}</p>
                        {unreadCount > 0 && (
                          <Badge variant="default" className="h-5 shrink-0 px-1.5 text-xs">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-sm font-medium text-foreground">{thread.job.title}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{snippet(last?.text)}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(when, { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
