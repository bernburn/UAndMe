import {describe,it,expect} from 'vitest';
import {photoError} from './photoValidation';
describe('profile photos',()=>{
 it('accepts supported photos at the size boundary',()=>expect(photoError({type:'image/png',size:2097152})).toBeNull());
 it('rejects oversized photos',()=>expect(photoError({type:'image/jpeg',size:2097153})).toBeTruthy());
 it('rejects SVG and unsupported file types',()=>expect(photoError({type:'image/svg+xml',size:100})).toBeTruthy());
 it('rejects empty files',()=>expect(photoError({type:'image/webp',size:0})).toBeTruthy());
});
