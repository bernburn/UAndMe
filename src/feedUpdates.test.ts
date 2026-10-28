import {describe,it,expect} from 'vitest';
import {countNewUpdates} from './feedUpdates';
describe('new updates prompt',()=>{
 it('does not announce existing items',()=>expect(countNewUpdates([{id:'a'}],[],[{id:'a'}],[])).toBe(0));
 it('counts posts and hangouts independently',()=>expect(countNewUpdates([],[],[{id:'same'}],[{id:'same'}])).toBe(2));
 it('does not double count a fetched item',()=>expect(countNewUpdates([],[],[{id:'a'},{id:'a'}],[])).toBe(1));
});
