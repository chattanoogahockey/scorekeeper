# Hockey Scorekeeper - Static Edition# Hockey Scorekeeper 2.1



A completely static hockey scorekeeper application designed to run on GitHub Pages for free hosting. This version removes all server-side dependencies and uses client-side JavaScript with static JSON data files.A modern, mobile-first hockey scorekeeper application built with React and Node.js, featuring real-time goal tracking, roster management, and Azure Cosmos DB integration. Designed by scorekeepers, for scorekeepers.



## 🚀 Live DemoThis repository contains a full-stack web application for real‑time hockey scorekeeping, specifically optimized for mobile and tablet use during live games. The project features a React frontend with TailwindCSS for responsive styling and an Express backend API that integrates with Azure Cosmos DB for real-time data persistence.



Visit: https://chattanoogahockey.github.io/scorekeeper2/## 🏒 Features



## ✨ Features### ✅ Currently Implemented

- **League & Game Management**: Browse games by league (Gold, Silver, Bronze)

- **📊 Player Statistics** - View detailed player stats with filtering- **Mobile-Optimized Interface**: Designed specifically for tablets and mobile devices used by scorekeepers

- **🏒 Game Management** - Track games, goals, and penalties  - **Team Roster Management**: Complete player rosters with numbers and positions

- **🎵 DJ Soundboard** - Client-side audio controls (no server needed)- **Attendance Tracking**: Record which players are present for each game, stored in Cosmos DB

- **📱 Mobile Responsive** - Works great on phones and tablets- **Advanced Goal Recording System**:

- **⚡ Lightning Fast** - Static files load instantly  - **Calculator-Style Time Input**: Intuitive number pad for quick MM:SS time entry (validates 00:01 to 20:00)

- **💰 100% Free** - Hosted on GitHub Pages at no cost  - **Complete Goal Details**: Scorer, assist, shot type (wrist, slap, snap, backhand), goal type (regular, power play, short-handed, penalty shot, empty net)

  - **Real-Time Database Integration**: Goals instantly saved to Cosmos DB with automatic score calculation

## 🏗️ Architecture  - **Smart Form Validation**: Record button only activates when all required fields are completed

  - **Automatic Goal Descriptions**: System generates contextual descriptions ("First goal of the game", "Go-ahead goal", etc.)

### Static Data Flow- **Responsive Mobile Design**: 20% smaller team selection buttons, touch-friendly controls throughout

```- **Real-Time Data Persistence**: All events stored in Azure Cosmos DB with immediate confirmation

JSON Data Files (public/data/) - **Unified Versioning**: Consistent version reporting across all components

    ↓- **Professional Deployment**: Automated Azure deployment with version verification

Static Data Service (client-side)

    ↓  ### 🚧 Planned Enhancements

React Components- Penalty recording and tracking

    ↓- Game clock and period management

GitHub Pages (CDN)- Audio announcements and sound effects

```- Advanced statistics and reporting

- Game summary and export functionality

## 📁 Project Structure

## 🛠️ Technology Stack

```

scorekeeper2/### Frontend

├── .github/workflows/- **React 18** with Vite for fast development and hot reload

│   └── deploy.yml           # GitHub Actions deployment- **React Router** for seamless page navigation

├── frontend/- **TailwindCSS** for mobile-first responsive design

│   ├── src/- **Context API** for state management across components

│   │   ├── components/      # React components- **Fetch API** for HTTP requests to backend

│   │   ├── pages/          # Page components  

│   │   ├── services/       # Static data services### Backend

│   │   └── ...- **Node.js** with Express.js framework

│   ├── package.json        # Frontend dependencies- **Azure Cosmos DB** integration via `@azure/cosmos` SDK

│   └── vite.config.js      # Build configuration- **CORS** enabled for cross-origin requests

├── public/- **RESTful API** design with JSON responses

│   └── data/               # Static JSON data files- **Dynamic versioning** from package.json

│       ├── games.json      # Game data

│       ├── players.json    # Player statistics### Database

│       ├── teams.json      # Team rosters- **Azure Cosmos DB** (SQL API) with configurable containers:

│       └── summary.json    # Dashboard summaries  - `settings` – Global application settings

├── scripts/  - `analytics` – Pre-aggregated statistics and leaderboards

│   ├── build.ps1          # Windows build script  - `rink-reports` – Weekly division summaries and articles

│   └── build.sh           # Linux/Mac build script  - `games` – Game records and submissions

└── package.json           # Root project configuration  - `players` – Player statistics and profiles

```  - `goals` – Goal events and scoring data

  - `penalties` – Penalty events and infractions

## 🛠️ Development Setup  - `rosters` – Team rosters and player assignments

  - `attendance` – Game attendance tracking

### Prerequisites  - `ot-shootout` – Overtime and shootout results

- Node.js 18+ 

- npm 8+## 🚀 Getting Started

- Git

### Prerequisites

### Local Development- [Node.js](https://nodejs.org/) 18+

```bash- [npm](https://www.npmjs.com/)

# Clone the repository- Azure Cosmos DB account

git clone https://github.com/chattanoogahockey/scorekeeper2.git- Git

cd scorekeeper2

### Quick Start

# Install dependencies

cd frontend1. **Clone and install everything**

npm install   ```bash

   git clone https://github.com/chattanoogahockey/scorekeeper2.git

# Start development server   cd scorekeeper2

npm run dev   npm run install:all

```   ```



Visit `http://localhost:5173` to see the app.2. **Configure environment variables**

   

## 📊 Data Management   Copy and configure backend environment:

   ```bash

### Data Files Location   cd backend

All data is stored in `public/data/` as JSON files:   cp .env.example .env

   # Edit .env with your Azure Cosmos DB credentials

- **`games.json`** - Game records with scores, goals, penalties   ```

