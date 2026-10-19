export type ReliabilityCounts = {
  completedJobs: number
  acceptedJobs: number
  reliability: number
}

export function reliabilityFromCounts(completedJobs: number, acceptedJobs: number): number {
  if (acceptedJobs <= 0) return 0
  const ratio = completedJobs / acceptedJobs
  if (ratio < 0) return 0
  if (ratio > 1) return 1
  return Math.round(ratio * 100) / 100
}

export function afterJobAccepted(profile: ReliabilityCounts): ReliabilityCounts {
  const acceptedJobs = profile.acceptedJobs + 1
  return {
    completedJobs: profile.completedJobs,
    acceptedJobs,
    reliability: reliabilityFromCounts(profile.completedJobs, acceptedJobs),
  }
}

export function afterJobCompleted(profile: ReliabilityCounts): ReliabilityCounts {
  const completedJobs = profile.completedJobs + 1
  return {
    completedJobs,
    acceptedJobs: profile.acceptedJobs,
    reliability: reliabilityFromCounts(completedJobs, profile.acceptedJobs),
  }
}

export function formatReliability(profile: { completedJobs: number; acceptedJobs: number }): string {
  const { completedJobs, acceptedJobs } = profile
  if (acceptedJobs <= 0) return 'No accepted jobs yet'
  const pct = Math.round((completedJobs / acceptedJobs) * 100)
  return `Finished ${completedJobs} of ${acceptedJobs} accepted jobs (${pct}%)`
}
