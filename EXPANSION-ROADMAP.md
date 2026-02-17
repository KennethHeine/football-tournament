# Football Tournament App - Expansion Roadmap

This document outlines potential features and enhancements for the Football Tournament app, organized by infrastructure requirements. All suggestions prioritize **minimal running costs** while maximizing value.

## Table of Contents

1. [Frontend-Only Enhancements](#1-frontend-only-enhancements-current-architecture)
2. [Backend API Options](#2-backend-api-options-low-cost)
3. [Remote Storage Options](#3-remote-storage-options)
4. [User Identity Without Account Creation](#4-user-identity-without-account-creation)
5. [Secure Sharing Without Backend](#5-secure-sharing-without-backend)
6. [Implementation Priorities](#6-implementation-priorities)

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

## 4. User Identity Without Account Creation

If adding backend or storage features, you need to identify users without requiring them to create accounts in your app. Here are low-friction options:

### 4.1 Social/OAuth Login (Recommended)

**What it does:** Let users sign in with existing accounts (Google, Microsoft, GitHub, etc.).

**Why it's valuable:**

- Users don't create new passwords
- No email verification needed
- Trusted identity providers handle security
- One-click sign-in experience

#### 4.1.1 Azure Static Web Apps Built-in Auth (Easiest)

Azure Static Web Apps provides built-in authentication with zero configuration:

```json
// staticwebapp.config.json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/common/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

**Login URLs (no code required):**

- Microsoft: `/.auth/login/aad`
- GitHub: `/.auth/login/github`
- Google: `/.auth/login/google`

**Get user info:**

```typescript
// src/lib/auth.ts
export interface AuthUser {
  userId: string
  userDetails: string // email or username
  identityProvider: 'aad' | 'github' | 'google'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/.auth/me')
    const { clientPrincipal } = await response.json()
    return clientPrincipal as AuthUser | null
  } catch {
    return null
  }
}

export function loginWithProvider(provider: 'aad' | 'github' | 'google') {
  window.location.href = `/.auth/login/${provider}?post_login_redirect_uri=${window.location.pathname}`
}

export function logout() {
  window.location.href = '/.auth/logout'
}
```

**Cost:** $0 - Included with Azure Static Web Apps

---

#### 4.1.2 Firebase Authentication

If using Firebase for storage, use Firebase Auth:

```bash
npm install firebase
```

```typescript
// src/lib/firebase-auth.ts
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signInWithGitHub(): Promise<User> {
  const provider = new GithubAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export function onUserChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null
}
```

**Cost:** Free for up to 10,000 monthly active users

---

#### 4.1.3 Supabase Auth

If using Supabase for storage:

```typescript
// src/lib/supabase-auth.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signInWithGitHub() {
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin },
  })
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}
```

**Cost:** Free tier includes unlimited auth users

---

### 4.2 Anonymous Device-Based Identity

**What it does:** Generate a unique ID per device without any login.

**Why it's valuable:**

- Zero friction for users
- Works for read-only sharing
- No account needed for basic features

**Implementation:**

```typescript
// src/lib/device-identity.ts
import { useLocalStorage } from '@/hooks/useLocalStorage'

function generateDeviceId(): string {
  return 'dev_' + crypto.randomUUID()
}

export function useDeviceIdentity() {
  const [deviceId] = useLocalStorage<string>('deviceId', generateDeviceId())
  return deviceId
}

// Use device ID to claim ownership of tournaments
export interface Tournament {
  // ... existing fields
  ownerId?: string // Device ID or authenticated user ID
  isPublic?: boolean // Whether others can view
}
```

**Hybrid approach:** Start anonymous, upgrade to authenticated:

```typescript
// src/hooks/useIdentity.ts
export function useIdentity() {
  const deviceId = useDeviceIdentity()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    getCurrentUser().then(setAuthUser)
  }, [])

  return {
    userId: authUser?.userId || deviceId,
    isAuthenticated: !!authUser,
    displayName: authUser?.userDetails || 'Anonymous',
    login: loginWithProvider,
    logout,
  }
}
```

**Cost:** $0 - Pure frontend

---

### 4.3 Comparison: Identity Options

| Method                       | Friction  | Security   | Cross-Device | Cost |
| ---------------------------- | --------- | ---------- | ------------ | ---- |
| Anonymous (Device ID)        | None      | Low        | No           | $0   |
| Azure SWA Built-in Auth      | One click | High       | Yes          | $0   |
| Firebase Auth                | One click | High       | Yes          | $0   |
| Supabase Auth                | One click | High       | Yes          | $0   |
| Anonymous + Optional Upgrade | None/Low  | Low → High | Optional     | $0   |

**Recommendation:** Start with Anonymous Device ID for zero friction, add social login buttons as an optional upgrade path for users who want cross-device sync.

---

## 5. Secure Sharing Without Backend

You can enable tournament sharing directly from the frontend to cloud storage without building a backend API.

### 5.1 Firebase Realtime Database (Direct Client Access)

**How it works:** Client writes directly to Firebase with security rules controlling access.

**Setup:**

1. Create Firebase project at console.firebase.google.com
2. Enable Realtime Database
3. Configure security rules for public read, owner-only write

**Security Rules:**

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        // Anyone can read public tournaments
        ".read": "data.child('isPublic').val() === true",
        // Only the owner can write
        ".write": "!data.exists() || data.child('ownerId').val() === auth.uid || data.child('ownerId').val() === null"
      }
    },
    "shared": {
      // Public read-only shares (for anonymous sharing)
      "$shareId": {
        ".read": true,
        ".write": "!data.exists()" // Write once, then read-only
      }
    }
  }
}
```