- **`players.json`** - Player profiles and statistics  

- **`teams.json`** - Team rosters and information3. **Start development servers**

- **`summary.json`** - Dashboard summaries and standings   ```bash

   # From the root directory

### Updating Data   npm run dev

1. **Manual Updates**: Edit JSON files directly in your code editor   ```

2. **GitHub Web Interface**: Edit files directly on GitHub.com   

3. **Automated Scripts**: Use GitHub Actions for scheduled updates   This starts both backend (port 3001) and frontend (port 5173) concurrently.



## 🚀 Deployment4. **Access the application**

   - Frontend: http://localhost:5173

### GitHub Pages Setup   - Backend API: http://localhost:3001

1. **Push to GitHub**: Commit all changes to your main branch

2. **Enable Pages**: Go to repo Settings → Pages → Source: GitHub Actions  ### Environment Configuration

3. **Automatic Deploy**: Every push to main triggers a new deployment

#### Backend (.env in /backend directory)

## 🎮 Usage```env

# Required: Cosmos DB core configuration

### For ScorekeepersCOSMOS_DB_URI=https://your-account.documents.azure.com:443/

1. **Navigate to Games** - Select active gameCOSMOS_DB_KEY=your_primary_key

2. **Track Events** - Record goals and penalties  COSMOS_DB_NAME=scorekeeper

3. **Use DJ Controls** - Play sounds during game

4. **View Stats** - Check real-time statistics# Standardized container names (override if your deployment differs)

COSMOS_CONTAINER_SETTINGS=settings

### For Fans  COSMOS_CONTAINER_ANALYTICS=analytics

1. **View Statistics** - Browse player and team statsCOSMOS_CONTAINER_RINK_REPORTS=rink-reports

2. **Check Standings** - See current league standingsCOSMOS_CONTAINER_GAMES=games

3. **Review Games** - Look at past game resultsCOSMOS_CONTAINER_PLAYERS=players

COSMOS_CONTAINER_GOALS=goals

## 🎵 DJ SoundboardCOSMOS_CONTAINER_PENALTIES=penalties

COSMOS_CONTAINER_ROSTERS=rosters

The DJ soundboard works entirely client-side:COSMOS_CONTAINER_ATTENDANCE=attendance

- **Audio Files**: Store in `frontend/public/sounds/`COSMOS_CONTAINER_OT_SHOOTOUT=ot-shootout

- **No Server Required**: All audio processing happens in browserCOSMOS_CONTAINER_SHOTS_ON_GOAL=shots-on-goal

- **Mobile Compatible**: Works on phones and tabletsCOSMOS_CONTAINER_HISTORICAL_PLAYER_STATS=historical-player-stats



## 📊 Cost Comparison# Google Cloud TTS (optional)

GOOGLE_APPLICATION_CREDENTIALS_JSON={...service_account_json...}

| Feature | Server Version | Static Version |```

|---------|---------------|----------------|

| **Hosting** | $10+/month (Azure) | **FREE** (GitHub Pages) |#### Frontend (automatically configured)

| **Database** | $5+/month (Cosmos DB) | **FREE** (JSON files) |- Development: `VITE_API_BASE_URL=http://localhost:3001`

| **CDN** | Extra cost | **FREE** (GitHub CDN) |- Production: `VITE_API_BASE_URL=https://scorekeeper.azurewebsites.net`

| **Maintenance** | High | **Minimal** |

| **Scaling** | Complex | **Automatic** |## 📱 Usage

| **Total Monthly** | $15-50+ | **$0** |

### Starting a Game

**Annual Savings: $180-600+** 💰1. Select a league (Gold, Silver, Bronze)

2. Choose a game from the schedule

## 📝 License3. Record attendance for both teams

4. Navigate to the in-game menu

This project is licensed under the MIT License.

### Recording Goals

---1. Click "Record Goal" from the in-game menu

2. Select the scoring team (away team selected by default)

*Built with ❤️ for the hockey community*3. Choose the goal scorer and optional assist
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
   COSMOS_CONTAINER_SETTINGS=settings
   COSMOS_CONTAINER_ANALYTICS=analytics
   COSMOS_CONTAINER_RINK_REPORTS=rink-reports
   COSMOS_CONTAINER_GAMES=games
   COSMOS_CONTAINER_PLAYERS=players
   COSMOS_CONTAINER_GOALS=goals
   COSMOS_CONTAINER_PENALTIES=penalties
   COSMOS_CONTAINER_ROSTERS=rosters
   COSMOS_CONTAINER_ATTENDANCE=attendance
   COSMOS_CONTAINER_OT_SHOOTOUT=ot-shootout
   COSMOS_CONTAINER_SHOTS_ON_GOAL=shots-on-goal
   COSMOS_CONTAINER_HISTORICAL_PLAYER_STATS=historical-player-stats
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

### Historical Player Stats Import

Two methods:

1. API route (server running):
   ```powershell
   npm run dev
   npm run import-historical -- "C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\final_historical_data.csv"
   ```
   Add `--dry` to preview without writes.

2. Direct Cosmos (no server needed):
   ```powershell
   npm run import-historical-direct -- "C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\final_historical_data.csv"
   ```
   Also supports `--dry`.

Required CSV columns: Name,Division,Year,Goals,Assists,PIM,GP (optional Points,League,Season). Points auto-calculated if missing.

Verify sample after import:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/player-stats?scope=historical" | Select-Object -First 5 | ConvertTo-Json -Depth 4
```

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
#   T e s t   w o r k f l o w   t r i g g e r 
 
 