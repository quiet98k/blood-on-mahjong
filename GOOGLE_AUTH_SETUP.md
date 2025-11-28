# Google OAuth Setup Guide

## Step 1: Install Required Package

```bash
npm install google-auth-library
```

## Step 2: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Mahjong Game"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
     - `http://localhost:3000` (for frontend)
   - Click "Create"
5. Copy Client ID and Client Secret

## Step 3: Configure Environment Variables

Add to your `.env` file:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=app

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Step 4: Test Google OAuth

### Method 1: Backend OAuth Flow (Redirect)

```bash
# 1. Get auth URL
curl http://localhost:3000/api/auth/google/login

# Response will include:
# {
#   "success": true,
#   "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
# }

# 2. Open the authUrl in browser
# 3. Sign in with Google
# 4. You'll be redirected to /api/auth/google/callback
# 5. Backend will create/update user and return user info
```

### Method 2: Frontend Token Verification (Recommended)

This method uses Google Sign-In button in your frontend:

```html
<!-- Add to your frontend HTML -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleGoogleSignIn">
</div>
<div class="g_id_signin" data-type="standard"></div>

<script>
async function handleGoogleSignIn(response) {
  // Send ID token to your backend
  const result = await fetch('/api/auth/google/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: response.credential })
  });
  
  const data = await result.json();
  console.log('User:', data.user);
  
  // Store user info in your app
  localStorage.setItem('user', JSON.stringify(data.user));
}
</script>
```

## Step 5: Test with curl

```bash
# This won't work directly with curl because Google OAuth requires browser
# But you can simulate it with a test token

# 1. Get a test ID token from Google OAuth Playground
# Go to: https://developers.google.com/oauthplayground/
# - Select "Google OAuth2 API v2"
# - Authorize APIs
# - Exchange authorization code for tokens
# - Copy the "id_token"

# 2. Test verification endpoint
curl -X POST http://localhost:3000/api/auth/google/verify \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_ID_TOKEN_HERE"
  }'
```

## Step 6: Check Database

After successful Google login, check MongoDB:

```bash
mongosh
use app
db.users.find({ oauthProvider: "google" }).pretty()
```

You should see:
```json
{
  "userId": "uuid",
  "email": "user@gmail.com",
  "name": "User Name",
  "avatar": "https://lh3.googleusercontent.com/...",
  "oauthProvider": "google",
  "oauthId": "google-user-id",
  "createdAt": ISODate("..."),
  "lastLoginAt": ISODate("..."),
  "stats": { ... }
}
```

## API Endpoints

### GET /api/auth/google/login
Get Google OAuth URL for redirect-based login.

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### GET /api/auth/google/callback
Handles redirect from Google (automatic).

**Query Params:**
- `code`: Authorization code from Google

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "avatar": "https://...",
    "oauthProvider": "google"
  }
}
```

### POST /api/auth/google/verify
Verify Google ID token (for frontend-initiated login).

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "isNewUser": false,
  "user": {
    "userId": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "avatar": "https://...",
    "oauthProvider": "google",
    "stats": { ... }
  }
}
```

## Troubleshooting

### Error: "google-auth-library not found"
```bash
npm install google-auth-library
```

### Error: "Google OAuth credentials not configured"
Check your `.env` file has:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Error: "redirect_uri_mismatch"
Make sure the redirect URI in Google Cloud Console matches exactly:
`http://localhost:3000/api/auth/google/callback`

### Users not appearing in MongoDB
1. Check MongoDB is running: `mongosh`
2. Check database name: `use app` then `show collections`
3. Verify users collection: `db.users.find().pretty()`

## Production Considerations

1. **HTTPS Required**: Google OAuth requires HTTPS in production
2. **Update Redirect URI**: Add production URL to Google Console
3. **Secure Tokens**: Implement JWT or session management
4. **Environment Variables**: Use secure secret management
5. **CORS**: Configure CORS for your frontend domain

## Complete Frontend Example (Vue 3)

```vue
<template>
  <div>
    <div v-if="!user">
      <div id="g_id_onload"
           :data-client_id="googleClientId"
           data-callback="handleGoogleSignIn">
      </div>
      <div class="g_id_signin"></div>
    </div>
    
    <div v-else>
      <img :src="user.avatar" />
      <p>Welcome, {{ user.name }}!</p>
      <button @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const googleClientId = 'your-client-id.apps.googleusercontent.com'
const user = ref(null)

onMounted(() => {
  // Load Google Sign-In script
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
  
  // Make callback global
  window.handleGoogleSignIn = handleGoogleSignIn
  
  // Check if user is already logged in
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    user.value = JSON.parse(savedUser)
  }
})

async function handleGoogleSignIn(response) {
  const result = await fetch('/api/auth/google/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: response.credential })
  })
  
  const data = await result.json()
  
  if (data.success) {
    user.value = data.user
    localStorage.setItem('user', JSON.stringify(data.user))
    console.log('Logged in:', data.user)
  }
}

function logout() {
  user.value = null
  localStorage.removeItem('user')
}
</script>
```

## Next Steps

1. Install package: `npm install google-auth-library`
2. Get Google OAuth credentials
3. Add credentials to `.env`
4. Restart Nuxt dev server
5. Test with frontend or OAuth Playground
6. Check MongoDB for user creation

Need help? Check the error logs in your terminal where `npm run dev` is running.
