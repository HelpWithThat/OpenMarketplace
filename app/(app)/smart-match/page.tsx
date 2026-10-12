'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'

export default function SmartMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [workerProfile, setWorkerProfile] = useState<any>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const [minPay, setMinPay] = useState('')
  const [maxTravelMiles, setMaxTravelMiles] = useState([25])
  const [onlyVerified, setOnlyVerified] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (!data.user?.isWorker) {
        router.push('/dashboard')
        return
      }

      if (data.user.workerProfile) {
        setWorkerProfile(data.user.workerProfile)
        setCategories(data.user.workerProfile.smartMatchCategories || [])
        setMinPay(data.user.workerProfile.smartMatchMinPay?.toString() || '')
        setMaxTravelMiles([data.user.workerProfile.smartMatchMaxTravel || 25])
        setOnlyVerified(data.user.workerProfile.smartMatchOnlyVerified || false)
      }
    } catch (err) {
      setError('Failed to load SmartMatch settings')
    } finally {
      setLoading(false)
    }
  }

  const addCategory = () => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      setCategories([...categories, categoryInput.trim()])
      setCategoryInput('')
    }
  }

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category))
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const res = await fetch('/api/profile/worker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smartMatchCategories: categories,
          smartMatchMinPay: minPay ? parseFloat(minPay) : null,
          smartMatchMaxTravel: maxTravelMiles[0],
          smartMatchOnlyVerified: onlyVerified,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update SmartMatch settings')
      }

      setSuccess('SmartMatch settings saved!')
      setTimeout(() => router.push('/jobs/for-you'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container max-w-2xl py-8 px-4">Loading...</div>
  }

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">SmartMatch Criteria</h1>
        <p className="text-muted-foreground">
          Set your preferences to get personalized job recommendations
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            What types of jobs are you interested in?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="e.g., Cleaning, Assembly, Delivery"
            />
            <Button type="button" onClick={addCategory}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1"
              >
                <span className="text-sm">{category}</span>
                <button
                  onClick={() => removeCategory(category)}
                  className="text-sm hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add categories to match jobs that fit your interests
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay Requirements</CardTitle>
          <CardDescription>
            Set your minimum acceptable pay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="minPay">Minimum Pay (per job)</Label>
            <Input
              id="minPay"
              type="number"
              value={minPay}
              onChange={(e) => setMinPay(e.target.value)}
              placeholder="e.g., 50"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travel Distance</CardTitle>
          <CardDescription>
            Maximum distance you're willing to travel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Max Travel: {maxTravelMiles[0]} miles</Label>
            <Slider
              value={maxTravelMiles}
              onValueChange={(value) => setMaxTravelMiles(Array.isArray(value) ? value : [value])}
              min={5}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={onlyVerified}
              onCheckedChange={(checked) => setOnlyVerified(checked === true)}
            />
            <Label htmlFor="verified" className="cursor-pointer">
              Only show jobs from verified buyers
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
