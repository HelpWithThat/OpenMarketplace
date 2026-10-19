import { formatReliability } from '@/lib/reliability'

export function ReliabilityStat({
  completedJobs,
  acceptedJobs,
  className,
}: {
  completedJobs?: number | null
  acceptedJobs?: number | null
  className?: string
}) {
  const finished = completedJobs ?? 0
  const accepted = acceptedJobs ?? 0
  return (
    <p className={className ?? 'text-sm text-muted-foreground'}>
      {formatReliability({ completedJobs: finished, acceptedJobs: accepted })}
    </p>
  )
}
