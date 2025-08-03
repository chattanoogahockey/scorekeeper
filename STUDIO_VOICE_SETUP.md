# 🎙️ STUDIO VOICE SETUP GUIDE

## Current Status: Studio Voices Not Working
**Problem**: Google Cloud credentials not configured in Azure deployment
**Solution**: Set up service account credentials for Studio voice access

---

## Step 1: Create Google Cloud Service Account

### In Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing project
3. Enable **Cloud Text-to-Speech API**
4. Go to **IAM & Admin** > **Service Accounts**
5. Click **Create Service Account**
6. Name: `hockey-announcer-tts`
7. Role: **Cloud Text-to-Speech User**
8. Create and download **JSON key file**

---

## Step 2: Configure Azure App Service

### In Azure Portal:
1. Go to your App Service
2. **Configuration** > **Application settings**
3. Add new setting:
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: (paste entire JSON content from downloaded key file)

### Example JSON structure:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "hockey-announcer-tts@your-project.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## Step 3: Verify Studio Voice Availability

Studio voices may have regional restrictions:
- **Available regions**: US, EU (check Google Cloud docs)
- **Billing required**: Studio voices are premium (small cost)
- **Project limits**: May need quota increase

---

## Step 4: Deploy Updated Code

The TTS service has been updated to:
1. ✅ Accept JSON credentials from Azure environment
2. ✅ Prioritize Studio-O and Studio-M voices  
3. ✅ Smart fallback to Neural2 voices
4. ✅ Enhanced error logging

---

## Expected Results After Setup:

### ✅ Studio Voice Success:
```
🔑 Using Azure environment JSON credentials for Google Cloud TTS
✅ Google Cloud TTS client initialized successfully - Studio voices available!
🎯 Using Studio-O voice for: "Goal scored by Johnson..."
```

### ❌ Still Using Fallback:
```
⚠️ Studio voice not available, using Neural2-D (still excellent quality)
```

**If you see fallback messages**: Check billing, regional availability, or quota limits.

---

## Next Steps:
1. Create service account in Google Cloud
2. Add JSON credentials to Azure App Service environment
3. Restart Azure App Service
4. Test announcer - should be Studio quality!
