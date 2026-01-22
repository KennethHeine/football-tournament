# Football Tournament App - Expansion Roadmap

This document outlines potential features and enhancements for the Football Tournament app, organized by infrastructure requirements. All suggestions prioritize **minimal running costs** while maximizing value.

## Table of Contents

1. [Frontend-Only Enhancements](#1-frontend-only-enhancements-current-architecture)
2. [Backend API Options](#2-backend-api-options-low-cost)
3. [Remote Storage Options](#3-remote-storage-options)
4. [Implementation Priorities](#4-implementation-priorities)

---

## 1. Frontend-Only Enhancements (Current Architecture)

These features require **no additional infrastructure** and can be implemented entirely in the browser using existing technologies (React, localStorage, static hosting).

### 1.1 Enhanced Tournament Features

#### 1.1.1 Match Results Tracking

**What it does:** Allow users to enter match scores and track standings.

**Why it's valuable:** Transforms the app from a schedule generator into a complete tournament management tool.

**How to implement:**

```typescript
// Add to src/lib/types.ts
export interface MatchResult {
  matchId: string
  homeScore: number | null
  awayScore: number | null
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  recordedAt?: string
}

export interface TeamStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}
```

1. Add a `MatchResult` interface and store results in localStorage
2. Create a new `Step5Results.tsx` component for entering scores
3. Add a standings calculator utility in `src/lib/standings.ts`
4. Display a live standings table with automatic updates

**Cost:** $0 - Uses existing localStorage

---

#### 1.1.2 Knockout/Elimination Rounds

**What it does:** Support bracket-style tournaments in addition to round-robin.

**Why it's valuable:** Many tournaments use group stages followed by knockout rounds.

**How to implement:**

```typescript
// Add to src/lib/types.ts
export type TournamentFormat = 'round-robin' | 'knockout' | 'group-knockout'

export interface KnockoutRound {
  name: string // 'Final', 'Semi-Final', 'Quarter-Final'
  matches: Match[]
}
```

1. Add tournament format selection in Step 3
2. Create `src/lib/bracket-generator.ts` for knockout bracket generation
3. Add bracket visualization component using SVG or CSS grid
4. Handle advancement rules (winner of match X vs winner of match Y)

**Cost:** $0 - Pure frontend logic

---

#### 1.1.3 Team Groups/Pools

**What it does:** Divide teams into groups for group-stage tournaments.

**Why it's valuable:** Large tournaments often use multiple groups that play separately.

**How to implement:**

```typescript
// Add to src/lib/types.ts
export interface Group {
  id: string
  name: string // 'Pulje A', 'Pulje B'
  teamIds: string[]
}
```

1. Add group configuration step in the wizard
2. Allow drag-and-drop team assignment to groups
3. Generate schedules per group with inter-group finals

**Cost:** $0 - Frontend only

---

### 1.2 Improved UX Features

#### 1.2.1 Offline Support (PWA Enhancement)

**What it does:** Full offline functionality with service worker caching.

**Current status:** The app has basic PWA support. This extends it.

**How to implement:**

```typescript
// Update vite.config.ts - PWA configuration
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
          },
        ],
      },
    }),
  ],
})
```

1. Enhance the existing PWA configuration for complete offline support
2. Add background sync for when user goes online
3. Show clear offline/online status indicator

**Cost:** $0 - Static files only

---

#### 1.2.2 Multi-Language Support (i18n)

**What it does:** Support for multiple languages (currently Danish only).

**Why it's valuable:** Expand user base beyond Danish speakers.

**How to implement:**

```bash
npm install i18next react-i18next
```

```typescript
// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import da from './locales/da.json'
import en from './locales/en.json'

i18n.use(initReactI18next).init({
  resources: {
    da: { translation: da },
    en: { translation: en },
  },
  lng: 'da',
  fallbackLng: 'en',
})
```

1. Install i18next and react-i18next
2. Extract all strings to translation files
3. Add language selector in settings
4. Store language preference in localStorage

**Cost:** $0 - Pure frontend

---

#### 1.2.3 Tournament Templates

**What it does:** Save and reuse tournament configurations as templates.

**Why it's valuable:** Organizers often run similar tournaments repeatedly.

**How to implement:**

```typescript
// Add to src/lib/types.ts
export interface TournamentTemplate {
  id: string
  name: string
  settings: Omit<TournamentSettings, 'name' | 'startDate'>
  schedulingConfig: SchedulingConfig
  createdAt: string
}
```

1. Add "Save as Template" button on the settings step
2. Store templates separately in localStorage under `tournament-templates` key
3. Add template picker when creating new tournaments
4. Allow editing and deleting templates

**Cost:** $0 - localStorage

---

#### 1.2.4 Dark Mode

**What it does:** Toggle between light and dark themes.

**Why it's valuable:** Improves accessibility and user preference.

**How to implement:**

The app already uses `next-themes` dependency. Enable it:

```typescript
// Update src/main.tsx
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="system">
    <App />
  </ThemeProvider>
)
```

1. Wrap app in ThemeProvider (already have the dependency)
2. Add theme toggle button in header
3. Define dark mode CSS variables in `src/styles/theme.css`

**Cost:** $0 - CSS only

---

### 1.3 Data Export/Import Enhancements

#### 1.3.1 Full Tournament Backup/Restore

**What it does:** Export entire tournament data as JSON file, import from file.

**Why it's valuable:** Backup data, transfer between devices without cloud sync.

**How to implement:**

```typescript
// src/lib/export-import.ts
export function exportTournamentToFile(tournament: Tournament): void {
  const data = JSON.stringify(tournament, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tournament.settings.name || 'tournament'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importTournamentFromFile(file: File): Promise<Tournament> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        // Validate structure
        resolve(data as Tournament)
      } catch (e) {
        reject(new Error('Invalid tournament file'))
      }
    }
    reader.readAsText(file)
  })
}
```

1. Add export button that generates JSON file download
2. Add import button with file picker and validation
3. Handle data migration for older file formats

**Cost:** $0 - File APIs

---

#### 1.3.2 QR Code Sharing

**What it does:** Generate QR codes containing shareable tournament URLs.

**Why it's valuable:** Easy sharing at physical events.

**How to implement:**

```bash
npm install qrcode.react
```

```tsx
// In Step4Schedule.tsx
import { QRCodeSVG } from 'qrcode.react'

const shareUrl = `${window.location.origin}?tournament=${encodeURIComponent(tournamentId)}`

<QRCodeSVG value={shareUrl} size={200} />
```

1. Install qrcode.react package
2. Add QR code display button in schedule view
3. Generate URL with tournament data embedded or ID reference

**Cost:** $0 - Client-side generation

---

### 1.4 Advanced Scheduling Features

#### 1.4.1 Time Slot Preferences

**What it does:** Allow teams to specify unavailable time slots.

**Why it's valuable:** Real tournaments have constraints (teams arriving late, leaving early).

**How to implement:**

```typescript
// Add to src/lib/types.ts
export interface TeamConstraint {
  teamId: string
  unavailableSlots: { from: string; to: string }[]
  preferredPitches?: number[]
}
```

1. Add constraint input in team management step
2. Modify scheduler to respect constraints
3. Show warnings if constraints cause conflicts

**Cost:** $0 - Enhanced algorithm

---

#### 1.4.2 Referee/Volunteer Assignment

**What it does:** Assign referees to matches, optionally from team pool.

**Why it's valuable:** Youth tournaments often have parents as referees.

**How to implement:**

```typescript
// Add to src/lib/types.ts
export interface Referee {
  id: string
  name: string
  assignedToTeam?: string // Optional link to team
}

// Extend Match interface
export interface Match {
  // ... existing fields
  refereeId?: string
}
```

1. Add referee management section
2. Add "auto-assign referees" algorithm (team not playing = can referee)
3. Display referee assignments in schedule

**Cost:** $0 - Frontend logic

---

## 2. Backend API Options (Low-Cost)

These features require a backend but use **minimal or free-tier** infrastructure.

### 2.1 Azure Functions (Serverless) - Recommended

**Why Azure Functions:**

- Pay-per-execution (first 1 million executions free)
- No idle costs
- Already using Azure for static hosting
- Easy integration with Azure Static Web Apps

**Estimated Cost:** $0-5/month for small to medium usage

#### 2.1.1 Setup Instructions

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create functions project
func init api --typescript
cd api
func new --name tournament --template "HTTP trigger"
```

**Project structure:**

```
/api
  /tournament
    function.json
    index.ts
  host.json
  package.json
```

**Configure Static Web App for API:**

```json
// staticwebapp.config.json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ]
}
```

---

#### 2.1.2 Short URL Service

**What it does:** Generate short, shareable URLs for tournaments.

**Why it's valuable:** Current URLs with full tournament data are too long.

**Implementation:**

```typescript
// api/shorten/index.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { TableClient } from '@azure/data-tables'

const tableClient = TableClient.fromConnectionString(
  process.env.STORAGE_CONNECTION_STRING!,
  'shortUrls'
)

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  if (req.method === 'POST') {
    // Create short URL
    const { tournamentData } = req.body
    const shortId = generateShortId() // 6-char random string
    await tableClient.createEntity({
      partitionKey: 'urls',
      rowKey: shortId,
      data: JSON.stringify(tournamentData),
      createdAt: new Date().toISOString(),
    })
    context.res = { body: { shortUrl: `https://fodbold.kscloud.io/t/${shortId}` } }
  } else {
    // Retrieve tournament data
    const shortId = req.params.id
    const entity = await tableClient.getEntity('urls', shortId)
    context.res = { body: JSON.parse(entity.data as string) }
  }
}
```

**Cost breakdown:**

- Azure Table Storage: ~$0.045/GB/month (minimal for URL storage)
- Function executions: Free first 1M/month

---

#### 2.1.3 Anonymous Analytics

**What it does:** Track usage patterns without personal data.

**Why it's valuable:** Understand how the app is used to prioritize features.

**Implementation:**

```typescript
// api/analytics/index.ts
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest) {
  const event = req.body
  // Log to Table Storage or Application Insights (free tier)
  await tableClient.createEntity({
    partitionKey: new Date().toISOString().split('T')[0], // Daily partitions
    rowKey: uuidv4(),
    eventType: event.type, // 'tournament_created', 'schedule_generated', etc.
    teamCount: event.teamCount,
    timestamp: new Date().toISOString(),
  })
}
```

**Cost:** $0 with Azure Table Storage free tier (62,500 transactions/month free)

---

### 2.2 Alternative: Cloudflare Workers

**Why Cloudflare Workers:**

- 100,000 requests/day free
- Global edge deployment
- KV storage for simple data

**Estimated Cost:** $0 for most use cases

```javascript
// workers/shorten.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'POST') {
      const { tournamentData } = await request.json()
      const shortId = crypto.randomUUID().slice(0, 6)
      await env.TOURNAMENT_KV.put(shortId, JSON.stringify(tournamentData), {
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
      })
      return new Response(JSON.stringify({ shortUrl: `https://fodbold.kscloud.io/t/${shortId}` }))
    }
    // GET: retrieve
    const shortId = url.pathname.split('/').pop()
    const data = await env.TOURNAMENT_KV.get(shortId)
    return new Response(data)
  },
}
```

**Cost breakdown:**

- Workers Free: 100K requests/day
- KV Free: 100K reads/day, 1K writes/day, 1GB storage

---

### 2.3 Optional: Email Notifications

**What it does:** Send schedule to team contacts via email.

**Why it's valuable:** Distribute schedule without manual work.

**Implementation with Azure (using free SendGrid tier):**

```typescript
// api/send-schedule/index.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest) {
  const { emails, tournamentName, scheduleHtml } = req.body

  const msg = {
    to: emails,
    from: 'noreply@fodbold.kscloud.io',
    subject: `Kampprogram: ${tournamentName}`,
    html: scheduleHtml,
  }

  await sgMail.sendMultiple(msg)
  context.res = { status: 200, body: { sent: emails.length } }
}
```

**Cost:** SendGrid Free tier = 100 emails/day

---

## 3. Remote Storage Options

These options enable cross-device sync and collaboration without building a full backend.

### 3.1 Azure Blob Storage (Recommended)

**Why Azure Blob Storage:**

- Already using Azure ecosystem
- Static file storage is cheap
- Can use SAS tokens for secure access without auth
- Client-side SDK available

**Estimated Cost:** ~$0.02/GB/month storage + minimal transaction costs

#### 3.1.1 Implementation Approach: Public Anonymous Storage

For zero-auth experience, use anonymous blob containers with unique tournament IDs:

```typescript
// src/lib/cloud-storage.ts
import { BlobServiceClient } from '@azure/storage-blob'

