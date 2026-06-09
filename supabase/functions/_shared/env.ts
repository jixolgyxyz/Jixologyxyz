export function getBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = Deno.env.get(name)?.trim().toLowerCase();

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return defaultValue;
}
