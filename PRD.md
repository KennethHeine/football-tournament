# Football Tournament Program Builder

A professional tournament scheduling application that helps organizers create detailed match schedules across multiple pitches with automatic time allocation and conflict detection.

**Experience Qualities**:
1. **Efficient** - Quick setup wizard that guides users from tournament setup to printed schedule in under 2 minutes
2. **Intelligent** - Smart scheduling algorithm that distributes matches fairly, prevents conflicts, and optimizes rest time
3. **Professional** - Print-ready outputs with clean typography and structured data exports for official tournament programs

**Complexity Level**: Light Application (multiple features with basic state)
This is a multi-step wizard with state management, data validation, algorithm execution, and multiple output formats. It doesn't require complex authentication or real-time collaboration, making it a focused light application.

## Essential Features

### Tournament Setup Wizard
- **Functionality**: Multi-step form collecting tournament parameters (name, date/time, pitches, match timing, breaks) with URL-based navigation
- **Purpose**: Structure data input to avoid overwhelming users and ensure all required settings are captured
- **Trigger**: User clicks "New Tournament" or starts the app
- **Progression**: Welcome screen → Step 1 (Tournament Settings) → Step 2 (Add Teams) → Step 3 (Scheduling Mode) → Step 4 (Generate & View)
- **Success criteria**: All required fields validated before advancing, clear progress indication, ability to go back and edit, browser back/forward buttons navigate between steps correctly, URL reflects current step and tournament ID

### Team Management
- **Functionality**: Add teams individually or bulk paste from text, edit/reorder/delete teams, automatic duplicate detection
- **Purpose**: Flexible team entry accommodating both small and large tournaments
- **Trigger**: User reaches Step 2 in wizard
- **Progression**: Empty state with "Add Team" button → Manual entry or bulk paste → Team list with edit/delete actions → Validation (min 2 teams, unique names) → Continue
- **Success criteria**: Bulk paste correctly splits by newlines, duplicate team names prevented with helpful suggestions, minimum 2 teams enforced

### Schedule Generation Engine
- **Functionality**: Algorithm creates match pairings based on mode (round-robin or limited), assigns to time slots across pitches, detects conflicts
- **Purpose**: Core value - automates complex scheduling logic that would take hours manually
- **Trigger**: User completes wizard and clicks "Generate Schedule"
- **Progression**: Collect all settings → Generate pairings (round-robin circle method or fair distribution) → Assign to time slots (parallel pitches, respect constraints) → Detect conflicts → Display results with warnings if any
- **Success criteria**: No team plays two matches simultaneously, rest time distributed fairly when possible, BYE team auto-added for odd counts, conflicts clearly highlighted

### Program Output & Export
- **Functionality**: Sortable table of matches with time/pitch/teams, filters by team/pitch, search, print layout, CSV export, clipboard copy, image export with OKLCH-to-RGB color conversion
- **Purpose**: Transform generated schedule into usable formats for tournament day, including shareable images
- **Trigger**: Schedule successfully generated
- **Progression**: View table → Apply filters/search (optional) → Export to CSV / Copy text / Print / Export as PNG image → Physical/digital program ready
- **Success criteria**: Print view fits A4 with proper page breaks, CSV includes all match data, filters update table instantly, text copy is properly formatted, PNG export handles all colors correctly without OKLCH parsing errors

### Tournament Persistence
- **Functionality**: Save tournament to local storage, load existing tournaments, rename, delete (owner-only or admin), regenerate schedule after edits, URL-based navigation with browser back/forward support, share tournament via URL
- **Purpose**: Allow organizers to prepare tournaments in advance and make adjustments, with seamless navigation and access control for tournament creators
- **Trigger**: Auto-save after generation, explicit save button, load from tournament list, URL parameters on page load, share button for URL copying
- **Progression**: Create tournament → Auto-saved with owner ID → Return later → Load from list → Edit settings (owner) or View only (others) → Regenerate (owner) → Updated schedule → Share URL → Others can view via link
- **Success criteria**: All tournament data persists across sessions, regeneration preserves settings but recalculates schedule, delete button only visible to tournament owner or admin users, browser back/forward buttons work correctly through wizard steps and tournament views, shared URLs load tournament directly in view mode

