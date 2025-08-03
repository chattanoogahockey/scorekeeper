# Google Cloud Text-to-Speech Setup

This app now supports high-quality Google Cloud Text-to-Speech for announcer voices!

## Setup Instructions:

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Cloud Text-to-Speech API"

### 2. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create a new service account
3. Give it the "Cloud Text-to-Speech User" role
4. Generate and download a JSON key file

### 3. Configure Environment (Choose one method):

#### Method A: Environment Variable (Recommended)
```bash
# Set this environment variable to the path of your JSON key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

#### Method B: Azure App Service Configuration
1. In Azure Portal, go to your App Service
2. Go to Configuration > Application Settings
3. Add new setting:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS`
   - Value: Path to your uploaded key file, or JSON content as string

### 4. Voice Configuration
The app uses these voices:
- **Goal Announcements**: `en-US-Neural2-D` (Exciting male announcer voice)
- **Penalty Announcements**: `en-US-Neural2-A` (Authoritative male voice)

Both are configured with:
- Optimized speaking rate and pitch for sports announcing
- Volume boost for stadium atmosphere
- Headphone audio optimization

### 5. Testing
If Google TTS is not configured, the app will:
1. Log helpful setup instructions
2. Automatically fall back to browser text-to-speech
3. Continue working normally

### 6. Audio Features
- Real-time progress bar showing playback position
- Independent button states (goal/penalty)
- Automatic cleanup of old audio files (24 hours)
- High-quality MP3 output optimized for sports announcing

## Troubleshooting:
- Check the server logs for TTS initialization messages
- Verify API is enabled in Google Cloud Console
- Ensure service account has proper permissions
- Test with a simple text first

The announcer will sound like a real sports broadcaster! 🏒🎤
