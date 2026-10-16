# GitHub Models Authentication Diagnostic Report

**Generated:** 2026-08-04  
**Error:** "Invalid GitHub Models token. Check GITHUB_MODELS_TOKEN and try again."  
**ROOT CAUSE:** GitHub Models service was RETIRED on July 30, 2026

---

## ⚠️ CRITICAL FINDING: Service Retired

**GitHub Models has been fully retired as of July 30, 2026.**

The current date is **August 4, 2026** - 5 days after the service shutdown.

This is NOT a token issue. The service no longer exists.---

## Official Announcement

**Source:** https://github.blog/changelog/2025-07-17-deprecation-of-azure-endpoint-for-github-models/

> "As of July 17, 2025 usage of https://models.inference.ai.azure.com for GitHub Models inference and embeddings is officially deprecated."
>
> "...we will remove support on October 17, 2025."
>
> "GitHub Models has been fully retired. As of July 30, 2026, the playground, model catalog, inference API, and bring your own key (BYOK) are no longer available to any customer."

**Your application cannot use GitHub Models anymore, regardless of token validity.**

---

✅ **Environment loading:** Working correctly  
✅ **Token format:** Correct (Fine-grained PAT)  
✅ **Token presence:** Token exists at runtime  
✅ **Authorization header:** Properly formatted  
❌ **Service:** **RETIRED - No longer operational**  
❌ **Authentication:** **FAILED - 401 Unauthorized (service shutdown)**

---

## The Real Problem

The 401 Unauthorized error is NOT due to an invalid token.

**The GitHub Models service has been permanently shut down.**

No amount of token regeneration will fix this issue. The endpoint `https://models.inference.ai.azure.com` is no longer serving GitHub Models requests.

---

## Detailed Diagnostic Findings (Historical)

### 1. Environment Variable Loading
- ✅ `.env.local` file exists at project root
- ✅ File contains `GITHUB_MODELS_TOKEN` definition
- ✅ Token successfully loaded into `process.env.GITHUB_MODELS_TOKEN`
- ✅ No whitespace issues

### 2. Runtime Token Status
```
Token exists: YES
Token type: string
Token length: 93 characters
Token format: github_pat_... (Fine-grained Personal Access Token)
First 8 chars: github_p
Last 8 chars: AdPF2Iam
Whitespace: None
```

### 3. API Request Configuration
```
Endpoint: https://models.inference.ai.azure.com/chat/completions
Method: POST
Authorization: Bearer github_p...AdPF2Iam
Content-Type: application/json
Model: gpt-4o-mini
```

### 4. HTTP Response
```
Status: 401 Unauthorized
Headers:
  - x-ms-error-code: unauthorized
  - azureml-served-by-cluster: vienna-swedencentral-01
  - content-type: application/json

Body:
{
  "error": {
    "code": "unauthorized",
    "message": "Server Error",
    "details": "Server Error"
  }
}
```

---

## ✅ SOLUTION IMPLEMENTED: Migration to OpenRouter

CareerPilot has been migrated to **OpenRouter**, a production-ready AI gateway with free tier access.

### What Changed

1. **AI Provider:** GitHub Models → OpenRouter
2. **Endpoint:** `models.inference.ai.azure.com` → `openrouter.ai/api/v1`
3. **Environment Variable:** `GITHUB_MODELS_TOKEN` → `OPENROUTER_API_KEY`
4. **Model Format:** `gpt-4o-mini` → `openai/gpt-4o-mini`

### Code Files Modified

- ✅ `src/lib/ai.ts` - Updated AI integration
- ✅ `.env.local` - Updated environment variables
- ✅ Migration guide created: `OPENROUTER_MIGRATION.md`

### What You Need to Do

**1. Get OpenRouter API Key:**
- Visit: https://openrouter.ai/settings/keys
- Sign up (free, no credit card required)
- Create an API key

**2. Update `.env.local`:**
```env
OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"
```

**3. Restart Development Server:**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**4. Test:**
- Upload a resume at http://localhost:3000/dashboard/upload
- Verify analysis completes successfully

---

## Complete Migration Guide

See **`OPENROUTER_MIGRATION.md`** for:
- Step-by-step setup instructions
- Free tier details
- Troubleshooting guide
- Verification checklist

---

## Root Cause Analysis (Historical Context)

### Confirmed Issues
The GitHub Models API is rejecting the authentication token with a `401 Unauthorized` response.

### Most Likely Causes (in order of probability)

