export function getMissingPublicEnvVars() {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return missing;
}

export function hasRequiredPublicEnvVars() {
  return getMissingPublicEnvVars().length === 0;
}

export function getMissingAiEnvVars() {
  return process.env.OPENAI_API_KEY?.trim() ? [] : ["OPENAI_API_KEY"];
}

export function hasRequiredAiEnvVars() {
  return getMissingAiEnvVars().length === 0;
}

export function getRequiredPublicEnv() {
  const missing = getMissingPublicEnvVars();
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Add them to .env.local.`
    );
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}
