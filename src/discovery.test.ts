import {describe,it,expect} from 'vitest';
import {matchesDiscovery,manilaDate,defaultDiscoveryFilters} from './discovery';
const h={id:'one',title:'UNO at the library',description:'All welcome',location:'Library',category:'Games',status:'Upcoming',starts_at:'2026-11-06T06:00:00Z'};
describe('Explore visibility',()=>{
 it('shows newly created future hangouts with default filters',()=>expect(matchesDiscovery(h,defaultDiscoveryFilters,0)).toBe(true));
 it('includes upcoming activities when history is enabled',()=>expect(matchesDiscovery(h,{...defaultDiscoveryFilters,history:true},0)).toBe(true));
 it('includes past activities only when history is enabled',()=>{expect(matchesDiscovery(h,defaultDiscoveryFilters,Date.parse('2026-11-07'))).toBe(false);expect(matchesDiscovery(h,{...defaultDiscoveryFilters,history:true},Date.parse('2026-11-07'))).toBe(true);});
 it('uses the Manila calendar date across UTC midnight',()=>expect(manilaDate('2026-11-05T17:00:00Z')).toBe('2026-11-06'));
 it('matches date and category independently',()=>{expect(matchesDiscovery(h,{...defaultDiscoveryFilters,date:'2026-11-06',category:'Games'},0)).toBe(true);expect(matchesDiscovery(h,{...defaultDiscoveryFilters,category:'Study'},0)).toBe(false);});
 it('ignores accidental outer whitespace in searches',()=>expect(matchesDiscovery(h,{...defaultDiscoveryFilters,query:'  UNO  '},0)).toBe(true));
});
