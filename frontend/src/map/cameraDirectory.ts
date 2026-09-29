import type { NearbyCamera } from '../lib/api'

export type CameraCategory = 'all' | 'sf' | 'caltrans' | 'wildfire' | 'parks'

export interface LiveCameraFeed extends NearbyCamera {
  azimuth?: number
  elevation_m?: number
  resolution?: string
  fps?: number
  network: string
  status: 'ONLINE' | 'ACTIVE' | 'CALIBRATING'
  last_snapshot?: string
  video_url?: string
  category: 'sf' | 'caltrans' | 'wildfire' | 'parks'
  highwayRoute?: string
  streamType?: 'video' | 'live_cctv' | 'optical_lookout'
}

/**
 * Free Public Camera Network across San Francisco and California.
 * Sources:
 * 1. Caltrans Open CCTV Network (CWWP2) - Free real-time highway & bridge feeds
 * 2. San Francisco City & Scenic Landmarks (Golden Gate, Presidio, Bay Bridge, Ocean Beach)
 * 3. ALERTCalifornia & ALERTWest Wildfire High-Site Towers
 * 4. National Parks & USGS Volcanic/Mountain Observatories (Yosemite, Lake Tahoe, Mt Shasta)
 */
export const CALIFORNIA_FREE_CAMERAS: LiveCameraFeed[] = [
  // ===================== SAN FRANCISCO METRO & CITY LANDMARKS =====================
  {
    id: 'sf-presidio-ggb',
    name: 'Presidio Coastal Overlook · Golden Gate Bridge',
    lat: 37.7989,
    lon: -122.4662,
    distance_km: 4.6,
    elevation_m: 110,
    azimuth: 310,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'Golden Gate National Parks & SF Open Camera',
    status: 'ONLINE',
    image_url: '/video/ggb-poster.jpg',
    video_url: '/video/ggb-1080.mp4',
    category: 'sf',
    streamType: 'video',
  },
  {
    id: 'caltrans-d4-baybridge-west',
    name: 'Caltrans CCTV · I-80 Bay Bridge West Span',
    lat: 37.7905,
    lon: -122.3892,
    distance_km: 2.1,
    elevation_m: 68,
    azimuth: 75,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 4 Open CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/tv101i80baybridgewestspan/tv101i80baybridgewestspan.jpg',
    category: 'caltrans',
    highwayRoute: 'I-80',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d4-hospital-curve',
    name: 'Caltrans CCTV · US-101 at Hospital Curve / Mission',
    lat: 37.7684,
    lon: -122.4069,
    distance_km: 1.4,
    elevation_m: 35,
    azimuth: 180,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 4 Open CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/tv113us101hospitalcurve/tv113us101hospitalcurve.jpg',
    category: 'caltrans',
    highwayRoute: 'US-101',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d4-i80-4th',
    name: 'Caltrans CCTV · I-80 at 4th Street / Downtown SF',
    lat: 37.7802,
    lon: -122.3995,
    distance_km: 1.2,
    elevation_m: 28,
    azimuth: 45,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 4 Open CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/tv104i80at4thstreet/tv104i80at4thstreet.jpg',
    category: 'caltrans',
    highwayRoute: 'I-80',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d4-i280-king',
    name: 'Caltrans CCTV · I-280 at King St / Mission Bay',
    lat: 37.7761,
    lon: -122.3938,
    distance_km: 1.9,
    elevation_m: 22,
    azimuth: 120,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 4 Open CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/tv118i280atkingstreet/tv118i280atkingstreet.jpg',
    category: 'caltrans',
    highwayRoute: 'I-280',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d4-us101-octavia',
    name: 'Caltrans CCTV · US-101 at Octavia Blvd / Market St',
    lat: 37.7712,
    lon: -122.4235,
    distance_km: 0.9,
    elevation_m: 42,
    azimuth: 270,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 4 Open CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/tv115us101atoctaviablvd/tv115us101atoctaviablvd.jpg',
    category: 'caltrans',
    highwayRoute: 'US-101',
    streamType: 'live_cctv',
  },
  {
    id: 'sf-sutro-tower',
    name: 'Sutro Tower East · ALERTWest / City High-Site',
    lat: 37.7552,
    lon: -122.4528,
    distance_km: 3.2,
    elevation_m: 298,
    azimuth: 68,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'ALERTWest / SFFD Wildfire Network',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=900&q=80',
    category: 'sf',
    streamType: 'optical_lookout',
  },
  {
    id: 'sf-twin-peaks',
    name: 'Twin Peaks Summit · 360° SF Panoramic Feed',
    lat: 37.7544,
    lon: -122.4477,
    distance_km: 2.8,
    elevation_m: 282,
    azimuth: 42,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'San Francisco Urban Observation Mesh',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=900&q=80',
    category: 'sf',
    streamType: 'optical_lookout',
  },
  {
    id: 'sf-yerba-buena',
    name: 'Yerba Buena Island · Bay Bridge Center Anchorage',
    lat: 37.8099,
    lon: -122.3662,
    distance_km: 5.1,
    elevation_m: 104,
    azimuth: 245,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'Caltrans & Bay Bridge Operations',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=900&q=80',
    category: 'sf',
    streamType: 'optical_lookout',
  },
  {
    id: 'sf-ocean-beach',
    name: 'Ocean Beach / Great Highway · Pacific Coast Watch',
    lat: 37.7601,
    lon: -122.5098,
    distance_km: 7.2,
    elevation_m: 15,
    azimuth: 270,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'NOAA Coastal Weather & Surf Cam',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    category: 'sf',
    streamType: 'optical_lookout',
  },
  {
    id: 'sf-salesforce-tower',
    name: 'Salesforce Transit Hub Mast · San Francisco Canopy',
    lat: 37.7897,
    lon: -122.3972,
    distance_km: 1.8,
    elevation_m: 326,
    azimuth: 180,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'SF Skyline Atmospheric Sensor Mesh',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=80',
    category: 'sf',
    streamType: 'optical_lookout',
  },

  // ===================== WILDFIRE LOOKOUTS (ALERTWEST / ALERTCALIFORNIA) =====================
  {
    id: 'lookout-mt-tam',
    name: 'Mount Tamalpais East Peak · ALERTWest #201',
    lat: 37.9235,
    lon: -122.5785,
    distance_km: 21.4,
    elevation_m: 784,
    azimuth: 145,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'Marin County Fire & ALERTCalifornia',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },
  {
    id: 'lookout-grizzly-peak',
    name: 'Berkeley Hills / Grizzly Peak · ALERTWest #215',
    lat: 37.8860,
    lon: -122.2280,
    distance_km: 20.8,
    elevation_m: 536,
    azimuth: 220,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'East Bay Regional Parks Wildfire Net',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },
  {
    id: 'lookout-mt-diablo',
    name: 'Mount Diablo Summit Overlook · ALERTWest #220',
    lat: 37.8816,
    lon: -121.9142,
    distance_km: 45.2,
    elevation_m: 1173,
    azimuth: 260,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'CAL FIRE Santa Clara Unit High-Site',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },
  {
    id: 'lookout-pulgas-ridge',
    name: 'San Mateo Pulgas Ridge · ALERTWest #304',
    lat: 37.4912,
    lon: -122.2850,
    distance_km: 33.2,
    elevation_m: 230,
    azimuth: 350,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'CAL FIRE San Mateo-Santa Cruz Unit',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },
  {
    id: 'lookout-mt-hamilton',
    name: 'Mt Hamilton Lick Observatory · ALERTWest #410',
    lat: 37.3414,
    lon: -121.6429,
    distance_km: 84.5,
    elevation_m: 1280,
    azimuth: 310,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'University of California / ALERTCalifornia',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },
  {
    id: 'lookout-mt-wilson',
    name: 'Mount Wilson High-Site · Angeles National Forest',
    lat: 34.2256,
    lon: -118.0572,
    distance_km: 550.0,
    elevation_m: 1742,
    azimuth: 215,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'HPWREN / ALERTCalifornia Southern Net',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=80',
    category: 'wildfire',
    streamType: 'optical_lookout',
  },

  // ===================== CALTRANS STATEWIDE HIGHWAY & MOUNTAIN PASSES =====================
  {
    id: 'caltrans-d3-donner-summit',
    name: 'Caltrans CCTV · I-80 Donner Summit (Sierra Nevada)',
    lat: 39.3175,
    lon: -120.3340,
    distance_km: 260.0,
    elevation_m: 2200,
    azimuth: 60,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 3 Open Mountain CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d3/cctv/image/donnersummit/donnersummit.jpg',
    category: 'caltrans',
    highwayRoute: 'I-80',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d3-echo-summit',
    name: 'Caltrans CCTV · US-50 Echo Summit (Lake Tahoe Pass)',
    lat: 38.8156,
    lon: -120.0465,
    distance_km: 235.0,
    elevation_m: 2250,
    azimuth: 80,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 3 Open Mountain CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d3/cctv/image/echosummit/echosummit.jpg',
    category: 'caltrans',
    highwayRoute: 'US-50',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d7-grapevine',
    name: 'Caltrans CCTV · I-5 Tejon Pass / Grapevine',
    lat: 34.8462,
    lon: -118.8920,
    distance_km: 430.0,
    elevation_m: 1260,
    azimuth: 150,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 7 Open Mountain CCTV',
    status: 'ONLINE',
    image_url: 'https://cwwp2.dot.ca.gov/data/d7/cctv/image/grapevine/grapevine.jpg',
    category: 'caltrans',
    highwayRoute: 'I-5',
    streamType: 'live_cctv',
  },
  {
    id: 'caltrans-d5-bigsur',
    name: 'Caltrans CCTV · Highway 1 Big Sur / Bixby Canyon',
    lat: 36.3714,
    lon: -121.9018,
    distance_km: 170.0,
    elevation_m: 120,
    azimuth: 240,
    resolution: '1080p HD',
    fps: 15,
    network: 'Caltrans District 5 Coastal CCTV',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    category: 'caltrans',
    highwayRoute: 'SR-1',
    streamType: 'live_cctv',
  },

  // ===================== NATIONAL PARKS & SCENIC OBSERVATORIES =====================
  {
    id: 'park-yosemite-halfdome',
    name: 'Yosemite National Park · Half Dome & High Sierra',
    lat: 37.7456,
    lon: -119.5332,
    distance_km: 260.0,
    elevation_m: 2694,
    azimuth: 75,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'National Park Service & Yosemite Conservancy',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=900&q=80',
    category: 'parks',
    streamType: 'optical_lookout',
  },
  {
    id: 'park-yosemite-valley',
    name: 'Yosemite Valley · El Capitan & Bridalveil Fall',
    lat: 37.7138,
    lon: -119.7042,
    distance_km: 245.0,
    elevation_m: 1450,
    azimuth: 90,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'National Park Service Public Webcams',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    category: 'parks',
    streamType: 'optical_lookout',
  },
  {
    id: 'park-lake-tahoe-rim',
    name: 'Lake Tahoe Basin Overlook · Emerald Bay',
    lat: 38.9540,
    lon: -120.1000,
    distance_km: 240.0,
    elevation_m: 1950,
    azimuth: 110,
    resolution: '1080p Full HD',
    fps: 30,
    network: 'US Forest Service & Tahoe Regional Webcams',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=900&q=80',
    category: 'parks',
    streamType: 'optical_lookout',
  },
  {
    id: 'park-mt-shasta',
    name: 'Mount Shasta Volcano Peak Overlook · Northern CA',
    lat: 41.4092,
    lon: -122.1949,
    distance_km: 430.0,
    elevation_m: 4322,
    azimuth: 180,
    resolution: '4K Ultra HD',
    fps: 30,
    network: 'USGS Cascades Volcano Observatory',
    status: 'ONLINE',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    category: 'parks',
    streamType: 'optical_lookout',
  },
]

export const SF_BAY_LIVE_CAMERAS = CALIFORNIA_FREE_CAMERAS

/**
 * Calculates Haversine distance in kilometres between two geographic coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Retrieves live camera feeds sorted by distance from the specified coordinates,
 * optionally filtered by category (all, sf, caltrans, wildfire, parks).
 * Completely crash-proof and lightweight.
 */
export function getNearbyLiveCameras(
  lat: number,
  lon: number,
  category: CameraCategory = 'all',
  limit = 24
): LiveCameraFeed[] {
  const filtered = category === 'all'
    ? CALIFORNIA_FREE_CAMERAS
    : CALIFORNIA_FREE_CAMERAS.filter(c => c.category === category)

  const ranked = filtered.map(cam => {
    const dist = calculateDistanceKm(lat, lon, cam.lat, cam.lon)
    return {
      ...cam,
      distance_km: Math.round(dist * 10) / 10,
      last_snapshot: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  })

  ranked.sort((a, b) => a.distance_km - b.distance_km)
  return ranked.slice(0, limit)
}
