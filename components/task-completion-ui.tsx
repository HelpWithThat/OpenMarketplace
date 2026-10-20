'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ExpenseComposer, emptyDraftExpense, type DraftExpense } from '@/components/expense-composer'
import { EXPENSE_PROOF_REQUIRED_MESSAGE, expenseHasProof } from '@/lib/expenses'

export function TaskCompletionUI({ assignment }: { assignment: any }) {
  const router = useRouter()
  const [results, setResults] = useState<Record<string, any>>({})
  const [expenses, setExpenses] = useState<DraftExpense[]>(
    (assignment.expenses || []).map((expense: any) => ({
      type: expense.type || 'OTHER',
      amount: expense.amount || '',
      note: expense.note || '',
      photos: [],
    }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  const job = assignment.job
  const existingResults = assignment.taskResults.reduce((acc: any, result: any) => {
    acc[result.stepId] = result
    return acc
  }, {})

  const handleCheckbox = (stepId: string, checked: boolean) => {
    setResults(prev => ({ ...prev, [stepId]: { completed: checked } }))
  }

  const handleCheckIn = async (stepId: string) => {
    const now = new Date().toISOString()
    try {
      const position = await getCurrentPosition()
      setResults(prev => ({
        ...prev,
        [stepId]: {
          dateValue: now,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      }))
    } catch {
      setResults(prev => ({
        ...prev,
        [stepId]: { dateValue: now },
      }))
    }
  }

  const handleFileUpload = async (stepId: string, files: FileList, isPhoto: boolean) => {
    setUploadingFiles(prev => ({ ...prev, [stepId]: true }))
    try {
      const uploadedFiles: any[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()
        uploadedFiles.push(data)
      }
      setResults(prev => ({
        ...prev,
        [stepId]: {
          files: [...(prev[stepId]?.files || []), ...uploadedFiles],
        },
      }))
    } catch (err) {
      setError('File upload failed')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [stepId]: false }))
    }
  }

  const handleSignature = (stepId: string, signature: string, signerName: string) => {
    setResults(prev => ({
      ...prev,
      [stepId]: { signature, signerName },
    }))
  }

  const addExpense = () => {
    setExpenses((prev) => [...prev, emptyDraftExpense()])
  }

  const canSubmit = () => {
    for (const section of job.taskSections) {
      for (const step of section.steps) {
        if (step.required) {
          const result = results[step.id] || existingResults[step.id]
          if (!result) return false
          
          if (step.type === 'CHECKBOX' && !result.completed) return false
          if (step.type === 'CHECK_IN' && !result.dateValue) return false
          if (step.type === 'CHECK_OUT' && !result.dateValue) return false
          if (step.type === 'PHOTO' && (!result.files || result.files.length === 0)) return false
          if (step.type === 'TEXT' && !result.textValue) return false
          if (step.type === 'NUMBER' && result.numberValue === undefined) return false
          if (step.type === 'SIGNATURE' && !result.signature) return false
          if (step.type === 'FILE_UPLOAD' && (!result.files || result.files.length === 0)) return false
        }
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!canSubmit()) {
      setError('Please complete all required tasks')
      return
    }
    const missingProof = expenses.some(
      (expense) => Number(expense.amount) > 0 && !expenseHasProof(expense.photos)
    )
    if (missingProof) {
      setError(EXPENSE_PROOF_REQUIRED_MESSAGE)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/jobs/${job.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          expenses: expenses
            .filter((expense) => Number(expense.amount) > 0)
            .map((expense) => ({
              type: expense.type,
              amount: Number(expense.amount),
              note: expense.note,
              photos: expense.photos.map(({ path, kind, contentType, size }) => ({
                path,
                kind,
                contentType,
                size,
              })),
            })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submission failed')
      }

      router.push(`/jobs/${job.id}?submitted=true`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalRequired = job.taskSections.reduce(
    (sum: number, section: any) => sum + section.steps.filter((s: any) => s.required).length,
    0
  )
  const completedRequired = job.taskSections.reduce((sum: number, section: any) => {
    return sum + section.steps.filter((s: any) => {
      if (!s.required) return false
      const result = results[s.id] || existingResults[s.id]
      return !!result
    }).length
  }, 0)

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">{job.title}</h1>
        <p className="text-muted-foreground">
          Complete all tasks and submit for approval
        </p>
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">
            Progress: {completedRequired} of {totalRequired} required tasks
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completedRequired / totalRequired) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {job.locationType === 'ON_SITE' && assignment.status === 'IN_PROGRESS' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Job Location</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{job.address}</p>
            <p className="text-xs text-muted-foreground">{job.city}</p>
          </CardContent>
        </Card>
      )}

      {job.taskSections.map((section: any) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.steps.map((step: any) => {
              const result = results[step.id] || existingResults[step.id]
              const isCompleted = !!result

              return (
                <div key={step.id} className="space-y-2 border-b pb-4 last:border-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Label className="flex items-center gap-2">
                        {step.title}
                        {step.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        {isCompleted && <Badge variant="outline" className="text-xs">✓</Badge>}
                      </Label>
                      {step.instructions && (
                        <p className="mt-1 text-sm text-muted-foreground">{step.instructions}</p>
                      )}
                    </div>
                  </div>

                  {step.type === 'CHECKBOX' && (
                    <Checkbox
                      checked={result?.completed || false}
                      onCheckedChange={(checked) => handleCheckbox(step.id, checked as boolean)}
                    />
                  )}

                  {(step.type === 'CHECK_IN' || step.type === 'CHECK_OUT') && (
                    <div>
                      {result?.dateValue ? (
                        <p className="text-sm">
                          ✓ {new Date(result.dateValue).toLocaleString()}
                          {result.lat && ` (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`}
                        </p>
                      ) : (
                        <Button onClick={() => handleCheckIn(step.id)} size="sm">
                          {step.type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                        </Button>
                      )}
                    </div>
                  )}

                  {step.type === 'PHOTO' && (
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => e.target.files && handleFileUpload(step.id, e.target.files, true)}
                        disabled={uploadingFiles[step.id]}
                      />
                      {uploadingFiles[step.id] && <p className="text-sm text-muted-foreground">Uploading...</p>}
                      {result?.files && result.files.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {result.files.map((file: any, i: number) => (
                            <img key={i} src={file.url} alt="" className="h-20 w-20 rounded object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step.type === 'TEXT' && (
                    <Textarea
                      value={result?.textValue || ''}
                      onChange={(e) => setResults(prev => ({
                        ...prev,
                        [step.id]: { textValue: e.target.value },
                      }))}
                      rows={3}
                    />
                  )}

                  {step.type === 'NUMBER' && (
                    <Input
                      type="number"
                      value={result?.numberValue || ''}
                      onChange={(e) => setResults(prev => ({
                        ...prev,
                        [step.id]: { numberValue: parseFloat(e.target.value) },
                      }))}
                    />
                  )}

                  {step.type === 'TIME' && (
                    <Input
                      type="time"
                      value={result?.textValue || ''}
                      onChange={(e) => setResults(prev => ({
                        ...prev,
                        [step.id]: { textValue: e.target.value },
                      }))}
                    />
                  )}

                  {step.type === 'DATE' && (
                    <Input
                      type="date"
                      value={result?.textValue || ''}
                      onChange={(e) => setResults(prev => ({
                        ...prev,
                        [step.id]: { textValue: e.target.value },
                      }))}
                    />
                  )}

                  {step.type === 'YES_NO' && (
                    <RadioGroup
                      value={result?.boolValue?.toString() || ''}
                      onValueChange={(value) => setResults(prev => ({
                        ...prev,
                        [step.id]: { boolValue: value === 'true' },
                      }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id={`${step.id}-yes`} />
                        <Label htmlFor={`${step.id}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${step.id}-no`} />
                        <Label htmlFor={`${step.id}-no`}>No</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {step.type === 'MULTIPLE_CHOICE' && step.settings?.choices && (
                    <RadioGroup
                      value={result?.textValue || ''}
                      onValueChange={(value) => setResults(prev => ({
                        ...prev,
                        [step.id]: { textValue: value },
                      }))}
                    >
                      {step.settings.choices.map((choice: string, i: number) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={choice} id={`${step.id}-${i}`} />
                          <Label htmlFor={`${step.id}-${i}`}>{choice}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {step.type === 'PHONE_CALL' && (
                    <div>
                      <Textarea
                        placeholder="Log call result (e.g., 'Called support, ticket #12345')"
                        value={result?.textValue || ''}
                        onChange={(e) => setResults(prev => ({
                          ...prev,
                          [step.id]: { textValue: e.target.value },
                        }))}
                        rows={2}
                      />
                    </div>
                  )}

                  {step.type === 'SIGNATURE' && (
                    <div className="space-y-2">
                      {result?.signature ? (
                        <div>
                          <p className="text-sm">✓ Signed by {result.signerName}</p>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Signer's printed name"
                            value={result?.signerName || ''}
                            onChange={(e) => setResults(prev => ({
                              ...prev,
                              [step.id]: { ...prev[step.id], signerName: e.target.value },
                            }))}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const name = result?.signerName || ''
                              if (!name) {
                                setError('Enter signer name first')
                                return
                              }
                              handleSignature(step.id, `signature-${Date.now()}`, name)
                            }}
                          >
                            Add Signature
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {step.type === 'FILE_UPLOAD' && (
                    <div>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && handleFileUpload(step.id, e.target.files, false)}
                        disabled={uploadingFiles[step.id]}
                      />
                      {uploadingFiles[step.id] && <p className="text-sm text-muted-foreground">Uploading...</p>}
                      {result?.files && result.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.files.map((file: any, i: number) => (
                            <p key={i} className="text-sm">✓ {file.path.split('/').pop()}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {job.expensesAllowed && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <p className="text-base text-muted-foreground">
              Every expense needs a proof photo — a receipt, parking receipt, or meter/app screenshot. Take a photo or choose from your gallery. The buyer can approve each expense. Anything not approved will not be paid.
            </p>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <Button onClick={addExpense} variant="outline" size="lg" className="h-12 w-full text-base">
                Add an expense
              </Button>
            ) : (
              <ExpenseComposer jobId={job.id} expenses={expenses} onChange={setExpenses} />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={loading || !canSubmit()}
          className="flex-1"
        >
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/jobs/${job.id}`)}
          disabled={loading}
        >
          Save & Exit
        </Button>
      </div>
    </div>
  )
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject)
  })
}
