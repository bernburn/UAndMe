export function accountDestination(profile: {created_at: string; updated_at: string;profile_completed_at?:string|null}): 'profile'|'feed' {
 if('profile_completed_at' in profile)return profile.profile_completed_at?'feed':'profile';
 // Backward-compatible fallback for earlier profile records.
 return profile.updated_at === profile.created_at ? 'profile' : 'feed';
}
export function errorMessage(error: unknown, fallback: string): string {
 return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;
}