const blobServiceClient = new BlobServiceClient(
  `https://${STORAGE_ACCOUNT}.blob.core.windows.net?${SAS_TOKEN}`
)

export async function saveTournamentToCloud(tournament: Tournament): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient('tournaments')
  const blobName = `${tournament.id}.json`
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.upload(JSON.stringify(tournament), JSON.stringify(tournament).length, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })

  return `https://${STORAGE_ACCOUNT}.blob.core.windows.net/tournaments/${blobName}`
}

export async function loadTournamentFromCloud(tournamentId: string): Promise<Tournament | null> {
  const containerClient = blobServiceClient.getContainerClient('tournaments')
  const blockBlobClient = containerClient.getBlockBlobClient(`${tournamentId}.json`)

  try {
    const response = await blockBlobClient.download()
    const text = await streamToText(response.readableStreamBody!)
    return JSON.parse(text)
  } catch {
    return null
  }
}
```

**Setup Instructions:**

1. Create Azure Storage account (LRS for lowest cost)
2. Create container "tournaments" with public access
3. Generate SAS token with write permission (no expiry or long expiry)
4. Store SAS token in environment variable (safe for client since data is public anyway)

**Cost breakdown:**

- Storage: $0.0184/GB/month (Hot tier)
- Write operations: $0.05 per 10,000
- Read operations: $0.004 per 10,000

For 10,000 tournaments (~10MB): ~$0.02/month

---

### 3.2 Alternative: Firebase Realtime Database

**Why Firebase:**

- Generous free tier (1GB storage, 10GB transfer)
- Real-time sync built-in
- No backend code needed

**Implementation:**

```bash
npm install firebase
```

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIza...',
  databaseURL: 'https://football-tournament.firebaseio.com',
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export async function saveTournament(tournament: Tournament): Promise<void> {
  await set(ref(db, `tournaments/${tournament.id}`), tournament)
}

export async function loadTournament(id: string): Promise<Tournament | null> {
  const snapshot = await get(ref(db, `tournaments/${id}`))
  return snapshot.exists() ? snapshot.val() : null
}
```