**Implementation:**

```typescript
// src/lib/firebase-sharing.ts
import { getDatabase, ref, set, get, push } from 'firebase/database'

const db = getDatabase()

// Create a read-only share link (no auth required)
export async function createShareLink(tournament: Tournament): Promise<string> {
  const shareRef = push(ref(db, 'shared'))
  const shareId = shareRef.key!

  // Store a snapshot - this is read-only after creation
  await set(shareRef, {
    tournament: tournament,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  })

  return `${window.location.origin}/share/${shareId}`
}

// Load a shared tournament
export async function loadSharedTournament(shareId: string): Promise<Tournament | null> {
  const snapshot = await get(ref(db, `shared/${shareId}`))
  if (!snapshot.exists()) return null

  const data = snapshot.val()
  if (new Date(data.expiresAt) < new Date()) return null // Expired

  return data.tournament
}
```

**Cost:** Free tier = 1GB storage, 10GB/month bandwidth

---

### 5.2 Supabase Direct Client Access

**How it works:** Client writes directly to Supabase with Row Level Security (RLS).

**Database Schema:**

```sql
-- Create shared_tournaments table
CREATE TABLE shared_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  owner_device_id TEXT,
  view_count INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE shared_tournaments ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY public_read ON shared_tournaments
  FOR SELECT USING (expires_at > NOW());

-- Anyone can insert (with device ID tracking)
CREATE POLICY anyone_can_share ON shared_tournaments
  FOR INSERT WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_shared_tournaments_expires ON shared_tournaments(expires_at);
```

**Implementation:**

```typescript
// src/lib/supabase-sharing.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function createShareLink(tournament: Tournament, deviceId: string): Promise<string> {
  const { data, error } = await supabase
    .from('shared_tournaments')
    .insert({
      tournament_data: tournament,
      owner_device_id: deviceId,
    })
    .select('id')
    .single()

  if (error) throw error
  return `${window.location.origin}/share/${data.id}`
}

export async function loadSharedTournament(shareId: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('shared_tournaments')
    .select('tournament_data')
    .eq('id', shareId)
    .single()

  if (error || !data) return null
  return data.tournament_data as Tournament
}
```

**Cost:** Free tier = 500MB storage, 2GB bandwidth

---

### 5.3 Azure Blob Storage with SAS Tokens

**How it works:** Generate time-limited upload URLs from a minimal Azure Function, but reads are public.

**Option A: Fully Anonymous (Public Container)**

```typescript
// Frontend - direct upload to public container
export async function uploadTournament(tournament: Tournament): Promise<string> {
  const shareId = crypto.randomUUID()
  const url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/shared/${shareId}.json?${SAS_TOKEN}`

  await fetch(url, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tournament),
  })

  return `${window.location.origin}/share/${shareId}`
}

// Frontend - read (no auth needed)
export async function loadSharedTournament(shareId: string): Promise<Tournament | null> {
  const url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/shared/${shareId}.json`
  const response = await fetch(url)
  if (!response.ok) return null
  return response.json()
}
```

**Option B: Secure Upload via Azure Function**

```typescript
// api/generate-upload-url/index.ts (Azure Function)
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob'

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const shareId = crypto.randomUUID()
  const blobName = `${shareId}.json`

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.STORAGE_CONNECTION_STRING!
  )
  const containerClient = blobServiceClient.getContainerClient('shared')
  const blobClient = containerClient.getBlobClient(blobName)

  // Generate SAS token valid for 5 minutes (upload window)
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: 'shared',
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // Create and Write
      expiresOn: new Date(Date.now() + 5 * 60 * 1000),
    },
    blobServiceClient.credential!
  ).toString()

  context.res = {
    body: {
      uploadUrl: `${blobClient.url}?${sasToken}`,
      shareUrl: `${req.headers['origin']}/share/${shareId}`,
    },
  }
}
```

**Cost:** ~$0.02/GB storage + minimal transaction costs

---

### 5.4 Client-Side Encryption for Sensitive Data

For extra security, encrypt tournament data before storing:

```typescript
// src/lib/encryption.ts

// Generate a random encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

// Export key as URL-safe string
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

// Import key from URL-safe string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

// Encrypt data
export async function encrypt(data: object, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

// Decrypt data
export async function decrypt(encryptedString: string, key: CryptoKey): Promise<object> {
  const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return JSON.parse(new TextDecoder().decode(decrypted))
}
```

**Usage with encrypted sharing:**

```typescript
// Create encrypted share link
export async function createEncryptedShare(tournament: Tournament): Promise<string> {
  const key = await generateEncryptionKey()
  const keyString = await exportKey(key)
  const encryptedData = await encrypt(tournament, key)

  // Store encrypted data in cloud
  const shareId = await uploadEncryptedData(encryptedData)

  // Key is in the URL fragment (never sent to server)
  return `${window.location.origin}/share/${shareId}#key=${keyString}`
}

