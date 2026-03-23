/**
 * OpenStreetMap (OSM) Overpass API Service
 * Fetches landmarks, restaurants, and points of interest dynamically.
 */

export interface OSMLandmark {
  id: number;
  name: string;
  type: string;
  lngLat: [number, number];
  tags: Record<string, string>;
}

export async function fetchOSMLandmarks(bbox: [number, number, number, number]): Promise<OSMLandmark[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  
  // We query for a variety of popular amenities and tourist attractions
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"university|hospital|bus_station|train_station|park|cinema|theatre|mall|restaurant|cafe|fast_food"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"university|hospital|bus_station|train_station|park|cinema|theatre|mall|restaurant|cafe|fast_food"](${minLat},${minLng},${maxLat},${maxLng});
      node["tourism"~"museum|attraction"](${minLat},${minLng},${maxLat},${maxLng});
      way["tourism"~"museum|attraction"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out center;
  `;

  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSM Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.elements || [])
      .map((el: any) => {
        const name = el.tags?.name;
        const type = el.tags?.amenity || el.tags?.tourism || el.tags?.highway || 'landmark';
        const lng = el.lon || el.center?.lon;
        const lat = el.lat || el.center?.lat;
        
        return {
          id: el.id,
          name: name || 'Unnamed',
          type,
          lngLat: [lng, lat] as [number, number],
          tags: el.tags || {}
        };
      })
      .filter((l: any) => l.name !== 'Unnamed' && l.lngLat[0] && l.lngLat[1]);
  } catch (err) {
    console.error('LUME OSM: Failed to fetch dynamic landmarks:', err);
    return [];
  }
}
