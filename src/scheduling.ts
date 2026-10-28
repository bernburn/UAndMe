export function manilaInputToIso(value:string):string {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Choose a valid Manila date and time.');
 const date=new Date(`${value}:00+08:00`);
 if(!Number.isFinite(date.getTime()))throw new Error('Choose a valid Manila date and time.');
 return date.toISOString();
}
export function isPastActivity(activity:{status:string;starts_at:string},now=Date.now()){
 return ['Cancelled','Completed'].includes(activity.status)||new Date(activity.starts_at).getTime()<=now;
}
