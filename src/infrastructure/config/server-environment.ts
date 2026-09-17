type Environment = Readonly<Record<string, string | undefined>>;

export function aiAvailable(env: Environment = process.env) {
  const enabled = env.AI_MODE === 'live' || (!env.VERCEL && env.AI_MODE === undefined);
  return enabled && Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'sk-your-key');
}

export function sameOrigin(request: Request, env: Environment = process.env) {
  const value = request.headers.get('origin');
  if (!value) {
    return false;
  }
  try {
    const origin = new URL(value);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== value) {
      return false;
    }
    const allowed = new Set<string>();
    const appUrl =
      env.APP_URL || (env.VERCEL_ENV === 'production' ? 'https://chgumi.vercel.app' : undefined);
    if (appUrl) {
      allowed.add(new URL(appUrl).origin);
    }
    if (env.VERCEL_URL) {
      allowed.add(new URL(`https://${env.VERCEL_URL}`).origin);
    }
    if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowed.add(new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`).origin);
    }
    if (allowed.size > 0) {
      return allowed.has(origin.origin);
    }
    const url = new URL(request.url);
    return origin.protocol === url.protocol && origin.host === request.headers.get('host');
  } catch {
    return false;
  }
}
