type DatedItem={id:string;created_at:string};
export type TimelineEntry<P,H>={kind:'post';value:P}|{kind:'hangout';value:H};
export function buildTimeline<P extends DatedItem,H extends DatedItem>(posts:P[],hangouts:H[]):TimelineEntry<P,H>[] {
 const entries:TimelineEntry<P,H>[]=[...posts.map(value=>({kind:'post' as const,value})),...hangouts.map(value=>({kind:'hangout' as const,value}))];
 return entries.sort((a,b)=>Date.parse(b.value.created_at)-Date.parse(a.value.created_at)||`${a.kind}:${a.value.id}`.localeCompare(`${b.kind}:${b.value.id}`));
}
