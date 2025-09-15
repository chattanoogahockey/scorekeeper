# Hockey Scorekeeper 2.1



A completely static hockey scorekeeper application designed to run on GitHub Pages for free hosting. This version removes all server-side dependencies and uses client-side JavaScript with static JSON data files.A modern, mobile-first hockey scorekeeper application built with React, featuring goal tracking, roster management, and static JSON data storage. Designed by scorekeepers, for scorekeepers.



## 🚀 Live DemoThis repository contains a static web application for hockey scorekeeping, specifically optimized for mobile and tablet use during live games. The project features a React frontend with TailwindCSS for responsive styling and client-side data management with static JSON files.



Visit: https://chattanoogahockey.github.io/scorekeeper/## 🏒 Features



## ✨ Features### ✅ Currently Implemented

- **League & Game Management**: Browse games by league (Gold, Silver, Bronze)

- **📊 Player Statistics** - View detailed player stats with filtering- **Mobile-Optimized Interface**: Designed specifically for tablets and mobile devices used by scorekeepers

- **🏒 Game Management** - Track games, goals, and penalties  - **Team Roster Management**: Complete player rosters with numbers and positions

- **🎵 DJ Soundboard** - Client-side audio controls (no server needed)- **Attendance Tracking**: Record which players are present for each game, stored locally

- **📱 Mobile Responsive** - Works great on phones and tablets- **Advanced Goal Recording System**:

- **⚡ Lightning Fast** - Static files load instantly  - **Calculator-Style Time Input**: Intuitive number pad for quick MM:SS time entry (validates 00:01 to 20:00)

- **💰 100% Free** - Hosted on GitHub Pages at no cost  - **Complete Goal Details**: Scorer, assist, shot type (wrist, slap, snap, backhand), goal type (regular, power play, short-handed, penalty shot, empty net)

  - **Client-Side Data Management**: Goals saved locally with automatic score calculation

## 🏗️ Architecture  - **Smart Form Validation**: Record button only activates when all required fields are completed

  - **Automatic Goal Descriptions**: System generates contextual descriptions ("First goal of the game", "Go-ahead goal", etc.)

### Static Data Flow- **Responsive Mobile Design**: 20% smaller team selection buttons, touch-friendly controls throughout

```- **Client-Side Data Persistence**: All events stored locally with immediate confirmation

JSON Data Files (public/data/) - **Unified Versioning**: Consistent version reporting across all components

    ↓- **Simple Deployment**: Automated GitHub Pages deployment

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

scorekeeper/### Frontend

├── .github/workflows/- **React 18** with Vite for fast development and hot reload

│   └── deploy.yml           # GitHub Actions deployment- **React Router** for seamless page navigation

├── frontend/- **TailwindCSS** for mobile-first responsive design

│   ├── src/- **Context API** for state management across components

│   │   ├── components/      # React components- **Fetch API** for HTTP requests to backend

│   │   ├── pages/          # Page components  

│   │   ├── services/       # Static data services### Data Management

│   │   └── ...- **Static JSON Files** for data storage

│   ├── package.json        # Frontend dependencies- **Browser Local Storage** for user preferences

│   └── vite.config.js      # Build configuration- **Client-Side Data Service** for JSON file management

├── public/- **No Backend Required** - Fully static application

│   └── data/               # Static JSON data files- **Dynamic versioning** from package.json

│       ├── games.json      # Game data

│       ├── players.json    # Player statistics### Database

│       ├── teams.json      # Team rosters- **Static JSON Files** for all data storage:

│       └── summary.json    # Dashboard summaries  - `games.json` – Game records and submissions

├── scripts/  - `players.json` – Player statistics and profiles

│   ├── build.ps1          # Windows build script  - `teams.json` – Team rosters

│   └── build.sh           # Linux/Mac build script  - `summary.json` – Dashboard summaries

└── package.json           # Root project configuration  - All data stored client-side in browser

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

# Clone the repository- Git

git clone https://github.com/chattanoogahockey/scorekeeper.git- Git

cd scorekeeper

### Quick Start

# Install dependencies

cd frontend1. **Clone and install everything**

npm install   ```bash

   git clone https://github.com/chattanoogahockey/scorekeeper.git

# Start development server   cd scorekeeper

npm run dev   npm run install:all

```   ```



Visit `http://localhost:5173` to see the app.2. **Configure environment variables**

   

## 📊 Data Management   Copy and configure backend environment:

   ```bash

### Data Files Location

All data is stored in `public/data/` as JSON files:

- **`games.json`** - Game records with scores, goals, penalties

- **`players.json`** - Player profiles and statistics

- **`teams.json`** - Team rosters and information3. **Start development server**

```bash

   # From the root directory