**Security Rules (public write with ID-based access):**

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Cost:** Free tier covers most usage (1GB storage, 10GB/month bandwidth)

---

### 3.3 Alternative: Supabase

**Why Supabase:**

- PostgreSQL database with REST API
- 500MB storage free
- Built-in auth if needed later
- Open source

**Implementation:**

```bash
npm install @supabase/supabase-js
```

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xxx.supabase.co',
  'public-anon-key' // Safe for client-side, controlled by Row Level Security
)

export async function saveTournament(tournament: Tournament): Promise<void> {
  await supabase.from('tournaments').upsert({
    id: tournament.id,
    data: tournament,
    updated_at: new Date().toISOString(),
  })
}

export async function loadTournament(id: string): Promise<Tournament | null> {
  const { data } = await supabase.from('tournaments').select('data').eq('id', id).single()
  return data?.data || null
}
```

**Cost:** Free tier = 500MB database, 2GB bandwidth

---

### 3.4 Hybrid Approach: localStorage + Optional Cloud Sync

**What it does:** Keep localStorage as primary, add optional cloud backup.

**Why it's valuable:** Zero friction for casual users, power feature for organizers.

**Implementation:**

```typescript
// src/hooks/useTournamentStorage.ts
import { useLocalStorage } from './useLocalStorage'
import { saveTournamentToCloud, loadTournamentFromCloud } from '@/lib/cloud-storage'

