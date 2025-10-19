'use client'

import { useState, useEffect } from 'react'
import { PostComposer } from '@/components/posts/PostComposer'
import { FeedList } from '@/components/feed/FeedList'

export default function NearbyPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [locationGranted, setLocationGranted] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const requestLocation = () => {
    setIsLoadingLocation(true)
    setLocationDenied(false)

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      setIsLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }
        setUserLocation(location)
        setLocationGranted(true)
        setLocationDenied(false)
        setIsLoadingLocation(false)

        // Store in localStorage for persistence
        localStorage.setItem('userLocation', JSON.stringify(location))
      },
      (error) => {
        console.error('Location error:', error)
        setLocationDenied(true)
        setLocationGranted(false)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  useEffect(() => {
    // Check if location was previously granted
    const storedLocation = localStorage.getItem('userLocation')
    if (storedLocation) {
      try {
        const location = JSON.parse(storedLocation)
        setUserLocation(location)
        setLocationGranted(true)
      } catch (error) {
        console.error('Error parsing stored location:', error)
      }
    }
  }, [])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📍</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nearby
            </h1>
          </div>

          {locationGranted && (
            <button
              onClick={requestLocation}
              disabled={isLoadingLocation}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            >
              {isLoadingLocation ? 'Updating...' : '🔄 Update Location'}
            </button>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Discover posts from people near you
        </p>

        {/* Location Status */}
        {!locationGranted && !locationDenied && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Enable Location Access
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  To see posts from nearby users, we need access to your location. Your location is never shared without your permission.
                </p>
                <button
                  onClick={requestLocation}
                  disabled={isLoadingLocation}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isLoadingLocation ? 'Requesting...' : 'Enable Location'}
                </button>
              </div>
            </div>
          </div>
        )}

        {locationDenied && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Location Access Denied
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  You denied location access. To use this feature, please enable location permissions in your browser settings and try again.
                </p>
                <button
                  onClick={requestLocation}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {locationGranted && userLocation && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Location Enabled
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing posts from your area (within 10 km radius)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                  {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post Composer */}
      {locationGranted && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">📍</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share with Nearby Users
            </h2>
          </div>
          <PostComposer onPostCreated={handlePostCreated} />
        </div>
      )}

      {/* Feed */}
      {locationGranted ? (
        <FeedList key={refreshKey} feedType="nearby" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🗺️</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Location Access
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Enable location access to discover nearby posts
            </p>
            <button
              onClick={requestLocation}
              disabled={isLoadingLocation}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
              {isLoadingLocation ? 'Requesting...' : 'Enable Location'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
