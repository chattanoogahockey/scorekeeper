# Dual Announcer Feature Documentation

## 🎤 Overview

The dual announcer feature adds conversational commentary between two AI-generated sports announcers with distinct personalities:

- **👨 Male Announcer**: Snarky, sarcastic New Yorker who loves the Rangers and hates the Islanders
- **👩 Female Announcer**: Optimistic, cheerful announcer who loves all teams (slight Red Wings bias)

## 🛠️ Implementation Details

### Frontend Changes

#### AnnouncerControls.jsx
- Added third voice mode button: 🎤 (Dual Announcer Mode)
- New `playDualAnnouncement()` function that handles conversation playback
- Browser TTS with different voice configurations for male/female speakers
- Updated all three API calls to include `announcerMode` parameter

### Backend Changes

#### announcerService.js - New Functions
1. **`generateDualGoalAnnouncement()`**: 6-line conversation about goals
2. **`generateDualPenaltyAnnouncement()`**: 4-line conversation about penalties  
3. **`generateDualRandomCommentary()`**: 10-line freeform conversation with AI-driven dialogue

#### server.js - Updated Endpoints
- All three endpoints (`/api/goals/announce-last`, `/api/penalties/announce-last`, `/api/randomCommentary`) now support dual mode
- When `announcerMode === 'dual'`, returns `conversation` array instead of single announcement text

## 🎯 Usage

### Voice Mode Selection
Users can select from three modes in the announcer panel:
- 👨 Solo male voice
- 👩 Solo female voice  
- 🎤 Dual announcer conversation

### Button Functions

#### Goal Button (🎤 Mode)
- Generates 6-line conversation about the last goal scored
- Male announces the goal, female responds positively
- Includes goal details, player stats, and personality-driven banter

#### Penalty Button (🎤 Mode)  
- Generates 4-line conversation about the last penalty
- Male announces penalty officially, female adds context
- Shows contrasting perspectives on the call

#### Random Button (🎤 Mode) - ⭐ **Main Feature**
- **Seeded Conversation Starter**: AI generates topic based on game analytics
- **Freeform Dialogue**: 10 alternating lines of natural conversation
- **Personality Adherence**: Male stays snarky, female stays optimistic
- **Max 10 Lines**: Enforced termination for realistic timing

## 🎭 Announcer Personalities

### Male Announcer Profile
```
- Location: New York
- Personality: Snarky, sarcastic, slightly cranky
- Team Loyalty: NY Rangers fan, hates Islanders
- Style: Dry humor, strong opinions on East Coast teams
- Voice Settings: Lower pitch, slower rate for authority
```

### Female Announcer Profile  
```
- Personality: Optimistic, cheerful, fun
- Team Preference: Loves all teams, slight Red Wings bias
- Style: Balances snark with positivity, adds trivia
- Interaction: Teases male lightly when he gets cranky
- Voice Settings: Higher pitch, normal rate for energy
```

## 🔧 Technical Architecture

### API Flow
```
Frontend (AnnouncerControls) 
    ↓ {gameId, announcerMode: 'dual'}
Backend Endpoint 
    ↓ Check announcerMode
generateDualXXXAnnouncement() 
    ↓ OpenAI GPT-4 API
JSON conversation array
    ↓ Return to frontend
playDualAnnouncement() 
    ↓ Browser TTS with voice switching
Audio playback with progress tracking
```

### Conversation Format
```javascript
[
  {"speaker": "male", "text": "Opening line from male"},
  {"speaker": "female", "text": "Female response"},
  {"speaker": "male", "text": "Male counter-response"},
  // ... continues alternating
]
```

## 🚀 Getting Started

### Prerequisites
- OpenAI API key configured in environment variables
- Node.js backend with announcer service enabled
- Modern browser with Speech Synthesis API support

### Testing
```bash
# Test dual announcer functionality (requires OpenAI API key)
cd backend
node testDualAnnouncer.js
```

### Integration
The feature is fully integrated and will automatically work when:
1. User selects 🎤 dual announcer mode
2. Clicks Goal, Penalty, or Random buttons
3. Backend has OpenAI API access
4. Browser supports Speech Synthesis API

## 🎯 Use Cases

### Goal Celebrations
```
Male: "GOAL! McDavid strikes again for the Oilers!"
Female: "What a beautiful shot! That's his second of the night!"
Male: "Assisted by Draisaitl. Pretty solid combo there."
Female: "The crowd is going wild! Edmonton leads 3-2!"
Male: "Not bad for a power play goal, I'll give them that."
Female: "Hockey at its finest! What an exciting game!"
```

### Random Commentary Examples
- Hot player discussions
- Team rivalry banter  
- Historical hockey facts
- Game situation analysis
- Playoff implications
- Fan trivia and stats

## 🎵 Audio Experience

- **Seamless Transitions**: Small pauses between speakers
- **Voice Differentiation**: Male (lower pitch) vs Female (higher pitch)  
- **Progress Tracking**: Visual progress bar for full conversation
- **Wake Lock**: Keeps screen active during long conversations
- **Fallback Support**: Graceful degradation if TTS fails

## 🏗️ Future Enhancements

1. **Custom Voice Profiles**: Admin-configurable announcer personalities
2. **Team-Specific Banter**: Rivalry-based conversation topics
3. **Season Context**: Playoff race and standings awareness
4. **Player History**: Deep stats integration for richer commentary
5. **Fan Interaction**: Social media trend integration

## 📋 File Structure
```
frontend/src/components/
  └── AnnouncerControls.jsx (updated with dual mode)

backend/
  ├── announcerService.js (new dual functions)
  ├── server.js (updated endpoints)
  └── testDualAnnouncer.js (test script)
```

This feature transforms the announcer panel from simple TTS into dynamic, personality-driven sports commentary that feels like real broadcast partners discussing the game!