export function useTournamentStorage() {
  const [tournaments, setTournaments] = useLocalStorage<Tournament[]>('tournaments', [])
  const [cloudEnabled, setCloudEnabled] = useLocalStorage('cloudSyncEnabled', false)

  const saveTournament = async (tournament: Tournament) => {
    // Always save to localStorage
    setTournaments(prev => {
      const existing = prev.findIndex(t => t.id === tournament.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = tournament
        return updated
      }
      return [...prev, tournament]
    })

    // Optionally sync to cloud
    if (cloudEnabled) {
      await saveTournamentToCloud(tournament)
    }
  }

  const loadFromCloud = async (id: string): Promise<Tournament | null> => {
    const cloudTournament = await loadTournamentFromCloud(id)
    if (cloudTournament) {
      // Merge with local storage
      setTournaments(prev => {
        const existing = prev.findIndex(t => t.id === id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = cloudTournament
          return updated
        }
        return [...prev, cloudTournament]
      })
    }
    return cloudTournament
  }

  return { tournaments, saveTournament, loadFromCloud, cloudEnabled, setCloudEnabled }
}
```

---

## 4. Implementation Priorities

### Phase 1: Frontend-Only (No Additional Cost)

Recommended order based on impact vs. effort:

| Priority | Feature                          | Effort | Impact |
| -------- | -------------------------------- | ------ | ------ |
| 1        | Dark Mode                        | Low    | Medium |
| 2        | Tournament Backup/Restore (JSON) | Low    | High   |
| 3        | Match Results Tracking           | Medium | High   |
| 4        | Tournament Templates             | Low    | Medium |
| 5        | Multi-Language (i18n)            | Medium | High   |
| 6        | Team Groups/Pools                | Medium | Medium |
| 7        | Knockout Rounds                  | High   | Medium |

### Phase 2: Add Backend (Minimal Cost: $0-5/month)

| Priority | Feature             | Effort | Impact |
| -------- | ------------------- | ------ | ------ |
| 1        | Short URL Service   | Low    | High   |
| 2        | Anonymous Analytics | Low    | Low    |
| 3        | Email Notifications | Medium | Medium |

### Phase 3: Add Remote Storage ($0-2/month)

| Priority | Feature                   | Effort | Impact |
| -------- | ------------------------- | ------ | ------ |
| 1        | Cloud Backup (Azure Blob) | Medium | High   |
| 2        | Cross-Device Sync         | Medium | Medium |
| 3        | Real-time Collaboration   | High   | Medium |

---

## Cost Summary

| Configuration         | Monthly Cost | Features Enabled             |
| --------------------- | ------------ | ---------------------------- |
| Current (Static Only) | $0           | All frontend features        |
| + Azure Functions     | $0-5         | Short URLs, analytics, email |
| + Azure Blob Storage  | $0-2         | Cloud backup, sharing        |
| + Full Backend        | $5-15        | All features                 |

**Recommendation:** Start with Phase 1 (frontend-only) features as they provide significant value at zero cost. Add Azure Functions for short URLs when URL length becomes a user pain point. Add cloud storage only if cross-device sync is requested.
