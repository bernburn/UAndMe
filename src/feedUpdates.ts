export function countNewUpdates(currentPosts:{id:string}[],currentHangouts:{id:string}[],latestPosts:{id:string}[],latestHangouts:{id:string}[]){
 const posts=new Set(currentPosts.map(p=>p.id)),hangouts=new Set(currentHangouts.map(h=>h.id));
 return new Set(latestPosts.filter(p=>!posts.has(p.id)).map(p=>'post:'+p.id).concat(latestHangouts.filter(h=>!hangouts.has(h.id)).map(h=>'hangout:'+h.id))).size;
}
