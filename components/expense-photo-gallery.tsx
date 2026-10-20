'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { expenseProofFields } from '@/lib/expenses'

export type ExpensePhotoView = {
  id?: string
  kind: string
  url: string
}

export function ExpensePhotoGallery({
  photos,
  receiptUrl,
  expenseType,
}: {
  photos?: ExpensePhotoView[] | null
  receiptUrl?: string | null
  expenseType?: string
}) {
  const [enlarged, setEnlarged] = useState<{ url: string; label: string } | null>(null)
  const fields = expenseProofFields(expenseType || 'OTHER')
  const list: ExpensePhotoView[] = [...(photos || [])]
  if (receiptUrl && !list.some((photo) => photo.url === receiptUrl)) {
    list.unshift({ kind: 'RECEIPT', url: receiptUrl })
  }
  if (!list.length) return null

  const receipts = fields.showItems ? list.filter((photo) => photo.kind === 'RECEIPT') : list
  const items = fields.showItems ? list.filter((photo) => photo.kind !== 'RECEIPT') : []

  return (
    <>
      <div className="space-y-3">
        {receipts.length > 0 && (
          <PhotoRow
            title={fields.galleryProofTitle}
            photos={receipts}
            label={fields.galleryProofLabel}
            onOpen={setEnlarged}
          />
        )}
        {items.length > 0 && (
          <PhotoRow
            title={fields.itemsTitle || 'Items purchased'}
            photos={items}
            label="Item"
            onOpen={setEnlarged}
          />
        )}
      </div>
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={enlarged.label}
          onClick={() => setEnlarged(null)}
        >
          <p className="mb-3 text-lg font-medium text-white">{enlarged.label}</p>
          <img
            src={enlarged.url}
            alt={enlarged.label}
            className="mx-auto max-h-[70vh] w-full max-w-3xl flex-1 object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <Button
            type="button"
            size="lg"
            className="mt-4 h-12 w-full text-base"
            onClick={() => setEnlarged(null)}
          >
            Close
          </Button>
        </div>
      )}
    </>
  )
}

function PhotoRow({
  title,
  photos,
  label,
  onOpen,
}: {
  title: string
  photos: ExpensePhotoView[]
  label: string
  onOpen: (value: { url: string; label: string }) => void
}) {
  return (
    <div>
      <p className="mb-2 text-base font-medium">{title}</p>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => {
          const name = photos.length > 1 ? `${label} ${index + 1}` : label
          return (
            <button
              key={photo.id || photo.url}
              type="button"
              className="overflow-hidden rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => onOpen({ url: photo.url, label: name })}
            >
              <img src={photo.url} alt={`Tap to enlarge ${name}`} className="h-24 w-24 object-cover" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
