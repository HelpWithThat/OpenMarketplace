import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { config } from '@/lib/config'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="chrome-bar">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-primary-foreground">{config.app.name}</h1>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary-hover text-primary-foreground hover:bg-primary-hover">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h2 className="mb-4 text-4xl font-bold sm:text-5xl md:text-6xl">
          An open marketplace<br />for any kind of work
        </h2>
        <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Post a job, task, or gig. Get qualified workers. Money held safely until work is approved.
          Fair fees, flexible tasks, two-way trust.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/signup?role=buyer">
            <Button size="lg" className="w-full sm:w-auto">
              Post a job
            </Button>
          </Link>
          <Link href="/signup?role=worker">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Find work
            </Button>
          </Link>
        </div>
        
        <div className="mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xl font-semibold">Open to any work</h3>
            <p className="text-muted-foreground">
              Not limited to one trade. Mount a TV, count inventory, design a logo, or anything else.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xl font-semibold">Simple fees</h3>
            <p className="text-muted-foreground">
              One clear fee: 20% of labor, split fairly. Expenses passed through at cost with no fee.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xl font-semibold">Two-way trust</h3>
            <p className="text-muted-foreground">
              Workers rate buyers and buyers rate workers. Both sides see scores.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-6">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 {config.app.name}. Open, fair, and transparent.</p>
        </div>
      </footer>
    </div>
  )
}
