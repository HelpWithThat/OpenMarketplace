import { ChromeHeader } from '@/components/chrome-header'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ChromeHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
