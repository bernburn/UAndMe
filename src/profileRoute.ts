export function readCampusRoute(hash:string):{page:string;person:string|null}{
 const profile=hash.match(/^#profile\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
 if(profile)return {page:'Profile',person:profile[1]};
 const pages=['Home','Explore','Create','Notifications','Profile','Moderation'];
 return {page:pages.find(p=>hash.toLowerCase()==='#'+p.toLowerCase())||'Home',person:null};
}