### Image Export & Test Suite
- **Functionality**: Export tournament schedule as PNG image with proper color conversion from OKLCH to RGB/HEX, automated test suite to verify export functionality
- **Purpose**: Enable sharing of tournament schedules as images on social media, messaging apps, or for archival purposes
- **Trigger**: User clicks "Eksporter som Billede" button on schedule view, or runs diagnostic tests from main page
- **Progression**: Schedule view → Click export → Color conversion (OKLCH → RGB → HEX) → HTML2Canvas rendering → PNG download → Image saved
- **Success criteria**: PNG export works without OKLCH color parsing errors, all table formatting preserved in image, test suite validates color conversion and HTML2Canvas functionality, image quality suitable for sharing at 2x scale

## Edge Case Handling

- **Odd Team Count** - Automatically add "BYE" team to pairings, clearly mark BYE matches in schedule (team gets rest period)
- **Duplicate Team Names** - Block submission and show inline error with suggestion to append number (e.g., "Arsenal" → "Arsenal 2")
- **Extreme Settings** - Validate minimums (2 teams, 1 pitch, 5+ min matches) and show warnings for very long tournaments (100+ matches)
- **Insufficient Unique Pairings** - When max matches per team exceeds available opponents, show warning modal and allow user to accept duplicate matchups
- **Scheduling Conflicts** - Highlight matches in red where same team appears in parallel time slots, show conflict summary
- **Empty States** - Guide users with helpful messages (no tournaments saved, no teams added, no matches generated yet)
- **Tournament Ownership** - Only tournament creator can delete their tournaments; delete button hidden for non-owners viewing shared tournaments; admin users can delete any tournament
- **Unauthenticated Access** - Public tournaments can be viewed by anyone via shared URL, but only authenticated users can create new tournaments
- **OKLCH Color Export** - HTML2Canvas doesn't support OKLCH colors; all colors automatically converted to HEX format for image export to prevent parsing errors
- **Image Export Testing** - Built-in test suite on main page validates color conversion, HTML2Canvas rendering, and full table export functionality

## Design Direction

The design should evoke **precision, clarity, and professionalism** - like a well-organized sporting event. Think stadium signage, referee clipboards, and broadcast graphics. The interface should feel structured and authoritative while remaining approachable for volunteer organizers.

## Color Selection

A bold football-inspired palette with high-energy greens and clean neutrals.

- **Primary Color**: Pitch Green `oklch(0.55 0.15 145)` - Represents the football field, used for primary actions and active states, communicates growth and go-ahead
- **Secondary Colors**: 
  - Deep Navy `oklch(0.25 0.05 250)` - Professional authority for headers and important text
  - Slate Gray `oklch(0.65 0.02 240)` - Supporting backgrounds and secondary buttons
- **Accent Color**: Bright Referee Yellow `oklch(0.85 0.18 95)` - Attention-grabbing for warnings, highlights, and call-to-action elements
- **Foreground/Background Pairings**:
  - Background (White `oklch(0.98 0 0)`): Deep Navy text `oklch(0.25 0.05 250)` - Ratio 10.2:1 ✓
  - Primary (Pitch Green `oklch(0.55 0.15 145)`): White text `oklch(1 0 0)` - Ratio 4.9:1 ✓
  - Accent (Referee Yellow `oklch(0.85 0.18 95)`): Deep Navy text `oklch(0.25 0.05 250)` - Ratio 8.1:1 ✓
  - Muted (Light Gray `oklch(0.96 0 0)`): Slate text `oklch(0.45 0.02 240)` - Ratio 7.3:1 ✓

## Font Selection

Typography should be **bold, athletic, and highly legible** - suitable for both digital interfaces and printed tournament programs.

- **Primary**: **Outfit** (headings & UI) - Geometric sans-serif with sporty character, excellent at large sizes
- **Secondary**: **Inter** (body text & tables) - Optimal readability for dense data tables and small print

