import {describe,it,expect} from 'vitest';
import {buildTimeline} from './timeline';
describe('campus timeline',()=>{
 it('interleaves posts and hangouts newest first by creation time',()=>{
  const timeline=buildTimeline([{id:'p',created_at:'2026-10-29T01:00Z'},{id:'p2',created_at:'2026-10-29T03:00Z'}],[{id:'h',created_at:'2026-10-29T02:00Z',starts_at:'2027-01-01T00:00Z'}]);
  expect(timeline.map(t=>t.value.id)).toEqual(['p2','h','p']);
 });
 it('retains cancelled activities so status can be shown',()=>expect(buildTimeline([],[{id:'h',created_at:'2026-10-29T02:00Z',status:'Cancelled'}])).toHaveLength(1));
 it('renders hangouts even without text posts',()=>expect(buildTimeline([],[{id:'h',created_at:'2026-10-29T02:00Z'}])[0].kind).toBe('hangout'));
 it('keeps equal timestamps deterministic and IDs distinct across tables',()=>expect(buildTimeline([{id:'same',created_at:'2026-10-29T02:00Z'}],[{id:'same',created_at:'2026-10-29T02:00Z'}]).map(t=>t.kind)).toEqual(['hangout','post']));
 it('does not mutate source arrays',()=>{const posts=[{id:'old',created_at:'2026-10-28T00:00Z'},{id:'new',created_at:'2026-10-29T00:00Z'}];buildTimeline(posts,[]);expect(posts[0].id).toBe('old');});
});
