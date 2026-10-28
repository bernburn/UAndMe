import { describe,it,expect } from 'vitest';
import { manilaInputToIso,isPastActivity } from './scheduling';
describe('Manila hangout scheduling',()=>{
 it('stores afternoon Manila time as UTC',()=>expect(manilaInputToIso('2026-11-06T14:00')).toBe('2026-11-06T06:00:00.000Z'));
 it('handles the UTC day boundary',()=>expect(manilaInputToIso('2026-11-06T01:00')).toBe('2026-11-05T17:00:00.000Z'));
 it('rejects timezone-free malformed dates',()=>expect(()=>manilaInputToIso('tomorrow')).toThrow());
 it('includes cancelled future activities in history',()=>expect(isPastActivity({status:'Cancelled',starts_at:'2026-11-06T06:00Z'},0)).toBe(true));
 it('keeps upcoming activities out of history',()=>expect(isPastActivity({status:'Upcoming',starts_at:'2026-11-06T06:00Z'},0)).toBe(false));
 it('distinguishes elapsed activities',()=>expect(isPastActivity({status:'Upcoming',starts_at:'2026-11-06T06:00Z'},Date.parse('2026-11-07'))).toBe(true));
});
