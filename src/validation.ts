export function validateProfile(name: string, bio: string, interests: string[]) {
  if (name.trim().length < 2 || name.trim().length > 60) return 'Your display name must contain 2–60 characters.';
  if (bio.length > 300) return 'Keep your bio within 300 characters.';
  if (interests.length > 10 || interests.some(i => i.length > 30)) return 'Choose up to 10 interests, each under 31 characters.';
  return null;
}
