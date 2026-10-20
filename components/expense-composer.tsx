'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EXPENSE_PROOF_REQUIRED_MESSAGE, EXPENSE_TYPE_LABELS, expenseProofFields } from '@/lib/expenses'
import { EXPENSE_PHOTO_MAX_PER_KIND, type ExpensePhotoKindName } from '@/lib/expense-photos'
import { PhotoPicker } from '@/components/photo-picker'

export type DraftExpensePhoto = {
  kind: ExpensePhotoKindName
  path: string
  contentType: string
  size: number
  previewUrl: string
}

export type DraftExpense = {
  type: string
  amount: number | string
  note: string
  photos: DraftExpensePhoto[]
}

export function emptyDraftExpense(): DraftExpense {
  return { type: 'OTHER', amount: '', note: '', photos: [] }
}

export function ExpenseComposer({
  jobId,
  expenses,
  onChange,
}: {
  jobId: string
  expenses: DraftExpense[]
  onChange: (expenses: DraftExpense[]) => void
}) {
  return (
    <div className="space-y-4">
      {expenses.map((expense, index) => (
        <ExpenseDraftCard
          key={index}
          jobId={jobId}
          expense={expense}
          index={index}
          onChange={(next) => {
            const updated = [...expenses]
            updated[index] = next
            onChange(updated)
          }}
          onRemove={() => onChange(expenses.filter((_, i) => i !== index))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full text-base"
        onClick={() => onChange([...expenses, emptyDraftExpense()])}
      >
        Add an expense
      </Button>
    </div>
  )
}

function ExpenseDraftCard({
  jobId,
  expense,
  index,
  onChange,
  onRemove,
}: {
  jobId: string
  expense: DraftExpense
  index: number
  onChange: (expense: DraftExpense) => void
  onRemove: () => void
}) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<ExpensePhotoKindName | null>(null)

  const update = (patch: Partial<DraftExpense>) => onChange({ ...expense, ...patch })

  const addPhotos = async (kind: ExpensePhotoKindName, files: FileList | null) => {
    if (!files?.length) return
    setError('')
    const existing = expense.photos.filter((photo) => photo.kind === kind)
    if (existing.length + files.length > EXPENSE_PHOTO_MAX_PER_KIND) {
      setError(`You can add up to ${EXPENSE_PHOTO_MAX_PER_KIND} photos here.`)
      return
    }
    setUploading(kind)
    try {
      const uploaded: DraftExpensePhoto[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('kind', kind)
        const res = await fetch(`/api/jobs/${jobId}/expenses/photos`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not save that photo')
        uploaded.push({
          kind,
          path: data.path,
          contentType: data.contentType,
          size: data.size,
          previewUrl: URL.createObjectURL(file),
        })
      }
      update({ photos: [...expense.photos, ...uploaded] })
    } catch (err: any) {
      setError(err.message || 'Could not save that photo')
    } finally {
      setUploading(null)
    }
  }

  const fields = expenseProofFields(expense.type)
  const receipts = fields.showItems
    ? expense.photos.filter((photo) => photo.kind === 'RECEIPT')
    : expense.photos
  const items = fields.showItems ? expense.photos.filter((photo) => photo.kind === 'ITEM') : []

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <p className="text-lg font-medium">Expense {index + 1}</p>
      <div className="space-y-2">
        <Label htmlFor={`expense-type-${index}`} className="text-base">
          Type
        </Label>
        <select
          id={`expense-type-${index}`}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
          value={expense.type}
          onChange={(e) => update({ type: e.target.value })}
        >
          {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`expense-amount-${index}`} className="text-base">
          Amount
        </Label>
        <Input
          id={`expense-amount-${index}`}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          className="h-12 text-base"
          value={expense.amount}
          onChange={(e) => update({ amount: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`expense-note-${index}`} className="text-base">
          What was it for?
        </Label>
        <Input
          id={`expense-note-${index}`}
          className="h-12 text-base"
          value={expense.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="Parking lot, paint, etc."
        />
      </div>

      <PhotoPicker
        title={fields.proofTitle}
        help={fields.proofHelp}
        required
        photos={receipts}
        uploading={uploading === 'RECEIPT'}
        onFiles={(files) => addPhotos('RECEIPT', files)}
        onRemove={(path) => update({ photos: expense.photos.filter((photo) => photo.path !== path) })}
      />
      {fields.showItems && (
        <PhotoPicker
          title={fields.itemsTitle}
          help={fields.itemsHelp}
          photos={items}
          uploading={uploading === 'ITEM'}
          onFiles={(files) => addPhotos('ITEM', files)}
          onRemove={(path) => update({ photos: expense.photos.filter((photo) => photo.path !== path) })}
        />
      )}
      {Number(expense.amount) > 0 && expense.photos.length === 0 && (
        <Alert>
          <AlertDescription className="text-base">{EXPENSE_PROOF_REQUIRED_MESSAGE}</AlertDescription>
        </Alert>
      )}

      {error && <p className="text-base text-destructive">{error}</p>}

      <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={onRemove}>
        Remove this expense
      </Button>
    </div>
  )
}
