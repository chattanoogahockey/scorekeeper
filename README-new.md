# Hockey Scorekeeper 2.1

A modern, mobile-first hockey scorekeeper application built with React and Node.js, featuring real-time goal tracking, roster management, and Azure Cosmos DB integration. Designed by scorekeepers, for scorekeepers.

This repository contains a full-stack web application for real‑time hockey scorekeeping, specifically optimized for mobile and tablet use during live games. The project features a React frontend with TailwindCSS for responsive styling and an Express backend API that integrates with Azure Cosmos DB for real-time data persistence.

## 🏒 Features

### ✅ Currently Implemented
- **League & Game Management**: Browse games by league (Gold, Silver, Bronze)
- **Mobile-Optimized Interface**: Designed specifically for tablets and mobile devices used by scorekeepers
- **Team Roster Management**: Complete player rosters with numbers and positions
- **Attendance Tracking**: Record which players are present for each game, stored in Cosmos DB
- **Advanced Goal Recording System**:
  - **Calculator-Style Time Input**: Intuitive number pad for quick MM:SS time entry (validates 00:01 to 20:00)
  - **Complete Goal Details**: Scorer, assist, shot type (wrist, slap, snap, backhand), goal type (regular, power play, short-handed, penalty shot, empty net)
  - **Real-Time Database Integration**: Goals instantly saved to Cosmos DB with automatic score calculation
  - **Smart Form Validation**: Record button only activates when all required fields are completed
  - **Automatic Goal Descriptions**: System generates contextual descriptions ("First goal of the game", "Go-ahead goal", etc.)
- **Responsive Mobile Design**: 20% smaller team selection buttons, touch-friendly controls throughout
- **Real-Time Data Persistence**: All events stored in Azure Cosmos DB with immediate confirmation
- **Unified Versioning**: Consistent version reporting across all components
- **Professional Deployment**: Automated Azure deployment with version verification

### 🚧 Planned Enhancements
- Penalty recording and tracking
- Game clock and period management
- Audio announcements and sound effects
- Advanced statistics and reporting
- Game summary and export functionality

## 🛠️ Technology Stack

### Frontend
- **React 18** with Vite for fast development and hot reload
- **React Router** for seamless page navigation
- **TailwindCSS** for mobile-first responsive design
- **Context API** for state management across components
- **Fetch API** for HTTP requests to backend

### Backend
- **Node.js** with Express.js framework
- **Azure Cosmos DB** integration via `@azure/cosmos` SDK
- **CORS** enabled for cross-origin requests
- **RESTful API** design with JSON responses
- **Dynamic versioning** from package.json

### Database
- **Azure Cosmos DB** (SQL API) with configurable containers:
  - `settings` – Global application settings
  - `analytics` – Pre-aggregated statistics and leaderboards
  - `rink_reports` – Weekly division summaries and articles
  - `games` – Game records and submissions
  - `players` – Player statistics and profiles
  - `goals` – Goal events and scoring data
  - `penalties` – Penalty events and infractions
  - `rosters` – Team rosters and player assignments
  - `attendance` – Game attendance tracking
  - `otshootout` – Overtime and shootout results

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/)
- Azure Cosmos DB account
- Git

### Quick Start

1. **Clone and install everything**
   ```bash
   git clone https://github.com/chattanoogahockey/scorekeeper2.git
   cd scorekeeper2
   npm run install:all
   ```

2. **Configure environment variables**
   
   Copy and configure backend environment:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Azure Cosmos DB credentials
   ```

3. **Start development servers**
   ```bash
   # From the root directory
   npm run dev
   ```
   
   This starts both backend (port 3001) and frontend (port 5173) concurrently.

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Environment Configuration

#### Backend (.env in /backend directory)
```env
# Required: Cosmos DB configuration
COSMOS_DB_URI=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your_primary_key
COSMOS_DB_NAME=scorekeeper

# Optional: Override container names for different environments
COSMOS_DB_SETTINGS_CONTAINER=settings
COSMOS_DB_ANALYTICS_CONTAINER=analytics
COSMOS_DB_RINK_REPORTS_CONTAINER=rink_reports
COSMOS_DB_GAMES_CONTAINER=games
COSMOS_DB_PLAYERS_CONTAINER=playerStats
COSMOS_DB_GOALS_CONTAINER=goals
COSMOS_DB_PENALTIES_CONTAINER=penalties
COSMOS_DB_ROSTERS_CONTAINER=rosters
COSMOS_DB_ATTENDANCE_CONTAINER=attendance
COSMOS_DB_OTSHOOTOUT_CONTAINER=otshootout

# Optional: Google Cloud TTS credentials
GOOGLE_TTS_API_KEY=your_api_key
```

#### Frontend (automatically configured)
- Development: `VITE_API_BASE_URL=http://localhost:3001`
- Production: `VITE_API_BASE_URL=https://scorekeeper.azurewebsites.net`

## 📱 Usage

### Starting a Game
1. Select a league (Gold, Silver, Bronze)
2. Choose a game from the schedule
3. Record attendance for both teams
4. Navigate to the in-game menu

### Recording Goals
1. Click "Record Goal" from the in-game menu
2. Select the scoring team (away team selected by default)
3. Choose the goal scorer and optional assist
4. Enter the time using the calculator-style number pad (MM:SS format)
5. Select shot type, goal type, and breakaway status
6. Submit to save to Cosmos DB with real-time confirmation

### Mobile Interface Features
- Touch-optimized button sizes (20% smaller team selection for space efficiency)
- Calculator-style time input with proper digit accumulation
- Form validation with visual feedback
- Real-time score display after goal submission

## 🏗️ Project Structure

