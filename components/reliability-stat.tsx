import { formatReliability } from '@/lib/reliability'

export const RELIABILITY_SCORE_LABEL = 'Reliability Score'

export function ReliabilityStat({
  completedJobs,
  acceptedJobs,
  className,
  showLabel = true,
}: {
  completedJobs?: number | null
  acceptedJobs?: number | null
  className?: string
  showLabel?: boolean
}) {
  const finished = completedJobs ?? 0
  const accepted = acceptedJobs ?? 0
  return (
    <div className={className}>
      {showLabel && <p className="font-medium">{RELIABILITY_SCORE_LABEL}</p>}
      <p className="text-sm text-muted-foreground">
        {formatReliability({ completedJobs: finished, acceptedJobs: accepted })}
      </p>
    </div>
  )
}
