# Football Tournament Application - Comprehensive Review

**Date:** January 20, 2026  
**Reviewer:** GitHub Copilot Agent  
**Repository:** KennethHeine/football-tournament

---

## Table of Contents

1. [Project Understanding](#1-project-understanding)
2. [Architecture & Code Quality Review](#2-architecture--code-quality-review)
3. [Correctness & Edge Cases](#3-correctness--edge-cases)
4. [Testing Strategy](#4-testing-strategy)
5. [Security Review](#5-security-review)
6. [Performance & Scalability](#6-performance--scalability)
7. [DevEx & Operations](#7-devex--operations)

---

## 1. Project Understanding

### What the App Does

The Football Tournament Program Builder is a client-side web application designed to help tournament organizers create detailed match schedules across multiple pitches. It automates the complex task of scheduling matches while preventing conflicts and optimizing rest times between games.

### Primary User Flows

1. **Create New Tournament**
   - User clicks "Opret Ny Turnering" (Create New Tournament)
   - Step 1: Configure tournament settings (name, date, time, pitches, match duration)
   - Step 2: Add teams (individually or bulk paste)
   - Step 3: Select scheduling mode (round-robin or limited matches)
   - Step 4: View generated schedule, export, print, or save

2. **Manage Saved Tournaments**
   - Load existing tournaments from localStorage
   - Copy tournaments to create variations
   - Delete unwanted tournaments

3. **Export/Share Schedule**
   - Export to CSV for spreadsheet integration
   - Export as PNG image for sharing
   - Copy formatted text to clipboard
   - Print directly from browser

### Main Components/Modules

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Main application orchestrator, state management, wizard navigation |
| `Step1TournamentSettings.tsx` | Tournament configuration form with Zod validation |
| `Step2Teams.tsx` | Team management (add, bulk import, remove) |
| `Step3SchedulingMode.tsx` | Scheduling mode selection (round-robin vs limited) |
| `Step4Schedule.tsx` | Schedule display, filtering, export functionality |
| `scheduler.ts` | Core scheduling algorithm (round-robin, conflict detection) |
| `color-utils.ts` | OKLCH to RGB/HEX color conversion for image export |
| `useLocalStorage.ts` | Custom hook for persistent browser storage |

### Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.2.3 |
| **Language** | TypeScript | 5.9.3 |
| **Build Tool** | Vite | 7.3.1 |
| **Styling** | Tailwind CSS | 4.1.18 |
| **UI Components** | Radix UI + Shadcn | Various |
| **Form Validation** | Zod + React Hook Form | 4.3.5 / 7.71.1 |
| **Unit Testing** | Vitest | 4.0.17 |
| **E2E Testing** | Playwright | 1.57.0 |
| **Deployment** | Azure Static Web Apps | - |

### Runtime Assumptions

- Modern browser with localStorage support
- JavaScript enabled
- No backend/API required
- No authentication needed
- Static file hosting only

---

## 2. Architecture & Code Quality Review

### Strengths ✅

1. **Clear Separation of Concerns**
   - Business logic in `/lib` (scheduler, types)
   - UI components in `/components`
   - Hooks in `/hooks`
   - Well-structured wizard pattern

2. **Type Safety**
   - Comprehensive TypeScript types in `types.ts`
   - Zod validation schemas for forms
   - Strict null checks enabled

3. **Modern React Patterns**
   - Functional components with hooks
   - Custom hooks for reusable logic
   - useCallback/useMemo for optimization

4. **Good Naming Conventions**
   - Descriptive function names (`generateRoundRobinMatches`, `detectConflicts`)
   - Clear component names following Step pattern
   - Consistent Danish UI labels

### Areas for Improvement ⚠️

### Top 10 Highest-Impact Refactors

#### 1. **Extract Tournament Context** (High Impact)
**Current:** Tournament state scattered across multiple `useState` calls in `App.tsx`  
**Problem:** 500+ line App component with prop drilling through steps  
**Recommendation:** Create a `TournamentContext` provider

```typescript
// src/context/TournamentContext.tsx
interface TournamentContextType {
  tournament: Tournament | null;
  settings: TournamentSettings;
  teams: Team[];
  schedule: GeneratedSchedule | null;
  updateSettings: (settings: TournamentSettings) => void;
  // ... other methods
}
```

#### 2. **Separate URL Routing from State** (High Impact)
**Current:** Manual URL manipulation with `window.history.pushState` in App.tsx  
**Problem:** Duplicated hydration logic, fragile popstate handling  
**Recommendation:** Use a lightweight router (TanStack Router or Wouter)

```typescript
// Clean URL-based routing
const routes = {
  '/': HomePage,
  '/tournament/:id/step/:step': TournamentWizard,
}
```

#### 3. **Extract Schedule Rehydration Logic** (Medium Impact)
**Current:** Date rehydration repeated 4 times in App.tsx (lines 84-100, 136-152, 236-252)  
**Duplicate Code:**

```typescript
// This pattern appears 4 times
const rehydratedSchedule: GeneratedSchedule = {
  ...tournament.schedule,
  matches: tournament.schedule.matches.map(match => ({
    ...match,
    startTime: new Date(match.startTime),
    endTime: new Date(match.endTime)
  })),
  conflicts: tournament.schedule.conflicts.map(conflict => ({...}))
}
```

**Recommendation:** Extract to utility function

```typescript
// src/lib/tournament-utils.ts
export function rehydrateSchedule(schedule: SerializedSchedule): GeneratedSchedule
```

#### 4. **Improve Scheduler Algorithm Testability** (Medium Impact)
**Current:** `assignTimeSlots` function is private and tightly coupled  
**Problem:** Hard to test time slot assignment in isolation  
**Recommendation:** Export helper functions, use dependency injection for date handling

#### 5. **Split Step4Schedule Component** (Medium Impact)
**Current:** 507-line component handling display, filtering, and multiple export formats  
**Problem:** Too many responsibilities, hard to maintain  
**Recommendation:** Extract into smaller components:
- `ScheduleTable.tsx` - Table display
- `ScheduleFilters.tsx` - Search and filters
- `ExportButtons.tsx` - Export functionality
- `TeamScheduleView.tsx` - Team-specific view

#### 6. **Create Shared Form Components** (Low-Medium Impact)
**Current:** Repetitive form field patterns across Step components  
**Recommendation:** Create reusable form field components

```typescript
// src/components/forms/NumberField.tsx
export function NumberField({ name, label, min, max, error, hint }: Props)
```

#### 7. **Improve Error Handling** (Medium Impact)
**Current:** Basic try-catch with console.error in useLocalStorage  
**Problem:** Silent failures, no error boundaries except at root  
**Recommendation:** 
- Add ErrorBoundary around each step
- Implement toast notifications for errors
- Add Sentry or similar for production error tracking

#### 8. **Implement Match Duration Type Safety** (Low Impact)
**Current:** Match duration calculation relies on optional fields with fallbacks  
**Problem:** `settings.matchDurationMinutes || 30` pattern repeated  
**Recommendation:** Use discriminated union types

```typescript
type MatchMode = 
  | { type: 'full-time'; duration: number }
  | { type: 'two-halves'; halfDuration: number; breakDuration: number }
```

#### 9. **Extract Constants** (Low Impact)
**Current:** Magic numbers scattered throughout code  
**Examples:**
- `100` for large tournament warning threshold
- `5` for minimum match duration
- `3` for minimum half duration

**Recommendation:** Create constants file

```typescript
// src/lib/constants.ts
export const SCHEDULER = {
  LARGE_TOURNAMENT_THRESHOLD: 100,
  MIN_MATCH_DURATION: 5,
  MIN_HALF_DURATION: 3,
} as const
```

#### 10. **Add Input Sanitization** (Low-Medium Impact)
**Current:** Team names stored as-is from user input  
**Problem:** Potential for XSS if data is rendered without escaping  
**Recommendation:** Sanitize team names on input

```typescript
const sanitizeTeamName = (name: string) => 
  name.trim().replace(/[<>]/g, '').slice(0, 100)
```

### Code Smells Identified

| Issue | Location | Severity |
|-------|----------|----------|
| God Component | `App.tsx` (486 lines) | High |
| Duplicate Code | Date rehydration (4 occurrences) | Medium |
| Magic Numbers | `scheduler.ts`, `Step1TournamentSettings.tsx` | Low |
| Long Method | `handleExportImage` (147 lines) | Medium |
| Feature Envy | Image export logic accesses many component states | Low |

---

## 3. Correctness & Edge Cases

### Likely Bugs

#### 1. **Round-Robin Match Count for Odd Teams**
**Location:** `scheduler.ts` lines 48-91  
**Issue:** When adding a BYE team for odd team counts, the round calculation uses `n-1` rounds where `n` is the padded (even) count. This is correct, but the warning message says "BYE team added" which may confuse users.

**Edge Case:** 3 teams should produce 3 matches, which works correctly.

#### 2. **Limited Matches Algorithm Infinite Loop Risk**
**Location:** `scheduler.ts` lines 93-174  
**Issue:** The `while` loop has `maxAttempts = targetMatches * 10` as a safety valve, but this could still take a long time for large tournaments with unusual constraints.

**Problematic Case:**
```typescript
// 100 teams, 2 matches per team, but all pairs have been used
// Algorithm will spin for 1000 iterations doing nothing useful
```

#### 3. **Date Parsing Vulnerability**
**Location:** `scheduler.ts` line 179  
**Issue:** Date construction assumes valid format but doesn't validate

```typescript
const startDateTime = new Date(`${settings.startDate}T${settings.startTime}`)
// If startDate or startTime is malformed, this creates Invalid Date
```

**Fix:**
```typescript
const startDateTime = new Date(`${settings.startDate}T${settings.startTime}`)
if (isNaN(startDateTime.getTime())) {
  throw new Error('Invalid tournament start date/time')
}
```

#### 4. **Pitch Index Off-by-One Confusion**
**Location:** `scheduler.ts`  
**Issue:** Pitches are 1-indexed externally but 0-indexed internally, creating confusion:
- `match.pitch` stores 1-indexed value
- `pitchSchedules` array uses 0-indexed access
- `getPitchName(match.pitch, settings)` expects 1-indexed

This works but is error-prone for future modifications.

### Risky Assumptions

1. **Browser Storage Availability**
   - Assumes localStorage is available and not full
   - No fallback for private browsing mode where localStorage may be limited

2. **Date Locale Handling**
   - Time formatting uses `'en-GB'` locale hardcoded
   - Date parsing assumes ISO format

3. **Team Name Uniqueness**
   - Case-insensitive comparison but no normalization of special characters

4. **Pitch Count Validation**
   - No maximum limit on pitches (could create UI issues with 100+ pitches)

### Edge Cases That May Fail

| Edge Case | Expected Behavior | Actual Behavior | Risk |
|-----------|-------------------|-----------------|------|
| 1 team only | Error message | Form validation blocks | ✅ OK |
| 2 teams, odd mode | Should work | Works correctly | ✅ OK |
| 100+ teams | Performance warning | Shows warning, may be slow | ⚠️ Medium |
| Special characters in team names | Handle gracefully | May cause issues in CSV export | ⚠️ Medium |
| Very long team names (500+ chars) | Truncate or warn | No limit enforced | ⚠️ Medium |
| Empty localStorage | Show empty state | Works correctly | ✅ OK |
| Corrupted localStorage | Graceful fallback | Falls back to initial value | ✅ OK |
| Same team added twice | Block with error | Shows inline error | ✅ OK |
| 0 minute break between matches | Allow or warn | Allowed, no warning | ⚠️ Low |
| Past date selection | May want to warn | Allowed with min=today | ✅ OK |
| Duplicate pitch names | Allow | Allowed, may confuse | ⚠️ Low |

---

## 4. Testing Strategy

### Current Test Coverage

| Area | Tests | Coverage | Quality |
|------|-------|----------|---------|
| **Scheduler Logic** | 13 tests | Good | ⭐⭐⭐⭐ |
| **Color Utilities** | 19 tests | Excellent | ⭐⭐⭐⭐⭐ |
| **useLocalStorage Hook** | 8 tests | Good | ⭐⭐⭐⭐ |
| **E2E Flows** | 9 tests | Moderate | ⭐⭐⭐ |
| **Component Unit Tests** | 0 tests | None | ❌ |
| **Form Validation** | 0 tests | None | ❌ |

### Test Gaps

1. **No Component Tests**
   - Step components not tested
   - Stepper component not tested
   - UI interactions not tested in isolation

2. **Limited Edge Case Coverage**
   - No tests for very large tournaments (50+ teams)
   - No tests for special characters in input
   - No tests for localStorage quota exceeded

3. **Missing Integration Tests**
   - No tests for tournament persistence flow
   - No tests for URL-based navigation

### Proposed Test Plan

#### Unit Tests (Priority: High)

1. **Component Tests with React Testing Library**
   - Test Step1TournamentSettings form validation
   - Test Step2Teams add/remove/bulk operations
   - Test Step3SchedulingMode calculations
   - Test Stepper navigation states

2. **Scheduler Edge Cases**
   - Large tournament performance
   - Duplicate match detection
   - Time overlap detection

#### Integration Tests (Priority: Medium)

1. **Full Wizard Flow**
   - Create tournament → Generate schedule → Save
   - Load saved tournament → Modify → Regenerate

2. **Export Functionality**
   - CSV export format verification
   - Image export (mock html2canvas)

#### E2E Tests (Priority: High)

1. **Cross-browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Mobile viewports

2. **PWA Functionality**
   - Offline mode
   - Service worker updates

### 10 Concrete Test Cases

#### Test Case 1: Round-Robin with Odd Teams
```typescript
describe('Scheduler: Odd Team Count', () => {
  it('should generate correct matches for 5 teams', () => {
    const teams = createTeams(5)
    const schedule = generateSchedule(defaultSettings, teams, { mode: 'round-robin' })
    
    // Expected: 5 choose 2 = 10 matches
    expect(schedule.matches.length).toBe(10)
    expect(schedule.warnings).toContain(expect.stringContaining('BYE'))
    
    // Each team should play exactly 4 matches
    const matchCounts = countMatchesPerTeam(schedule.matches)
    teams.forEach(team => {
      expect(matchCounts.get(team.id)).toBe(4)
    })
  })
})
```

#### Test Case 2: Limited Matches Constraint
```typescript
it('should not exceed max matches per team', () => {
  const teams = createTeams(10)
  const config = { mode: 'limited-matches', maxMatchesPerTeam: 3 }
  const schedule = generateSchedule(defaultSettings, teams, config)
  
  const matchCounts = countMatchesPerTeam(schedule.matches)
  matchCounts.forEach(count => {
    expect(count).toBeLessThanOrEqual(3)
  })
})
```

#### Test Case 3: Conflict Detection
```typescript
it('should detect simultaneous team bookings', () => {
  // Manually create overlapping matches
  const matches = [
    createMatch('A', 'B', '09:00', '09:30', 1),
    createMatch('A', 'C', '09:00', '09:30', 2),
  ]
  
  const conflicts = detectConflicts(matches)
  expect(conflicts.length).toBe(1)
  expect(conflicts[0].team.name).toBe('A')
})
```

#### Test Case 4: Form Validation
```typescript
describe('Step1TournamentSettings', () => {
  it('should require start date and time', async () => {
    render(<Step1TournamentSettings {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /næste/i }))
    
    expect(await screen.findByText(/startdato er påkrævet/i)).toBeInTheDocument()
    expect(defaultProps.onNext).not.toHaveBeenCalled()
  })
})
```

#### Test Case 5: Team Name Uniqueness
```typescript
describe('Step2Teams', () => {
  it('should prevent duplicate team names case-insensitively', async () => {
    render(<Step2Teams initialTeams={[{ id: '1', name: 'Arsenal' }]} {...props} />)
    
    fireEvent.change(screen.getByLabelText(/holdnavn/i), { target: { value: 'ARSENAL' } })
    fireEvent.click(screen.getByRole('button', { name: /tilføj/i }))
    
    expect(screen.getByText(/eksisterer allerede/i)).toBeInTheDocument()
  })
})
```

#### Test Case 6: Bulk Team Import
```typescript
it('should parse bulk text correctly', async () => {
  render(<Step2Teams initialTeams={[]} {...props} />)
  
  const bulkText = 'Team A\nTeam B\n\nTeam C\n   Team D   '
  fireEvent.change(screen.getByLabelText(/samlet/i), { target: { value: bulkText } })
  fireEvent.click(screen.getByRole('button', { name: /tilføj alle/i }))
  
  expect(screen.getByText('Team A')).toBeInTheDocument()
  expect(screen.getByText('Team B')).toBeInTheDocument()
  expect(screen.getByText('Team C')).toBeInTheDocument()
  expect(screen.getByText('Team D')).toBeInTheDocument()
})
```

#### Test Case 7: CSV Export Format
```typescript
describe('exportToCSV', () => {
  it('should handle team names with commas', () => {
    const matches = [
      createMatch('FC "Copenhagen"', 'Team, with comma', '09:00', '09:30', 1)
    ]
    
    const csv = exportToCSV(matches, defaultSettings)
    
    // Should properly escape or quote fields
    expect(csv).toContain('FC "Copenhagen"')
    expect(csv).toContain('Team, with comma')
  })
})
```

#### Test Case 8: localStorage Quota Exceeded
```typescript
describe('useLocalStorage', () => {
  it('should handle quota exceeded error', () => {
    const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
    mockSetItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    
    const { result } = renderHook(() => useLocalStorage('key', 'initial'))
    
    act(() => {
      result.current[1]('new value')
    })
    
    // Should not crash, should log error
    expect(console.error).toHaveBeenCalled()
  })
})
```

#### Test Case 9: URL State Restoration
```typescript
describe('App URL Navigation', () => {
  it('should restore state from URL on page load', async () => {
    // Prepopulate localStorage
    localStorage.setItem('tournaments', JSON.stringify([mockTournament]))
    
    // Navigate to specific step
    window.history.pushState({}, '', '?tournament=123&step=3')
    
    render(<App />)
    
    expect(screen.getByText(/planlægningstilstand/i)).toBeInTheDocument()
  })
})
```

#### Test Case 10: Large Tournament Performance
```typescript
describe('Performance', () => {
  it('should generate schedule for 20 teams in under 1 second', () => {
    const teams = createTeams(20)
    
    const start = performance.now()
    const schedule = generateSchedule(defaultSettings, teams, { mode: 'round-robin' })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(1000)
    expect(schedule.matches.length).toBe(190) // 20 choose 2
  })
})
```

### Test Quality Improvements

1. **Add Test Coverage Reporting**
   ```json
   // vitest.config.ts
   test: {
     coverage: {
       reporter: ['text', 'lcov'],
       threshold: {
         branches: 80,
         functions: 80,
         lines: 80
       }
     }
   }
   ```

2. **Add Visual Regression Testing**
   - Use Playwright's screenshot comparison
   - Capture Step 4 schedule table in various states

3. **Add Accessibility Testing**
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe'
   
   it('should have no accessibility violations', async () => {
     const { container } = render(<Step1TournamentSettings {...props} />)
     const results = await axe(container)
     expect(results).toHaveNoViolations()
   })
   ```

---

## 5. Security Review

### Risk Assessment: LOW

This is a client-side only application with no backend, no authentication, and no sensitive data storage. The attack surface is minimal.

### Findings

#### 1. **XSS Potential in Team Names** (Medium Priority)
**Location:** Team names rendered in multiple components  
**Risk:** If user inputs `<script>alert('xss')</script>` as team name, it could execute  
**Mitigation:** React's JSX escaping handles this by default ✅

**Verification:**
```typescript
// React safely escapes this
<td className="px-4 py-3 font-medium">{match.homeTeam.name}</td>
```

#### 2. **XSS in Image Export** (Medium Priority)
**Location:** `Step4Schedule.tsx` lines 118-200  
**Risk:** Team names are inserted into HTML string for html2canvas  
**Current Code:**
```typescript
<td style="...">${match.homeTeam.name}</td>
```

**Recommendation:** Escape HTML entities

```typescript
const escapeHtml = (str: string) => 
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')

// Usage
<td style="...">${escapeHtml(match.homeTeam.name)}</td>
```

#### 3. **CSV Injection** (Low Priority)
**Location:** `scheduler.ts` line 278-289  
**Risk:** Team names starting with `=`, `+`, `-`, `@` could be interpreted as formulas in Excel  
**Current Code:**
```typescript
const rows = matches.map(m => [
  formatTime(m.startTime),
  getPitchName(m.pitch, settings),
  m.homeTeam.name,  // Not escaped
  m.awayTeam.name,  // Not escaped
  formatTime(m.endTime)
])
```

**Recommendation:**
```typescript
const escapeCsvField = (field: string) => {
  if (/^[=+\-@]/.test(field)) {
    return `'${field}`  // Prefix with apostrophe
  }
  if (field.includes(',') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}
```

#### 4. **localStorage Data Integrity** (Low Priority)
**Location:** `useLocalStorage.ts`  
**Risk:** Malicious data could be injected into localStorage via other scripts or browser extensions  
**Current Mitigation:** JSON.parse errors are caught and logged

**Recommendation:** Add schema validation on load
```typescript
import { z } from 'zod'

const TournamentSchema = z.object({
  id: z.string().uuid(),
  settings: SettingsSchema,
  teams: z.array(TeamSchema),
  // ...
})

// On load
const parsed = JSON.parse(item)
return TournamentSchema.parse(parsed) // Throws on invalid data
```

#### 5. **Dependency Vulnerabilities** (Low Priority)
**Finding:** npm audit shows 0 vulnerabilities ✅
**Note:** Regular dependency updates via Dependabot configured

#### 6. **Missing Security Headers** (Low Priority)
**Location:** `staticwebapp.config.json`  
**Current headers:**
```json
"headers": {
  "Cache-Control": "no-cache..."
}
```

**Recommendation:** Add security headers
```json
{
  "route": "/*",
  "headers": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com"
  }
}
```

### Prioritized Security Fixes

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Add HTML escaping in image export | Low | Medium |
| 2 | Add CSV field escaping | Low | Low |
| 3 | Add security headers | Low | Low |
| 4 | Add localStorage schema validation | Medium | Low |

### No Issues Found

- ✅ No hardcoded secrets or API keys
- ✅ No authentication system to compromise
- ✅ No sensitive data storage
- ✅ No server-side code
- ✅ No database queries (no SQL injection possible)
- ✅ No file uploads
- ✅ HTTPS enforced by Azure Static Web Apps

---

## 6. Performance & Scalability

### Current Performance Characteristics

#### Build Analysis
```
dist/assets/index-B63Rih7n.js  733.87 kB │ gzip: 211.94 kB
dist/assets/index-LHxTAjtL.css 321.14 kB │ gzip:  60.96 kB
```

**Issue:** Main JS bundle exceeds 500KB warning threshold

### Bottlenecks Identified

#### 1. **Large Bundle Size** (High Impact)
**Cause:** All Radix UI components bundled, many unused  
**Current:** 733KB uncompressed JS  
**Recommendation:**
- Enable tree-shaking verification
- Code-split by route
- Lazy load Step4Schedule (largest component)

```typescript
const Step4Schedule = lazy(() => import('./components/Step4Schedule'))

// Usage
<Suspense fallback={<Skeleton />}>
  <Step4Schedule {...props} />
</Suspense>
```

#### 2. **Schedule Generation Algorithm** (Medium Impact)
**Location:** `scheduler.ts` generateLimitedMatches  
**Current Complexity:** O(n²) for team matching in loop  
**Issue:** For 100 teams × 10 matches = could be 100,000 iterations

**Recommendation:** Use more efficient data structures
```typescript
// Use priority queue for team selection
class TeamPriorityQueue {
  private heap: Team[] = []
  
  insert(team: Team, matchCount: number) { /* ... */ }
  extractMin(): Team { /* ... */ }
}
```

#### 3. **Image Export Performance** (Medium Impact)
**Location:** `Step4Schedule.tsx` handleExportImage  
**Issue:** Creates full DOM in iframe, waits 500ms for fonts  
**Time:** ~2-3 seconds for 50+ matches

**Recommendations:**
- Show progress indicator (already implemented ✅)
- Consider using server-side rendering for images (out of scope for static app)
- Pre-load fonts in main document

#### 4. **Unoptimized Re-renders** (Low Impact)
**Location:** `App.tsx`  
**Issue:** Large state objects may cause unnecessary re-renders  
**Recommendation:** Use React DevTools Profiler to identify hot paths

### Measurement Approach

#### 1. Add Performance Metrics
```typescript
// src/lib/performance.ts
export function measureScheduleGeneration(fn: () => GeneratedSchedule) {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  
  if (duration > 500) {
    console.warn(`Schedule generation took ${duration}ms`)
  }
  
  return result
}
```

#### 2. Add Lighthouse CI to Workflow
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      ${{ env.PREVIEW_URL }}/
    budgetPath: ./lighthouse-budget.json
```

#### 3. Bundle Size Monitoring
```bash
# Add to CI
npx bundlesize --max-size 300KB
```

### Scalability Limits

| Metric | Current Limit | Recommended Limit | Notes |
|--------|---------------|-------------------|-------|
| Teams per tournament | No limit | 50 | UI becomes crowded |
| Matches per tournament | 100 (warning) | 100 | Performance concern |
| Saved tournaments | localStorage limit (~5MB) | ~50 tournaments | Before quota issues |
| Pitches | No limit | 10 | UI/scheduling complexity |

### Optimization Recommendations

1. **Implement Virtual Scrolling for Large Tables**
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual'
   ```

2. **Web Worker for Schedule Generation**
   ```typescript
   // Move heavy computation off main thread
   const worker = new Worker('./scheduler.worker.ts')
   worker.postMessage({ teams, settings, config })
   ```

3. **Add Tournament Limits**
   ```typescript
   const MAX_TEAMS = 50
   const MAX_SAVED_TOURNAMENTS = 50
   ```

---

## 7. DevEx & Operations

### README/Setup Experience

#### Strengths ✅
- Clear feature list
- Well-documented commands
- Multiple deployment options explained

#### Improvements Needed
- Add troubleshooting section
- Add development prerequisites (Node version)
- Add architecture diagram

### Environment Configuration

#### Current State
- Uses Vite environment handling
- Azure secrets documented in DEPLOYMENT.md

#### Recommendations
1. Add `.nvmrc` file for Node version pinning
   ```
   20
   ```

2. Add example environment file
   ```bash
   # .env.example
   VITE_APP_VERSION=$npm_package_version
   ```

### Linting/Formatting

#### Current State
- ESLint configured with TypeScript rules
- 5 warnings (all react-refresh related)

#### Recommendations

1. **Add Prettier for Formatting**
   ```json
   // .prettierrc
   {
     "semi": false,
     "singleQuote": true,
     "trailingComma": "es5",
     "tabWidth": 2
   }
   ```

2. **Fix ESLint Warnings**
   - Move `buttonVariants`, `badgeVariants`, etc. to separate files

3. **Add Pre-commit Hooks**
   ```json
   // package.json
   "scripts": {
     "prepare": "husky install"
   }
   ```

   ```bash
   # .husky/pre-commit
   npm run lint
   npm run test -- --run
   ```

### CI/CD

#### Current State ✅
- GitHub Actions workflow configured
- Tests run on PR
- Automatic deployment to Azure
- Preview environments for PRs

#### Recommendations

1. **Add Caching for Playwright Browsers**
   ```yaml
   - name: Cache Playwright Browsers
     uses: actions/cache@v3
     with:
       path: ~/.cache/ms-playwright
       key: playwright-${{ hashFiles('package-lock.json') }}
   ```

2. **Add Parallel Test Execution**
   ```yaml
   - name: Run Playwright tests
     run: npm run test:e2e -- --shard=${{ matrix.shard }}
     strategy:
       matrix:
         shard: [1/4, 2/4, 3/4, 4/4]
   ```

3. **Add Dependency Review**
   ```yaml
   - name: Dependency Review
     uses: actions/dependency-review-action@v3
   ```

### Release Process

#### Current State
- No versioning strategy
- No changelog

#### Recommendations

1. **Add Semantic Versioning**
   ```json
   // package.json
   "version": "1.0.0"
   ```

2. **Add Release Workflow**
   ```yaml
   # .github/workflows/release.yml
   on:
     push:
       tags: ['v*']
   
   jobs:
     release:
       steps:
         - uses: softprops/action-gh-release@v1
           with:
             generate_release_notes: true
   ```

3. **Add Changelog Generation**
   ```bash
   npx conventional-changelog -p angular -i CHANGELOG.md -s
   ```

### Containerization

**Not Recommended** for this project because:
- Static site deployment is simpler
- Azure Static Web Apps handles all infrastructure
- No server-side code to containerize

If needed for local development consistency:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### Monitoring

#### Current State
- No monitoring configured

#### Recommendations

1. **Add Application Insights (Azure)**
   ```typescript
   // src/lib/analytics.ts
   import { ApplicationInsights } from '@microsoft/applicationinsights-web'
   
   export const appInsights = new ApplicationInsights({
     config: {
       connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING
     }
   })
   appInsights.loadAppInsights()
   ```

2. **Add Error Tracking**
   - Sentry or similar for production error tracking
   
3. **Add Usage Analytics**
   - Track tournament creation success rate
   - Track export usage

### Suggested GitHub Actions Workflows

#### 1. Build/Test/Lint (Current - Improve)
```yaml
# Already exists, add:
- Playwright browser caching
- Test result annotations
- Coverage reporting
```

#### 2. Security Scanning (New)
```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=high
        
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v3
```

#### 3. Dependency Updates (Current - via Dependabot) ✅

#### 4. Performance Budget (New)
```yaml
name: Performance

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm ci && npm run build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
```

---

## Summary

### Overall Assessment

The Football Tournament Application is a **well-structured, functional application** with solid fundamentals. The code quality is good, with clear separation of concerns and comprehensive type safety. The main areas for improvement are:

1. **Architecture:** Extract shared context and reduce App.tsx complexity
2. **Testing:** Add component-level tests and increase coverage
3. **Performance:** Implement code splitting and optimize bundle size
4. **Security:** Add HTML escaping in dynamic HTML generation

### Recommended Action Items

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| High | Extract TournamentContext | 2 days | High |
| High | Add component unit tests | 3 days | High |
| Medium | Implement code splitting | 1 day | Medium |
| Medium | Add HTML escaping in exports | 2 hours | Medium |
| Medium | Add security headers | 1 hour | Low |
| Low | Add Prettier + pre-commit hooks | 2 hours | Medium |
| Low | Add performance monitoring | 1 day | Low |

### Metrics Summary

| Metric | Current | Target |
|--------|---------|--------|
| Unit Test Count | 40 | 80+ |
| Test Coverage | Unknown | 80%+ |
| Bundle Size (gzip) | 212KB | <150KB |
| Lighthouse Performance | Unknown | 90+ |
| ESLint Errors | 0 | 0 |
| ESLint Warnings | 5 | 0 |
| Security Vulnerabilities | 0 | 0 |
