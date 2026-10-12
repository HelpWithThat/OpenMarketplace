'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'loading' | 'worker' | 'buyer' | 'complete'>('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  // Worker profile fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')
  const [tools, setTools] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [travelRadius, setTravelRadius] = useState([25])

  // Buyer profile fields
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    async function loadUser() {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        if (data.user.isWorker && !data.user.isBuyer) {
          setStep('worker')
        } else if (data.user.isBuyer && !data.user.isWorker) {
          setStep('buyer')
        } else if (data.user.isWorker) {
          setStep('worker')
        }
      }
    }
    loadUser()
  }, [])

  const handleWorkerComplete = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/profile/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          tools: tools.split(',').map(s => s.trim()).filter(Boolean),
          publicCity: city,
          publicZip: zip,
          travelRadius: travelRadius[0],
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create profile')
      }

      if (user?.isBuyer) {
        setStep('buyer')
      } else {
        setStep('complete')
        setTimeout(() => router.push('/dashboard'), 1500)
      }
    } catch (err) {
      setError('Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const handleBuyerComplete = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/profile/buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName || user?.name,
          description,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create profile')
      }

      setStep('complete')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      setError('Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'complete') {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>Your profile is ready. Redirecting to dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (step === 'worker') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Worker Profile Setup</CardTitle>
            <CardDescription>Tell potential buyers about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to appear on jobs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell buyers about your experience and skills"
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma-separated) *</Label>
              <Input
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g., TV Mounting, Plumbing, Moving"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tools">Tools & Equipment</Label>
              <Input
                id="tools"
                value={tools}
                onChange={(e) => setTools(e.target.value)}
                placeholder="e.g., Ladder, Drill, Truck"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Your city"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip Code *</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="12345"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Travel Radius: {travelRadius[0]} miles</Label>
              <Slider
                value={travelRadius}
                onValueChange={(value) => setTravelRadius(Array.isArray(value) ? value : [value])}
                min={5}
                max={50}
                step={5}
              />
            </div>
            <Button
              onClick={handleWorkerComplete}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'buyer') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Buyer Profile Setup</CardTitle>
            <CardDescription>Set up your profile to start posting jobs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business or personal name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell workers about yourself"
                rows={4}
              />
            </div>
            <Button
              onClick={handleBuyerComplete}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
