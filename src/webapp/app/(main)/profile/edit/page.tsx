'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, getCurrentUser } from '@/lib/auth'
import type { User } from '@/types'

export default function EditProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [locationText, setLocationText] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await response.json()
      const userData = data.user

      setUser(userData)
      setDisplayName(userData.displayName || '')
      setBio(userData.bio || '')
      setLocationText(userData.location?.text || '')
      setPhotoUrl(userData.photoUrl || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const token = getAuthToken()
      if (!token) {
        router.push('/login')
        return
      }

      const updateData = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: locationText.trim() ? { text: locationText.trim() } : null,
        photoUrl: photoUrl.trim() || null,
      }

      const response = await fetch(`/api/users/${user.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data.user)
      setSuccess(true)

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to profile after 1 second
      setTimeout(() => {
        router.push('/profile')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="h-24 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Update your personal information
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          {/* Display Name */}
          <div className="mb-6">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Display Name *
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
              maxLength={50}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {displayName.length}/50 characters
            </p>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-900 dark:text-white"
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Location
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">📍</span>
              <input
                type="text"
                id="location"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Your location"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
                maxLength={100}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {locationText.length}/100 characters
            </p>
          </div>

          {/* Photo URL */}
          <div className="mb-6">
            <label
              htmlFor="photoUrl"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Profile Photo URL
            </label>
            <input
              type="url"
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Enter a URL to your profile photo
            </p>
          </div>

          {/* Preview */}
          {photoUrl && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview:
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src={photoUrl}
                  alt="Profile preview"
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {displayName}
                  </p>
                  {bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                Profile updated successfully! Redirecting...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSaving || !displayName.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