// Load encrypted share
export async function loadEncryptedShare(shareId: string, keyString: string): Promise<Tournament> {
  const encryptedData = await downloadEncryptedData(shareId)
  const key = await importKey(keyString)
  return (await decrypt(encryptedData, key)) as Tournament
}
```

**Security benefits:**

- Data is encrypted before leaving the browser
- Key is in URL fragment (never sent to server)
- Even if storage is compromised, data is unreadable
- No backend needed for encryption

**Cost:** $0 - Uses Web Crypto API (built into browsers)

---

### 5.5 Comparison: Sharing Without Backend

| Method                  | Auth Required | Security | Setup Complexity | Cost |
| ----------------------- | ------------- | -------- | ---------------- | ---- |
| Firebase Direct         | No            | Medium   | Low              | $0   |
| Supabase Direct         | No            | Medium   | Low              | $0   |
| Azure Blob (Public SAS) | No            | Low      | Medium           | $0-2 |
| Azure Blob + Function   | No            | Medium   | Medium           | $0-5 |
| Any + Client Encryption | No            | High     | Medium           | $0   |

**Recommendation:**

1. For simplest setup: Use Firebase or Supabase with security rules
2. For maximum security: Add client-side encryption with key in URL fragment
3. For Azure ecosystem: Use Azure Blob with a minimal Function for upload URLs

---

## 6. Implementation Priorities

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

### Phase 2: Secure Sharing Without Backend ($0)

| Priority | Feature                        | Effort | Impact |
| -------- | ------------------------------ | ------ | ------ |
| 1        | Firebase/Supabase Direct Share | Low    | High   |
| 2        | Client-Side Encryption         | Medium | Medium |
| 3        | Anonymous Device Identity      | Low    | Medium |

### Phase 3: Add User Identity ($0)

| Priority | Feature                      | Effort | Impact |
| -------- | ---------------------------- | ------ | ------ |
| 1        | Azure SWA Built-in Auth      | Low    | High   |
| 2        | Social Login (Google/GitHub) | Low    | High   |
| 3        | Anonymous + Upgrade Path     | Medium | Medium |

### Phase 4: Add Backend (Minimal Cost: $0-5/month)

| Priority | Feature             | Effort | Impact |
| -------- | ------------------- | ------ | ------ |
| 1        | Short URL Service   | Low    | High   |
| 2        | Anonymous Analytics | Low    | Low    |
| 3        | Email Notifications | Medium | Medium |

### Phase 5: Add Remote Storage ($0-2/month)

| Priority | Feature                   | Effort | Impact |
| -------- | ------------------------- | ------ | ------ |
| 1        | Cloud Backup (Azure Blob) | Medium | High   |
| 2        | Cross-Device Sync         | Medium | Medium |
| 3        | Real-time Collaboration   | High   | Medium |

---

## Cost Summary

| Configuration          | Monthly Cost | Features Enabled                       |
| ---------------------- | ------------ | -------------------------------------- |
| Current (Static Only)  | $0           | All frontend features                  |
| + Direct Cloud Sharing | $0           | Firebase/Supabase sharing              |
| + Social Login         | $0           | User identity via OAuth                |
| + Azure Functions      | $0-5         | Short URLs, analytics, email           |
| + Azure Blob Storage   | $0-2         | Cloud backup, cross-device sync        |
| + Full Backend + Auth  | $5-15        | All features with complete user system |

**Recommendation:**

1. Start with Phase 1 (frontend-only) features as they provide significant value at zero cost
2. Add Phase 2 (secure sharing) using Firebase or Supabase for free cloud sharing without needing a backend
3. Add Phase 3 (user identity) using Azure SWA built-in auth or social login when users want cross-device access
4. Add Phase 4 (backend) for short URLs only when URL length becomes a user pain point
5. Add Phase 5 (remote storage) when cross-device sync is explicitly requested
