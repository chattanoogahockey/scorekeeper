# URGENT FIXES NEEDED

## 1. Studio Voice Issue (HIGH PRIORITY)
**Problem**: Studio voices not working because Google Cloud credentials not configured in Azure deployment.

**Root Cause**: 
- Local testing shows "Could not load the default credentials" error
- Studio voices require GOOGLE_APPLICATION_CREDENTIALS environment variable
- Azure App Service doesn't have Google Cloud credentials configured

**Solutions**:

### Option A: Configure Google Cloud in Azure (Recommended for Studio voices)
1. Create Google Cloud service account key
2. Add to Azure App Service environment variables:
   - GOOGLE_APPLICATION_CREDENTIALS_JSON=(service account JSON content)
3. Modify ttsService.js to handle JSON string credentials

### Option B: Switch to Azure Cognitive Services (Alternative premium solution)
- Use Azure Speech Services Premium voices
- Already integrated with Azure infrastructure
- May have comparable quality to Google Studio voices

## 2. Admin Delete Error
**Investigation Needed**: Check Azure logs for specific error details in DELETE endpoint

## 3. Period Buzzer Sound
**Missing Feature**: Need to implement period end buzzer functionality using existing buzzer.wav file

---

## IMMEDIATE ACTION PLAN

### Step 1: Fix Studio Voices (User's #1 Priority)
Configure Google Cloud credentials in Azure deployment

### Step 2: Debug Admin Delete  
Check actual error details from Azure logs

### Step 3: Add Period Buzzer
Implement buzzer sound trigger for period transitions

---

## Azure Configuration Needed:
```
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

## Code Changes Needed:
1. Update ttsService.js to handle JSON credentials from environment
2. Add period buzzer functionality
3. Enhanced error logging for admin delete
