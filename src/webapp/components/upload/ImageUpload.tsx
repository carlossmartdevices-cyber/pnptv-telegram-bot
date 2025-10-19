'use client'

import { useState, useRef } from 'react'
import { getAuthToken } from '@/lib/auth'

interface ImageUploadProps {
  onUploadComplete: (urls: string[]) => void
  maxImages?: number
}

export function ImageUpload({ onUploadComplete, maxImages = 4 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    // Check total images limit
    if (previews.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const newPreviews: string[] = []
      const newUrls: string[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed')
          continue
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image too large. Maximum 5MB per image')
          continue
        }

        // Create preview
        const reader = new FileReader()
        const preview = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        newPreviews.push(preview)

        // Upload to server
        const token = getAuthToken()
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: preview,
            filename: file.name,
            contentType: file.type,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        const data = await response.json()
        newUrls.push(data.url)
      }

      // Update state
      const allPreviews = [...previews, ...newPreviews]
      const allUrls = [...uploadedUrls, ...newUrls]

      setPreviews(allPreviews)
      setUploadedUrls(allUrls)
      onUploadComplete(allUrls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images')
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index)
    const newUrls = uploadedUrls.filter((_, i) => i !== index)

    setPreviews(newPreviews)
    setUploadedUrls(newUrls)
    onUploadComplete(newUrls)
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {previews.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="image-upload"
            className={`inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="text-lg">📷</span>
            <span>{isUploading ? 'Uploading...' : 'Add Photos'}</span>
          </label>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {previews.length}/{maxImages} images
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className={`grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold hover:bg-red-700"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