### Updating Data   npm run dev

1. **Manual Updates**: Edit JSON files directly in your code editor

2. **GitHub Web Interface**: Edit files directly on GitHub.com   

3. **Automated Scripts**: Use GitHub Actions for scheduled updates   This starts the frontend development server on port 5173.



## 🚀 Deployment4. **Access the application**

   - Frontend: http://localhost:5173

### GitHub Pages Setup

1. **Push to GitHub**: Commit all changes to your main branch

2. **Enable Pages**: Go to repo Settings → Pages → Source: GitHub Actions  ### Environment Configuration

3. **Automatic Deploy**: Every push to main triggers a new deployment

#### Frontend (automatically configured)

## 🎮 Usage```env

# No environment variables required - fully static

### For Scorekeepers

1. **Navigate to Games** - Select active game from uploaded data
2. **Track Events** - Record goals and penalties (saved locally)
3. **Use DJ Controls** - Play sounds during game (client-side only)
4. **View Stats** - Check real-time statistics (no server required)

### For Fans

1. **View Statistics** - Browse player and team stats from local data
2. **Check Standings** - See current league standings
3. **Review Games** - Look at past game results

## 🎵 DJ Soundboard

The DJ soundboard works entirely client-side:

- **Audio Files**: Store in `frontend/public/sounds/`
- **No Server Required**: All audio processing happens in browser
- **Mobile Compatible**: Works on phones and tablets
- **Offline Capable**: Functions without internet connection



## 📊 Cost Comparison

| Feature | Previous (Azure) | Current (Static) |
|---------|------------------|------------------|
| **Hosting** | $10+/month | **FREE** |
| **Database** | $5+/month | **FREE** |
| **CDN** | Extra cost | **FREE** |
| **Maintenance** | Required | None |
| **Scalability** | Limited | Unlimited |

**Total Savings**: ~$180+/year with GitHub Pages

| **Maintenance** | High | **Minimal** |

| **Scaling** | Complex | **Automatic** |

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
6. Submit to save locally with immediate confirmation

### Mobile Interface Features
- Touch-optimized button sizes (20% smaller team selection for space efficiency)
- Calculator-style time input with proper digit accumulation
- Form validation with visual feedback
- Real-time score display after goal submission

## 🏗️ Project Structure

```
scorekeeper/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context providers
│   │   ├── pages/          # Main application pages
│   │   └── main.jsx        # Application entry point
│   ├── public/             # Static assets (sounds, version.json)
│   ├── generate-version.js  # Build-time version generation
│   └── package.json
├── backend/                 # Static data files (no server)
│   ├── data/               # JSON data files
│   ├── sounds/             # Audio files for DJ
│   └── README.md
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

# Test API locally
npm run test:api

# Test static functionality
npm run test:static

# Individual component tests
npm run test:frontend
```

### Manual Testing

1. Start the development server: `npm run dev`
2. Navigate to a game and record attendance
3. Test goal recording with various scenarios
4. Verify data persistence in browser local storage
5. Check version endpoint: http://localhost:3001/api/version

## 🚀 Deployment

### GitHub Pages

The project includes automated deployment via GitHub Actions:

1. **Setup GitHub Pages**
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"

2. **Deploy**
   ```bash
   # Push to main branch triggers automatic deployment
   git push origin main
   ```

### Deployment Features

- **Automatic versioning** from git commit and package.json
- **Build verification** ensures deployed version matches expected
- **Static file optimization** for fast loading
- **No server maintenance required**

## 🔧 Development

### Key Components

- **GoalRecord.jsx**: Mobile-optimized goal recording form with calculator-style time input
- **GameContext.jsx**: React context providing game state and roster data
- **localStorage.js**: Client-side data persistence and caching
- **staticDataService.js**: JSON file loading and management
- **generate-version.js**: Build-time version generation with git metadata

### Development Features

- **Hot reload** with Vite
- **Client-side data management**
- **Offline functionality**
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

2. Static Data Import:
   ```bash
   # Import historical data to JSON files
   npm run import-historical -- input.csv
   ```

Required CSV columns: Name,Division,Year,Goals,Assists,PIM,GP (optional Points,League,Season). Points auto-calculated if missing.

Verify data after import by checking the generated JSON files in `public/data/`.

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
- ✅ Static data file management
- ✅ Enhanced GitHub Actions workflow with verification
- ✅ Improved local development workflow
- ✅ Professional error handling and logging
- ✅ Cache optimization for static assets
- ✅ Comprehensive testing scripts
- ✅ Environment-specific configuration

### v2.0.0 (January 2025)
- ✅ Complete mobile-optimized goal recording system
- ✅ Calculator-style time input with proper validation
- ✅ Real-time local storage integration with automatic score calculation
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