**Typographic Hierarchy**:
- H1 (Tournament Name): Outfit Bold / 32px / tight (-0.02em) letter spacing
- H2 (Step Headers): Outfit Semibold / 24px / normal spacing
- H3 (Section Labels): Outfit Medium / 18px / normal spacing
- Body (Forms & Info): Inter Regular / 15px / 1.5 line height
- Table Headers: Inter Semibold / 14px / uppercase / wide (0.05em) spacing
- Table Cells: Inter Regular / 14px / tabular-nums for time alignment
- Small (Hints): Inter Regular / 13px / muted color

## Animations

Animations should feel **decisive and athletic** - quick movements like a referee's whistle or scoreboard updates. Use motion to guide users through the wizard flow and celebrate successful generation.

- Wizard step transitions: Slide content left/right (300ms ease-out) with slight fade to show progression direction
- Schedule generation: Skeleton pulse while computing, then stagger-fade matches in by time slot (50ms delay each) for satisfying reveal
- Validation errors: Shake animation (200ms) on invalid fields to draw attention
- Button interactions: Scale down slightly on press (0.95) with 100ms spring for tactile feedback
- Filter/search: Fade out filtered items (150ms) rather than instant removal
- Success states: Subtle confetti burst when schedule successfully generated

## Component Selection

**Components**:
- **Stepper** (Custom) - Horizontal progress indicator showing 4 steps with check marks for completed stages, using Outfit font
- **Form** (Shadcn) - Form with react-hook-form integration for all input validation
- **Input, Label** (Shadcn) - Standard form controls with focus states and error handling
- **Select** (Shadcn) - Dropdown for match mode selection
- **Button** (Shadcn) - Primary (pitch green), Secondary (slate), Destructive (red) variants with hover/active states
- **Table** (Shadcn) - Main schedule display with sticky headers, hover rows, zebra striping for readability
- **Card** (Shadcn) - Container for each wizard step with subtle shadow elevation
- **Dialog** (Shadcn) - Confirmation modals (delete tournament, accept duplicate matches) and warnings
- **Alert** (Shadcn) - Warning banners for edge cases (conflicts detected, extreme settings)
- **Tabs** (Shadcn) - Switch between "Program View" and "Team View" in results screen
- **Badge** (Shadcn) - Tag BYE matches, conflict indicators, pitch numbers with pill styling
- **Textarea** (Shadcn) - Bulk team paste area
- **Separator** (Shadcn) - Visual breaks between form sections

**Customizations**:
- **Match conflict highlighter** - Custom component wrapping table rows with red-tinted background and warning icon for simultaneous bookings
- **Time slot grouping** - Custom table section headers with sticky positioning showing kickoff time in large bold text
- **Print stylesheet** - Custom CSS media query hiding UI chrome (buttons, filters) and optimizing table for A4

**States**:
- Inputs: Default border-slate, Focus ring-primary (2px), Error border-destructive with shake, Disabled opacity-50
- Buttons: Hover brightness increase (+10%), Active scale(0.95), Loading spinner with disabled state
- Table rows: Hover bg-muted, Selected (when filtering) bg-accent/10, Conflict bg-destructive/10

**Icon Selection**:
- Navigation: ArrowLeft, ArrowRight (wizard navigation)
- Actions: Plus, Trash, Pencil, Copy, Download, Printer
- Status: Check, WarningCircle, Info
- Features: CalendarBlank, Clock, Users, Clipboard, MagnifyingGlass

**Spacing**:
- Container padding: p-6 (24px)
- Form field gaps: gap-4 (16px)
- Card spacing: p-6 with gap-6 for sections
- Table cells: px-4 py-3
- Button padding: px-6 py-2.5 (large touch targets)
- Section breaks: my-8

**Mobile**:
- Wizard stepper: Switch to vertical compact style or simple "Step 2 of 4" text indicator
- Form: Full-width inputs with larger touch targets (min-h-12)
- Table: Horizontal scroll container with sticky first column (time), or card-based layout stacking match info vertically
- Actions: Fixed bottom bar with primary action button
- Filters: Collapse into drawer/sheet that slides up from bottom
