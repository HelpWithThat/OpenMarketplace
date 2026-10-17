import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

export const HELP_WITH_THAT_BANNER_SRC = '/helpwiththat-banner.jpg'

export function BrandBanner({
  variant = 'hero',
  className,
}: {
  variant?: 'hero' | 'compact'
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-white',
        variant === 'hero' && 'w-full',
        variant === 'compact' && 'w-full max-w-md',
        className
      )}
    >
      {/* Static public asset; plain img keeps the wide lockup simple on mobile. */}
      <img
        src={HELP_WITH_THAT_BANNER_SRC}
        alt={`${config.app.name} — people getting help with tasks and jobs`}
        width={1584}
        height={672}
        className={cn(
          'h-auto w-full object-contain object-center',
          variant === 'compact' && 'max-h-24 sm:max-h-28'
        )}
      />
    </div>
  )
}
