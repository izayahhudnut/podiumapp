const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? '';
const opsCompanionApiKey = process.env.EXPO_PUBLIC_OPSCOMPANION_API_KEY?.trim() ?? '';

const missingEnvKeys = [
  !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !supabaseKey ? 'EXPO_PUBLIC_SUPABASE_KEY' : null,
].filter((value): value is string => Boolean(value));

export const env = {
  supabaseUrl: supabaseUrl || null,
  supabaseKey: supabaseKey || null,
  opsCompanionApiKey: opsCompanionApiKey || null,
  isConfigured: missingEnvKeys.length === 0,
} as const;

export function getEnvErrorMessage() {
  if (missingEnvKeys.length === 0) {
    return null;
  }

  return `Missing ${missingEnvKeys.join(
    ' and ',
  )}. Add them to the EAS production env before publishing.`;
}
