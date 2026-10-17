import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

export const HELP_WITH_THAT_BANNER_SRC = '/helpwiththat-banner.jpg'

/** Sign-in page only. Other pages use HelpWithThat as text. */
export function BrandBanner({ className }: { className?: string }) {
  return (
    <div className={cn('w-full overflow-hidden rounded-xl bg-white', className)}>
      <img
        src={HELP_WITH_THAT_BANNER_SRC}
        alt={`${config.app.name} — people getting help with tasks and jobs`}
        width={1584}
        height={672}
        className="h-auto w-full object-contain object-center"
      />
    </div>
  )
}
