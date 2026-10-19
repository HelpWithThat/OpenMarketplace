'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { formatReliability } from '@/lib/reliability'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  
  // Worker-specific
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [toolInput, setToolInput] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [travelRadius, setTravelRadius] = useState([25])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setName(data.user.name || '')
        setBio(data.user.workerProfile?.bio || data.user.bio || '')
        setPhotoPreview(data.user.workerProfile?.photo || data.user.photoUrl || '')
        
        if (data.user.workerProfile) {
          setSkills(data.user.workerProfile.skills || [])
          setTools(data.user.workerProfile.tools || [])
          setCity(data.user.workerProfile.publicCity || data.user.workerProfile.city || '')
          setZip(data.user.workerProfile.publicZip || data.user.workerProfile.zip || '')
          setTravelRadius([data.user.workerProfile.travelRadius || 25])
        }
      }
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async () => {
    if (!photoFile) return photoPreview

    const formData = new FormData()
    formData.append('file', photoFile)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) throw new Error('Photo upload failed')
    const data = await res.json()
    return data.url
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      let photoUrl = photoPreview
      if (photoFile) {
        photoUrl = await uploadPhoto()
      }

      // Update user profile
      const userRes = await fetch('/api/profile/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, photoUrl }),
      })

      if (!userRes.ok) {
        const data = await userRes.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update worker profile if applicable
      if (user?.isWorker) {
        const workerRes = await fetch('/api/profile/worker', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skills,
            tools,
            city,
            zip,
            travelRadius: travelRadius[0],
          }),
        })

        if (!workerRes.ok) {
          const data = await workerRes.json()
          throw new Error(data.error || 'Failed to update worker profile')
        }
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const addTool = () => {
    if (toolInput.trim() && !tools.includes(toolInput.trim())) {
      setTools([...tools, toolInput.trim()])
      setToolInput('')
    }
  }

  const removeTool = (tool: string) => {
    setTools(tools.filter(t => t !== tool))
  }

  if (loading) {
    return <div className="container max-w-2xl py-8 px-4">Loading...</div>
  }

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Edit Profile</h1>

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
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {user?.isWorker && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {formatReliability({
                  completedJobs: user.workerProfile?.completedJobs ?? 0,
                  acceptedJobs: user.workerProfile?.acceptedJobs ?? 0,
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This counts jobs you accepted. Cancelling after you accept lowers this number.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill"
                />
                <Button type="button" onClick={addSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div
                    key={skill}
                    className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1"
                  >
                    <span className="text-sm">{skill}</span>
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-sm hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tools & Equipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                  placeholder="Add a tool"
                />
                <Button type="button" onClick={addTool}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <div
                    key={tool}
                    className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1"
                  >
                    <span className="text-sm">{tool}</span>
                    <button
                      onClick={() => removeTool(tool)}
                      className="text-sm hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location & Travel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Travel Radius: {travelRadius[0]} miles</Label>
                <Slider
                  value={travelRadius}
                  onValueChange={(value) => setTravelRadius(Array.isArray(value) ? value : [value])}
                  min={5}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