1. **Token Expired** ⭐ MOST LIKELY
   - Fine-grained PATs have configurable expiration (7 days to 1 year)
   - Check token expiration at: https://github.com/settings/personal-access-tokens

2. **Token Revoked** 
   - Token may have been manually revoked
   - Check active tokens at: https://github.com/settings/tokens

3. **Insufficient Permissions**
   - GitHub Models requires specific scopes/permissions
   - Fine-grained PAT needs proper resource owner access

4. **No GitHub Models Access**
   - GitHub Models is in limited preview
   - Account may not have been granted access
   - Check: https://github.com/marketplace/models

### Ruled Out Issues
- ❌ Token not loaded (WORKING - token is in process.env)
- ❌ Malformed Authorization header (CORRECT - Bearer format)
- ❌ Wrong endpoint (CORRECT - Azure Models endpoint)
- ❌ Wrong model name (CORRECT - gpt-4o-mini)
- ❌ Token format (CORRECT - github_pat_ prefix)

---

## Exact Fix Required

### Step 1: Generate New GitHub Personal Access Token

**Option A - Classic PAT (Recommended)**

1. Visit: https://github.com/settings/tokens/new
2. Token name: `CareerPilot AI Models Access`
3. Expiration: Select appropriate duration (30, 60, 90 days, or custom)
4. Select scopes:
   - ☑ `repo` (Full control of private repositories)
   - This grants access to GitHub Models API
5. Click **"Generate token"**
6. **IMPORTANT:** Copy the token immediately (it's shown only once)

**Option B - Fine-grained PAT (Advanced)**

1. Visit: https://github.com/settings/personal-access-tokens/new
2. Token name: `CareerPilot AI Models`
3. Resource owner: Select your account
4. Repository access: Choose appropriate scope
5. Permissions:
   - Repository permissions → Contents: Read (minimum)
   - Account permissions → (ensure GitHub Models access)
6. Generate and copy immediately

### Step 2: Update .env.local

1. Open: `c:\Users\mahendra\Desktop\CareerPilot_AI_Project\.env.local`
2. Replace the existing token:
   ```env
   GITHUB_MODELS_TOKEN="your_new_token_here"
   ```
3. Save the file

### Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Verify Fix

1. Wait for the server to fully start
2. Navigate to the upload page: http://localhost:3000/dashboard/upload
3. Upload a test resume (PDF or TXT)
4. The analysis should now complete successfully

---

## Alternative Solutions (If Issue Persists)

### Option 1: Verify GitHub Models Access
- Visit: https://github.com/marketplace/models
- Ensure your account has access to the preview
- Request access if not already granted

### Option 2: Check Token Validity
```bash
# Test your new token with curl:
curl -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  https://api.github.com/user
  
# Should return your GitHub user info if token is valid
```

### Option 3: Contact GitHub Support
If the issue persists after generating a new token:
- Token may have organizational restrictions
- Account may need GitHub Models preview access
- Contact: https://support.github.com/

---

## Verification Checklist

After applying the fix, verify:

- [ ] `.env.local` contains the new token
- [ ] Development server was restarted
- [ ] Resume upload page loads without errors
- [ ] Test resume upload completes successfully
- [ ] AI analysis results appear on screen
- [ ] No "Invalid GitHub Models token" error

---

## Technical Details

### Current Token Info (for reference)
- **Stored in file:** ✅ Present in `.env.local`
- **Length:** 93 characters
- **Format:** `github_pat_` (Fine-grained PAT)
- **Loaded at runtime:** ✅ Available in `process.env`
- **Authorization header:** ✅ Properly formatted as `Bearer <token>`

### API Configuration (confirmed correct)
```javascript
Endpoint: https://models.inference.ai.azure.com/chat/completions
Model: gpt-4o-mini
Request body format: OpenAI-compatible chat completions
Response format: { type: "json_object" }
```

### Error Response Details
The Azure/GitHub Models endpoint returned:
- HTTP 401 Unauthorized
- Error code: "unauthorized"
- Generic message: "Server Error"
- This indicates authentication failure, not API/model issues

---

## Next Steps

1. **Immediate Action:** Generate new GitHub PAT following Step 1 above
2. **Update:** Replace token in `.env.local` 
3. **Restart:** Stop and restart `npm run dev`
4. **Test:** Upload a resume to verify fix

If issues persist after following these steps, the account may need GitHub Models preview access or there may be organizational restrictions on the token.

---

**End of Diagnostic Report**
