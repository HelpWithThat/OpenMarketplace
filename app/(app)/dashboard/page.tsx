import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandBanner } from '@/components/brand-banner'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id
  if (user.isWorker && !user.workerProfile) {
    redirect('/onboarding')
  }

  if (user.isBuyer && !user.buyerProfile) {
    redirect('/onboarding')
  }

  const stats = {
    activeJobs: user.isWorker
      ? await prisma.assignment.count({
          where: {
            workerId: userId,
            status: { in: ['UPCOMING', 'IN_PROGRESS'] },
          },
        })
      : await prisma.job.count({
          where: {
            buyerId: userId,
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          },
        }),
    completedJobs: user.isWorker
      ? await prisma.assignment.count({
          where: {
            workerId: userId,
            status: { in: ['APPROVED', 'PAID'] },
          },
        })
      : await prisma.job.count({
          where: {
            buyerId: userId,
            status: { in: ['APPROVED', 'PAID'] },
          },
        }),
    averageRating: user.isWorker
      ? user.workerProfile?.averageRating || 0
      : user.buyerProfile?.averageRating || 0,
  }

  const recentJobs = user.isWorker
    ? await prisma.assignment.findMany({
        where: { workerId: userId },
        include: {
          job: {
            include: {
              buyer: {
                include: { buyerProfile: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    : await prisma.job.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-4">
        <BrandBanner variant="compact" />
        <div>
          <h1 className="mb-2 text-3xl font-bold">
            Welcome back to {config.app.name}, {user.name}!
          </h1>
          <p className="text-muted-foreground">
            {user.isWorker && user.isBuyer
              ? 'Get help with tasks, or help someone else get a job done.'
              : user.isWorker
              ? 'Find jobs and help people with the tasks they need done.'
              : 'Post a job and get help with the tasks on your list.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} ⭐` : 'No ratings yet'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {user.isWorker && (
            <>
              <Link href="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
              <Link href="/smart-match">
                <Button variant="outline">Set Up SmartMatch</Button>
              </Link>
            </>
          )}
          {user.isBuyer && (
            <>
              <Link href="/post-job">
                <Button>Post a Job</Button>
              </Link>
              <Link href="/my-jobs">
                <Button variant="outline">My Posted Jobs</Button>
              </Link>
            </>
          )}
          <Link href="/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your recent {user.isWorker ? 'assignments' : 'jobs'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((item: any) => {
                const job = 'job' in item ? item.job : item
                return (
                  <div key={item.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                    <div>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-bold hover:text-primary hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {job.city} •{' '}
                        <span className="font-bold text-foreground">
                          ${job.fixedPrice || `${job.hourlyRate}/hr`}
                        </span>
                      </p>
                    </div>
                    <Badge>{job.status || item.status}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
