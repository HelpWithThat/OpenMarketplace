import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { feesForJob } from '@/lib/fee-privacy'
import { FeeCallout } from '@/components/fee-callout'

export default async function JobsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: 'OPEN',
    },
    include: {
      buyer: {
        include: { buyerProfile: true },
      },
      _count: {
        select: { offers: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Find Work</h1>
        <p className="text-muted-foreground">Browse available jobs and submit requests</p>
      </div>

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No jobs available right now. Check back later!</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => {
            const fees = feesForJob(job, 'worker')
            const payDisplay = job.fixedPrice
              ? `$${job.fixedPrice.toFixed(2)} labor`
              : `$${job.hourlyRate?.toFixed(2)}/hr • up to ${job.maxHours} hrs`

            return (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/jobs/${job.id}`}>
                        <CardTitle className="hover:text-primary hover:underline">{job.title}</CardTitle>
                      </Link>
                      <CardDescription>
                        {job.buyer.buyerProfile?.businessName || job.buyer.name} •{' '}
                        {job.city || 'Remote'} • Posted {new Date(job.publishedAt!).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge>{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{job.description.slice(0, 200)}...</p>
                  <div className="flex flex-wrap gap-2">
                    {job.categories.map((cat) => (
                      <Badge key={cat} variant="outline">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{payDisplay}</p>
                      {fees.role === 'worker' && <FeeCallout fees={fees} className="text-xs" />}
                      {job._count.offers > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {job._count.offers} request{job._count.offers !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button>View Job</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
