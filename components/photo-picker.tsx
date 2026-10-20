'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'

export type PhotoPickerItem = {
  path: string
  previewUrl: string
}

export function PhotoPicker({
  title,
  help,
  required,
  photos,
  uploading,
  onFiles,
  onRemove,
}: {
  title: string
  help: string
  required?: boolean | 'optional'
  photos: PhotoPickerItem[]
  uploading: boolean
  onFiles: (files: FileList | null) => void
  onRemove: (path: string) => void
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-medium">
          {title}
          {required === true ? ' (required)' : required === 'optional' ? ' (optional)' : ''}
        </p>
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