```
scorekeeper2/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context providers
│   │   ├── pages/          # Main application pages
│   │   └── main.jsx        # Application entry point
│   ├── public/             # Static assets (sounds, version.json)
│   ├── generate-version.js  # Build-time version generation
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── server.js           # Express server and routes
│   ├── cosmosClient.js     # Cosmos DB connection
│   ├── .env.example        # Environment template
│   └── package.json
├── .github/workflows/       # GitHub Actions CI/CD
│   └── main_scorekeeper.yml
├── test-api.js             # API testing script
└── package.json            # Root package with dev scripts
```

## 🔌 API Endpoints

### System
- `GET /api/health` - Health check
- `GET /api/version` - Version information (dynamic from package.json)

### Games & Teams
- `GET /api/leagues` - List available leagues
- `GET /api/teams` - Get all teams
- `GET /api/games?league={league}` - Get games for a league
- `GET /api/rosters?gameId={gameId}` - Get team rosters for a game

### Game Events
- `POST /api/goals` - Record a goal event
- `POST /api/attendance` - Record team attendance
- `GET /api/events?gameId={gameId}` - Get all events for a game

### Example Goal API Request
```json
POST /api/goals
{
  "gameId": 12345,
  "team": "Team Name",
  "player": "Player Name",
  "period": "1",
  "time": "05:30",
  "assist": "Assist Player",
  "shotType": "Wrist Shot",
  "goalType": "Regular",
  "breakaway": false,
  "goalDescription": "First goal of the game"
}
```

## 🧪 Testing

### Available Test Scripts

```bash
# Run all tests
npm test

# Test API locally
npm run test:api

# Test API on Azure
npm run test:api:remote

# Individual component tests
npm run test:backend
npm run test:frontend
```

### Manual Testing

1. Start the development servers: `npm run dev`
2. Navigate to a game and record attendance
3. Test goal recording with various scenarios
4. Verify data persistence in Cosmos DB
5. Check version endpoint: http://localhost:3001/api/version

## 🚀 Deployment

### Azure App Service

The project includes automated deployment via GitHub Actions:

1. **Setup Azure Resources**
   - Create an Azure App Service
   - Create an Azure Cosmos DB account
   - Configure deployment credentials

2. **Configure GitHub Secrets**
   - `AzureAppService_PublishProfile_*` - Deployment profile from Azure

3. **Environment Variables in Azure**
   ```bash
   COSMOS_DB_URI=https://your-account.documents.azure.com:443/
   COSMOS_DB_KEY=your_primary_key
   COSMOS_DB_NAME=scorekeeper
   VITE_API_BASE_URL=https://scorekeeper.azurewebsites.net
   NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   # Push to main branch triggers automatic deployment
   git push origin main
   ```

### Deployment Features

- **Automatic versioning** from git commit and package.json
- **Build verification** ensures deployed version matches expected
- **Health checks** validate deployment success
- **Cache optimization** for static assets
- **Environment-specific configuration**

## 🔧 Development

### Key Components

- **GoalRecord.jsx**: Mobile-optimized goal recording form with calculator-style time input
- **GameContext.jsx**: React context providing game state and roster data
- **cosmosClient.js**: Azure Cosmos DB connection with configurable container names
- **server.js**: Express server with RESTful API endpoints and dynamic versioning
- **generate-version.js**: Build-time version generation with git metadata

### Development Features

- **Hot reload** with Vite
- **Real-time database integration**
- **Unified versioning** across all components
- **Configurable container names** for different environments
- **Error handling** with user feedback
- **Mobile-first responsive design**
- **Concurrent development** servers with colored output

### Code Quality

- **Modular architecture** with clean separation of concerns
- **Environment-based configuration**
- **Professional error handling**
- **Comprehensive logging**
- **Type consistency** across frontend and backend

## 📊 Version Management

The application uses unified versioning across all components:

- **Package Version**: Defined in root `package.json` (currently 2.1.0)
- **API Version**: Dynamically read from `backend/package.json`
- **Frontend Version**: Generated at build time from root `package.json`
- **Git Integration**: Commit hash and branch included in version info
- **Deployment Tracking**: Build timestamp from GitHub Actions

Version information is available at:
- `/api/version` (API endpoint)
- `/version.json` (static frontend file)
- Admin panel version display

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

```bash
# Install dependencies
npm run install:all

# Start development
npm run dev

# Run tests
npm test

# Test API locally
npm run test:api

# Build for production
npm run build
```

## 📝 Recent Updates

### v2.1.0 (August 2025)
- ✅ Unified versioning across all components
- ✅ Dynamic version reporting from package.json
- ✅ Configurable Cosmos DB container names
- ✅ Enhanced GitHub Actions workflow with verification
- ✅ Improved local development workflow
- ✅ Professional error handling and logging
- ✅ Cache optimization for static assets
- ✅ Comprehensive testing scripts
- ✅ Environment-specific configuration

### v2.0.0 (January 2025)
- ✅ Complete mobile-optimized goal recording system
- ✅ Calculator-style time input with proper validation
- ✅ Real-time Cosmos DB integration with automatic score calculation
- ✅ Smart form validation and user feedback
- ✅ Responsive design optimized for scorekeepers
- ✅ Automatic goal descriptions and context

## 📞 Support

For questions or support, please open an issue in this repository.

## 🏒 About

Built for the Chattanooga Hockey community to modernize scorekeeper workflows with a fast, reliable, mobile-first application.

**Current Version**: 2.1.0  
**Last Updated**: August 2025  
**Status**: ✅ Production ready with professional deployment pipeline

---

*Ready for production! Features unified versioning, configurable environments, and comprehensive testing.*
