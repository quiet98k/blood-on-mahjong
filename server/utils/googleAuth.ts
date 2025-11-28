import { OAuth2Client } from 'google-auth-library'

// Initialize Google OAuth client
let googleClient: OAuth2Client | null = null

export function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')
    }

    googleClient = new OAuth2Client(clientId, clientSecret, redirectUri)
  }

  return googleClient
}

export interface GoogleUserInfo {
  sub: string // Google user ID
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name?: string
  family_name?: string
  locale?: string
}

export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
  const client = getGoogleClient()
  
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  })

  const payload = ticket.getPayload()
  
  if (!payload) {
    throw new Error('Invalid token payload')
  }

  return {
    sub: payload.sub,
    email: payload.email!,
    email_verified: payload.email_verified!,
    name: payload.name!,
    picture: payload.picture!,
    given_name: payload.given_name,
    family_name: payload.family_name,
    locale: payload.locale
  }
}

export function getGoogleAuthUrl(): string {
  const client = getGoogleClient()
  
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  })
}

export async function getGoogleTokensFromCode(code: string) {
  const client = getGoogleClient()
  const { tokens } = await client.getToken(code)
  return tokens
}
