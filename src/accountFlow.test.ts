import { describe, expect, it } from 'vitest';
import { accountDestination, errorMessage } from './accountFlow';
describe('account onboarding',()=>{
 it('keeps onboarding open after a photo-only update',()=>expect(accountDestination({created_at:'2026-10-29T02:00:00Z',updated_at:'2026-10-29T02:01:00Z',profile_completed_at:null})).toBe('profile'));
 it('opens the feed for an explicitly completed profile',()=>expect(accountDestination({created_at:'2026-10-29T02:00:00Z',updated_at:'2026-10-29T02:01:00Z',profile_completed_at:'2026-10-29T02:01:00Z'})).toBe('feed'));
 it('opens profile setup for a newly provisioned student',()=>expect(accountDestination({created_at:'2026-10-29T02:00:00Z',updated_at:'2026-10-29T02:00:00Z'})).toBe('profile'));
 it('opens the feed after a persisted first profile save',()=>expect(accountDestination({created_at:'2026-10-29T02:00:00Z',updated_at:'2026-10-29T02:01:00Z'})).toBe('feed'));
 it('preserves Supabase database error messages',()=>expect(errorMessage({message:'Permission denied'},'Failed')).toBe('Permission denied'));
 it('handles unexpected error responses',()=>expect(errorMessage(null,'Please try again')).toBe('Please try again'));
});
