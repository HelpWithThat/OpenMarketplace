'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export type WorkProofPhotoView = {
  id?: string
  url: string
}

export function WorkProofGallery({
  photos,
  title = 'Proof of work',
}: {
  photos?: WorkProofPhotoView[] | null
  title?: string
}) {
  const [enlarged, setEnlarged] = useState<{ url: string; label: string } | null>(null)
  const list = photos?.filter((photo) => photo?.url) || []
  if (!list.length) return null

  return (
    <>
      <div>
        <p className="mb-2 text-base font-medium">{title}</p>
        <div className="flex flex-wrap gap-3">
          {list.map((photo, index) => {
            const name = list.length > 1 ? `Proof of work ${index + 1}` : 'Proof of work'
            return (
              <button
                key={photo.id || photo.url}
                type="button"
                className="overflow-hidden rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => setEnlarged({ url: photo.url, label: name })}
              >
                <img src={photo.url} alt={`Tap to enlarge ${name}`} className="h-24 w-24 object-cover" />
              </button>
            )
          })}
        </div>
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
