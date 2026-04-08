# 🌟 Project LUME

> **Check the aura before you walk.**

LUME is a real-time urban safety dashboard built for the MSRIT campus area in Bangalore. It crowdsources safety data from the community — broken streetlights, harassment hotspots, secluded paths — and layers it onto an interactive dark-themed map so users can make informed decisions before they walk.

---

## ✨ Features

### 🗺️ Interactive Safety Map
- Full-screen interactive map powered by **MapLibre GL** with a CARTO Dark Matter tile style (no API key required)
- Centered on **MSRIT, Bangalore** with smooth flyTo navigation and real-time marker rendering
- Clustered map markers using **Supercluster** for incident density management
- **Live user location tracking** via the browser Geolocation API with a pulsing "You are here" marker
- Map bearing reset and zoom controls with smooth animated transitions

### 🔴 Incident Reporting
- **Tap anywhere on the map** to pin and submit a new safety incident report
- Report types include:
  - 💡 **Broken Streetlight** — flag non-functional or missing street lighting
  - ⚠️ **Verbal Harassment** — report incidents of harassment at a location
  - 🌲 **Secluded Path** — flag isolated or poorly-surveilled walkways
- Severity levels: Low / Medium / High
- **Optimistic UI** — markers appear on the map instantly without waiting for the server
- Reports are **persisted to Supabase** and **sync in real time** across all connected clients via Postgres Change Events

### ⚡ Unlit Road Stretch Reporting
- A special **"Unlit Road Stretch"** mode lets users report an entire dark corridor at once
- Users tap a **start point** then an **end point** on the map; LUME automatically interpolates 8 evenly-spaced markers along the stretch and uploads them all in one flow

### 🛡️ Live Safety Audit
- Users can submit a **multi-factor safety audit** for their current location, scoring:
  - **Illumination** — how well-lit the area is
  - **Crowd Vibe** — perceived comfort level with surrounding people
  - **Eyes on the Street** — natural surveillance from open shops, residents, etc.
  - **Escape Options** — availability of exit routes
  - **Walkability** — overall ease and safety of walking the path
- LUME computes a composite **Aura Score** (0–100) for each audit submission
- Audit pins appear on the map; clicking a pin opens a detailed **BranchedPopup** overlay showing all five factors and the overall Aura Score

### 🏪 Active Fronts
- Displays **24/7 businesses and open establishments** as "Active Fronts" — community anchors that deter crime through natural surveillance
- Active Fronts are fetched from Supabase and rendered as a toggleable layer
- The sidebar shows how many Active Fronts are within **500m of your current location**

### 🔍 Sidebar Search
- Unified search bar that queries across:
  - **Active Fronts** (businesses by name or category)
  - **OSM Landmarks** (restaurants, shops, and points of interest fetched live from OpenStreetMap's Overpass API)
  - **User Reports** (by type or description)
- Clicking a result **flies the map** directly to that location

### 📊 Area Scores & Layer Controls
- Live **safety score bars** computed dynamically from nearby map data:
  - **Illumination Score** — based on density of lit vs dark markers
  - **Social Safety Score** — based on harassment and vulnerability incident density
  - **Active Fronts Score** — proximity and density of open businesses
- An overall **AURA score** (0–100) is displayed in the sidebar header
- Three independently toggleable map layers: Lumen Layer, Social Safety, and Active Fronts

### 📡 Real-Time Sync
- Uses **Supabase Realtime** to push new reports and deletions to all open browser sessions instantly via PostgREST change subscriptions
- Graceful **offline/mock mode**: the app works without a `.env.local` file configured, falling back to local fixture data so the UI is always demonstrable

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Mapping | MapLibre GL JS + CARTO Dark Matter tiles |
| Database & Auth | Supabase (PostgreSQL + Realtime) |
| UI Components | Radix UI + shadcn/ui + Tailwind CSS v4 |
| Animation | Framer Motion (`motion`) |
| Icons | Lucide React |
| Charts | Recharts |
| Spatial Clustering | Supercluster |
| OSM Data | Overpass API |

---

## 📦 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/project-lume.git
cd project-lume
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the template and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```

Open `.env.local` and set:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note:** The app runs in **mock mode** without these keys — all features are still visible using local fixture data.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Schema

LUME requires four tables in your Supabase project:

| Table | Purpose |
|---|---|
| `incidents` | Preloaded safety incidents (streetlights, harassment zones) |
| `active_fronts` | 24/7 businesses and open establishments |
| `user_reports` | Community-submitted incident reports |
| `safety_audits` | Live safety audit submissions with Aura scores |

Refer to `geojson_import.sql` for the full schema and seed data.

---

## 🗺️ Map Coverage

LUME is currently focused on the **MSRIT (M S Ramaiah Institute of Technology)** campus area in Bangalore (77.53°E–77.60°E, 13.01°N–13.06°N). The OSM landmark fetch and all preloaded incident coordinates target this bounding box.

---

## 🤝 Collaborating

See [COLLABORATION_GUIDE.md](./COLLABORATION_GUIDE.md) for the full team workflow — branching strategy, pull requests, and how to handle merge conflicts.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.