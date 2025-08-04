# 🎯 STUDIO VOICE SETUP FOR AZURE - STEP BY STEP

## Why Studio Voices Aren't Working
The code is correctly configured for Studio voices, but Google Cloud credentials are missing from the Azure deployment. Here's how to fix it:

## Step 1: Create Google Cloud Project & Service Account

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" 
3. Name it: `hockey-announcer-tts`
4. Click "Create"

### 1.2 Enable Text-to-Speech API
1. In the new project, go to "APIs & Services" > "Library"
2. Search for "Cloud Text-to-Speech API"
3. Click "Enable"

### 1.3 Enable Billing (Required for Studio Voices)
1. Go to "Billing" in the Google Cloud Console
2. Link a billing account (Studio voices require paid plan)
3. **IMPORTANT**: Studio voices are premium and cost more than Neural2 voices

### 1.4 Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `hockey-tts-service`
4. Description: `TTS service for hockey announcer`
5. Click "Create and Continue"
6. Grant role: `Cloud Text-to-Speech User`
7. Click "Done"

### 1.5 Generate Key File
1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - file downloads automatically
6. **SAVE THIS FILE SECURELY** - it's your credentials

## Step 2: Configure Azure App Service

### 2.1 Get JSON Content
1. Open the downloaded JSON file
2. Copy the ENTIRE content (it should look like this):
```json
{
  "type": "service_account",
  "project_id": "hockey-announcer-tts",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg...",
  "client_email": "hockey-tts-service@hockey-announcer-tts.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### 2.2 Add to Azure Environment Variables
1. Go to [Azure Portal](https://portal.azure.com)
2. Find your App Service (scorekeeper backend)
3. Go to "Configuration" > "Application settings"
4. Click "New application setting"
5. Add this setting:
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: (paste the ENTIRE JSON content from step 2.1)
6. Click "OK"
7. Click "Save" at the top
8. **RESTART the App Service** for changes to take effect

## Step 3: Verify Studio Voices Work

### 3.1 Test the Backend
1. After restarting Azure App Service, check the logs
2. You should see: `"🔑 Using Azure environment JSON credentials for Google Cloud TTS"`
3. Then: `"✅ Google Cloud TTS client initialized successfully - Studio voices available!"`

### 3.2 Test Studio Voice Quality
1. Go to your deployed app
2. Trigger an announcement (goal or penalty)
3. Listen for dramatically improved voice quality
4. Studio-O should sound much more natural and expressive
5. Studio-M should sound authoritative and professional

## Step 4: Monitor Costs

Studio voices cost more than Neural2:
- **Neural2**: ~$16 per 1 million characters
- **Studio**: ~$100 per 1 million characters

The app is configured with smart fallback:
1. First tries Studio voice
2. Falls back to Neural2 if Studio unavailable
3. Falls back to browser TTS if Google Cloud unavailable

## Troubleshooting

### If Studio Voices Still Don't Work:
1. Check Azure App Service logs for TTS initialization messages
2. Verify the JSON is valid (no syntax errors)
3. Ensure billing is enabled in Google Cloud project
4. Check that Text-to-Speech API is enabled
5. Try restarting the Azure App Service

### If You Get "Invalid Voice Name" Error:
- Studio voices might not be available in all regions
- Check Google Cloud TTS documentation for Studio voice availability
- The app will automatically fall back to Neural2 voices

### Cost Management:
- Set up billing alerts in Google Cloud Console
- Monitor usage in Google Cloud Console > Text-to-Speech
- Consider switching back to Neural2 if costs are too high

## Alternative: Azure Speech Services

If Google Cloud Studio voices are too expensive, we can switch to Azure Speech Services premium voices:
- Already integrated with your Azure infrastructure
- Comparable quality to Google Neural2
- Potentially lower cost due to Azure integration

Let me know if you want to explore the Azure Speech Services option instead!

---

## DEPLOYMENT CHECKLIST

✅ Google Cloud project created  
✅ Text-to-Speech API enabled  
✅ Billing enabled (required for Studio voices)  
✅ Service account created with TTS role  
✅ JSON key downloaded  
✅ Azure environment variable `GOOGLE_APPLICATION_CREDENTIALS_JSON` set  
✅ Azure App Service restarted  
✅ Tested announcements for improved quality  

After completing these steps, your hockey announcer should have hyper-realistic Studio voice quality!
