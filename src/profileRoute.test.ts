import {describe,it,expect} from 'vitest';
import {readCampusRoute} from './profileRoute';
describe('profile navigation',()=>{
 it('opens a direct student profile',()=>expect(readCampusRoute('#profile/20000000-0000-0000-0000-000000000002')).toEqual({page:'Profile',person:'20000000-0000-0000-0000-000000000002'}));
 it('supports the signed-in profile tab',()=>expect(readCampusRoute('#profile')).toEqual({page:'Profile',person:null}));
 it('restores Explore through browser history',()=>expect(readCampusRoute('#explore').page).toBe('Explore'));
 it('rejects malformed profile links',()=>expect(readCampusRoute('#profile/not-a-user').page).toBe('Home'));
});
