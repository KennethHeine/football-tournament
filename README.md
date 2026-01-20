# Football Tournament Program Builder

A professional tournament scheduling application that helps organizers create detailed match schedules across multiple pitches with automatic time allocation and conflict detection.

## 🚀 Live Demo

Deploy to Azure Static Web Apps - see [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions.

## ✨ Features

- **Efficient Tournament Setup** - Quick setup wizard that guides users from tournament setup to printed schedule in under 2 minutes
- **Intelligent Scheduling** - Smart scheduling algorithm that distributes matches fairly, prevents conflicts, and optimizes rest time
- **Professional Output** - Print-ready outputs with clean typography and structured data exports (CSV, PNG)
- **Browser-based Storage** - All data stored in browser localStorage (no backend required)
- **No Authentication** - Public access, no login required
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + Shadcn
- **State Management**: React Hooks + localStorage
- **Testing**: Vitest (unit tests) + Playwright (E2E tests)
- **Deployment**: Azure Static Web Apps

## 📦 Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/KennethHeine/football-tournament.git
cd football-tournament

# Install dependencies
npm install
\`\`\`

## 🏃 Development

\`\`\`bash
# Start development server
npm run dev

# Run linter
npm run lint

# Run unit tests
npm test

# Run unit tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## 🧪 Testing

### Unit Tests

We use Vitest for unit testing. Current coverage: **40 tests passing**

- Scheduler logic tests
- Color utility tests
- localStorage hook tests

### E2E Tests

We use Playwright for end-to-end testing with 5 test scenarios:

- Tournament creation workflow
- Data persistence
- Tournament deletion
- URL sharing

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Azure Static Web Apps.

### GitHub Actions Workflow

The repository uses automated CI/CD workflows. See [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) for details on:
- Automatic production deployment on push to main
- PR preview environments for testing before merge
- Test-only execution for Dependabot PRs
- Automatic cleanup of temporary environments

### Quick Deploy Options

**Option 1: OIDC (Recommended - Most Secure)**
```powershell
# 1. Provision resources
.\scripts\provision-azure.ps1

# 2. Setup service principal with federated credentials
.\scripts\setup-service-principal.ps1 -GitHubOrg "YourUsername" -GitHubRepo "football-tournament"

# 3. Add the 5 secrets to GitHub (shown in script output)
# 4. Push to main - automatic deployment with OIDC!
```

**Option 2: Static Token (Quick Start)**
```bash
# 1. Run provisioning script
./scripts/provision-azure.sh  # or .\scripts\provision-azure.ps1

# 2. Add AZURE_STATIC_WEB_APPS_API_TOKEN to GitHub Secrets
# 3. Push to main - automatic deployment!
```

📖 **See [DEPLOYMENT-QUICK-REFERENCE.md](./DEPLOYMENT-QUICK-REFERENCE.md) for details**

## 📝 Usage

1. **Create Tournament**: Click "Opret Ny Turnering" on the home page
2. **Tournament Settings**: Enter tournament name, date, time, number of pitches, match duration
3. **Add Teams**: Add teams individually or bulk paste
4. **Scheduling Mode**: Choose round-robin or limited matches per team
5. **Generate Schedule**: View and review the generated schedule
6. **Save & Export**: Save to localStorage, export to CSV/PNG, or print

## 🔐 Security

- No sensitive data storage
- All data stored in browser localStorage
- No authentication or user management
- No backend API calls
- Static site deployment

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

Built with ❤️ for football tournament organizers
