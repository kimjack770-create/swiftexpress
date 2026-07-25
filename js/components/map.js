// ========================================================
// SWIFT EXPRESS LOGISTICS - LEAFLET MAP COMPONENT
// Renders interactive map with package route and current pin location
// ========================================================

export function renderPackageMap(containerId, originLat = 38.9072, originLng = -77.0369, currentLat = 51.4700, currentLng = -0.4543, currentLabel = "Sorting Center, Heathrow Airport, UK") {
  const container = document.getElementById(containerId);
  if (!container || !window.L) return;

  // Clear previous instance
  container.innerHTML = '';

  const map = window.L.map(containerId).setView([currentLat, currentLng], 5);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Custom Markers
  const originMarker = window.L.marker([originLat, originLng]).addTo(map).bindPopup("<b>Origin:</b> Package Departure Center");
  const currentMarker = window.L.marker([currentLat, currentLng]).addTo(map).bindPopup(`<b>Current Location:</b><br>${currentLabel}`).openPopup();

  // Polyline connection
  const latlngs = [
    [originLat, originLng],
    [currentLat, currentLng]
  ];
  window.L.polyline(latlngs, { color: '#0057B8', weight: 4, dashArray: '8, 8' }).addTo(map);
}
