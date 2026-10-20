'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXPENSE_TYPE_LABELS } from '@/lib/expenses'
import { EXPENSE_PHOTO_MAX_PER_KIND, type ExpensePhotoKindName } from '@/lib/expense-photos'

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

  const receipts = expense.photos.filter((photo) => photo.kind === 'RECEIPT')
  const items = expense.photos.filter((photo) => photo.kind === 'ITEM')

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
        title="Receipt photos"
        help="Take a picture of the receipt, or choose one from your gallery. You can add more than one."
        photos={receipts}
        uploading={uploading === 'RECEIPT'}
        onFiles={(files) => addPhotos('RECEIPT', files)}
        onRemove={(path) => update({ photos: expense.photos.filter((photo) => photo.path !== path) })}
      />
      <PhotoPicker
        title="Photos of the items"
        help="Take pictures of what you bought, or choose them from your gallery."
        photos={items}
        uploading={uploading === 'ITEM'}
        onFiles={(files) => addPhotos('ITEM', files)}
        onRemove={(path) => update({ photos: expense.photos.filter((photo) => photo.path !== path) })}
      />

      {error && <p className="text-base text-destructive">{error}</p>}

      <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={onRemove}>
        Remove this expense
      </Button>
    </div>
  )
}

function PhotoPicker({
  title,
  help,
  photos,
  uploading,
  onFiles,
  onRemove,
}: {
  title: string
  help: string
  photos: DraftExpensePhoto[]
  uploading: boolean
  onFiles: (files: FileList | null) => void
  onRemove: (path: string) => void
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-medium">{title}</p>
        <p className="text-base text-muted-foreground">{help}</p>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 text-base"
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 flex-1 text-base"
          disabled={uploading}
          onClick={() => galleryRef.current?.click()}
        >
          Choose from gallery
        </Button>
      </div>
      {uploading && <p className="text-base text-muted-foreground">Saving photo…</p>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.path} className="space-y-2">
              <img src={photo.previewUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-24 text-sm"
                onClick={() => onRemove(photo.path)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
