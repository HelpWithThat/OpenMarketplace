import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { findMatchingJobs } from '@/lib/smartmatch'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { feesForJob } from '@/lib/fee-privacy'
import { FeeCallout } from '@/components/fee-callout'

export default async function ForYouPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id
  const matches = await findMatchingJobs(userId)

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">For You</h1>
        <p className="text-muted-foreground">
          Jobs matching your SmartMatch criteria
        </p>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              No matches found. Set up your SmartMatch criteria to get personalized job recommendations!
            </p>
            <Link href="/smart-match">
              <Button>Set Up SmartMatch</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((job: any) => {
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
                        {job.city || 'Remote'}
                      </CardDescription>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {job.matchReason}
                      </p>
                    </div>
                    <Badge>{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{job.description.slice(0, 200)}...</p>
                  <div className="flex flex-wrap gap-2">
                    {job.categories.map((cat: string) => (
                      <Badge key={cat} variant="outline">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{payDisplay}</p>
                      {fees.role === 'worker' && <FeeCallout fees={fees} className="text-xs" />}
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button>View Job</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
