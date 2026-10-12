'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PostJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState('')
  const [locationType, setLocationType] = useState<'ON_SITE' | 'REMOTE' | 'WORKER_CHOICE'>('ON_SITE')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [scheduleType, setScheduleType] = useState<'FIXED' | 'WINDOW' | 'ANYTIME'>('FIXED')
  const [fixedTime, setFixedTime] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [payType, setPayType] = useState<'FIXED' | 'HOURLY'>('FIXED')
  const [fixedPrice, setFixedPrice] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [maxHours, setMaxHours] = useState('')
  const [expensesAllowed, setExpensesAllowed] = useState(true)
  const [expenseBudget, setExpenseBudget] = useState('')

  const [taskSections, setTaskSections] = useState([
    {
      name: 'Prep',
      steps: [
        { type: 'CHECK_IN', title: 'Check in on arrival', required: true },
      ],
    },
    {
      name: 'On Site',
      steps: [
        { type: 'PHOTO', title: 'Take before photos', required: true },
      ],
    },
    {
      name: 'Closeout',
      steps: [
        { type: 'PHOTO', title: 'Take after photos', required: true },
        { type: 'CHECK_OUT', title: 'Check out when complete', required: true },
      ],
    },
  ])

  const addTaskStep = (sectionIndex: number) => {
    const newSections = [...taskSections]
    newSections[sectionIndex].steps.push({
      type: 'CHECKBOX',
      title: 'New task',
      required: false,
    })
    setTaskSections(newSections)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          locationType,
          address: locationType === 'ON_SITE' ? address : null,
          city,
          scheduleType,
          fixedTime: scheduleType === 'FIXED' ? new Date(fixedTime).toISOString() : null,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
          payType,
          fixedPrice: payType === 'FIXED' ? parseFloat(fixedPrice) : null,
          hourlyRate: payType === 'HOURLY' ? parseFloat(hourlyRate) : null,
          maxHours: payType === 'HOURLY' ? parseFloat(maxHours) : null,
          expensesAllowed,
          expenseBudget: expenseBudget ? parseFloat(expenseBudget) : null,
          taskSections,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const job = await res.json()
      router.push(`/jobs/${job.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Post a Job</h1>
        <p className="text-muted-foreground">Create a job posting with custom tasks</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Mount TV on living room wall"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the work needed"
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categories">Categories (comma-separated)</Label>
              <Input
                id="categories"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="e.g., Installation, TV Mounting, Handyman"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON_SITE">On-site (specific address)</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="WORKER_CHOICE">Worker's choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {locationType === 'ON_SITE' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="address">Full Address *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Denver"
                    required
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>When</Label>
              <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed time</SelectItem>
                  <SelectItem value="WINDOW">Time window</SelectItem>
                  <SelectItem value="ANYTIME">Anytime before deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleType === 'FIXED' && (
              <div className="space-y-2">
                <Label htmlFor="fixedTime">Date & Time *</Label>
                <Input
                  id="fixedTime"
                  type="datetime-local"
                  value={fixedTime}
                  onChange={(e) => setFixedTime(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="60"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pay Type</Label>
              <Select value={payType} onValueChange={(v: any) => setPayType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed price</SelectItem>
                  <SelectItem value="HOURLY">Hourly rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payType === 'FIXED' ? (
              <div className="space-y-2">
                <Label htmlFor="fixedPrice">Price *</Label>
                <Input
                  id="fixedPrice"
                  type="number"
                  step="0.01"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  placeholder="150.00"
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate *</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="35.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxHours">Max Hours *</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    step="0.5"
                    value={maxHours}
                    onChange={(e) => setMaxHours(e.target.value)}
                    placeholder="4"
                    required
                  />
                </div>
              </>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="expenses"
                checked={expensesAllowed}
                onCheckedChange={(checked) => setExpensesAllowed(checked as boolean)}
              />
              <Label htmlFor="expenses">Allow expenses (travel, parking, materials)</Label>
            </div>
            {expensesAllowed && (
              <div className="space-y-2">
                <Label htmlFor="expenseBudget">Expense Budget (optional)</Label>
                <Input
                  id="expenseBudget"
                  type="number"
                  step="0.01"
                  value={expenseBudget}
                  onChange={(e) => setExpenseBudget(e.target.value)}
                  placeholder="50.00"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                <h3 className="font-semibold">{section.name}</h3>
                {section.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{step.type}</span>
                    <span>{step.title}</span>
                    {step.required && <span className="text-destructive">*</span>}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTaskStep(sectionIndex)}
                >
                  Add Task to {section.name}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Posting...' : 'Post Job'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
