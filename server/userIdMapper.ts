/**
 * USER ID MAPPING UTILITY
 * 
 * Handles multi-provider user ID formatting and provider detection
 * for Google SSO, GitHub SSO, X SSO, Apple SSO, and email authentication.
 */

export type AuthProvider = 'google' | 'github' | 'twitter' | 'apple' | 'email' | 'replit';

export interface UserIdMapping {
  provider: AuthProvider;
  rawId: string;
  formattedId: string;
}

/**
 * Provider prefix mapping for database storage
 */
const PROVIDER_PREFIXES: Record<AuthProvider, string> = {
  'google': 'google-oauth2',
  'github': 'github',
  'twitter': 'twitter', 
  'apple': 'apple',
  'email': 'email',
  'replit': 'replit'
};

/**
 * Detect authentication provider from claims or email domain
 */
export function detectAuthProvider(claims: any): AuthProvider {
  // Check for provider-specific indicators in claims
  if (claims.iss?.includes('accounts.google.com') || claims.email?.endsWith('@gmail.com')) {
    return 'google';
  }
  
  if (claims.iss?.includes('github.com') || claims.login) {
    return 'github';
  }
  
  if (claims.iss?.includes('twitter.com') || claims.iss?.includes('x.com')) {
    return 'twitter';
  }
  
  if (claims.iss?.includes('appleid.apple.com')) {
    return 'apple';
  }
  
  // Check if it's an email-based registration (no SSO provider)
  if (claims.email && !claims.iss?.includes('oauth')) {
    return 'email';
  }
  
  // Default to Replit for current system
  return 'replit';
}

/**
 * Format user ID with provider prefix for database storage
 */
export function formatUserIdForDatabase(provider: AuthProvider, rawId: string): string {
  const prefix = PROVIDER_PREFIXES[provider];
  return `${prefix}|${rawId}`;
}

/**
 * Parse formatted user ID back to components
 */
export function parseFormattedUserId(formattedId: string): UserIdMapping | null {
  const parts = formattedId.split('|');
  if (parts.length !== 2) {
    return null;
  }
  
  const [prefix, rawId] = parts;
  const provider = Object.entries(PROVIDER_PREFIXES).find(([_, p]) => p === prefix)?.[0] as AuthProvider;
  
  if (!provider) {
    return null;
  }
  
  return {
    provider,
    rawId,
    formattedId
  };
}

/**
 * Map user ID for database operations with backward compatibility
 */
export function mapUserIdForDatabase(claims: any): string {
  const rawId = claims.sub || claims.id;
  const userEmail = claims.email;
  
  // Handle nested claims structure from some authentication flows
  if (claims.claims && typeof claims.claims === 'object') {
    const nestedClaims = claims.claims;
    if (nestedClaims.sub && nestedClaims.sub.startsWith('google-oauth2|')) {
      // This is already a properly formatted database ID
      console.log(`🔐 USER_ID: Using existing formatted ID from nested claims: ${nestedClaims.sub}`);
      return nestedClaims.sub;
    }
  }
  
  // Handle legacy user (jemzyapp@gmail.com) - preserve original Auth0 format
  if (rawId === "43317410" || userEmail === "jemzyapp@gmail.com") {
    console.log(`🔐 USER_ID: Mapping legacy user to original Auth0 format`);
    return "google-oauth2|117032826996185616207";
  }
  
  // If no raw ID or email, this might be an invalid authentication state
  if (!rawId && !userEmail) {
    console.log(`🔐 USER_ID: Warning - No user identifier found in claims`);
    throw new Error('No valid user identifier found in authentication claims');
  }
  
  // Detect provider and format accordingly for new users
  const provider = detectAuthProvider(claims);
  const formattedId = formatUserIdForDatabase(provider, rawId);
  
  console.log(`🔐 USER_ID: Mapped user ID:`, {
    provider,
    rawId,
    formattedId,
    email: userEmail
  });
  
  return formattedId;
}

/**
 * Extract provider information from user ID for analytics/debugging
 */
export function getUserProviderInfo(formattedId: string): {
  provider: AuthProvider | null;
  rawId: string | null;
  isLegacyFormat: boolean;
} {
  // Check for legacy Auth0 format
  if (formattedId === "google-oauth2|117032826996185616207") {
    return {
      provider: 'google',
      rawId: '117032826996185616207',
      isLegacyFormat: true
    };
  }
  
  const parsed = parseFormattedUserId(formattedId);
  if (!parsed) {
    return {
      provider: null,
      rawId: null,
      isLegacyFormat: false
    };
  }
  
  return {
    provider: parsed.provider,
    rawId: parsed.rawId,
    isLegacyFormat: false
  };
}

/**
 * Validate user ID format
 */
export function isValidUserIdFormat(userId: string): boolean {
  return parseFormattedUserId(userId) !== null || userId === "google-oauth2|117032826996185616207";
}

/**
 * Get provider display name for UI
 */
export function getProviderDisplayName(provider: AuthProvider): string {
  const displayNames: Record<AuthProvider, string> = {
    'google': 'Google',
    'github': 'GitHub',
    'twitter': 'X (Twitter)',
    'apple': 'Apple',
    'email': 'Email',
    'replit': 'Replit'
  };
  
  return displayNames[provider];
}