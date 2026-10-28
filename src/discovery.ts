import { isPastActivity } from './scheduling';
export type DiscoverableHangout={id:string;title:string;description:string;location:string;category:string;status:string;starts_at:string};
export const defaultDiscoveryFilters={query:'',category:'All',date:'',history:false};
export function manilaDate(value:string){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const part=(name:string)=>parts.find(p=>p.type===name)?.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function matchesDiscovery(h:DiscoverableHangout,filters:typeof defaultDiscoveryFilters,now=Date.now()){
 return (filters.history||!isPastActivity(h,now))&&(filters.category==='All'||h.category===filters.category)&&(!filters.date||manilaDate(h.starts_at)===filters.date)&&`${h.title} ${h.description} ${h.location}`.toLowerCase().includes(filters.query.trim().toLowerCase());
}
