import {type ReactNode} from 'react';
import {supabase} from './supabase';
import {usePagedList,PAGE_SIZE} from './usePagedList';
import {type Activity} from './PagedExplore';
export function JoinedHangouts({userId,revision,renderCard}:{userId:string;revision:number;renderCard:(h:Activity)=>ReactNode}){
 const list=usePagedList<Activity>(`${userId}:${revision}`,async offset=>{
  const {data,error}=await supabase!.from('join_requests').select('created_at,hangouts!inner(*)').eq('user_id',userId).eq('status','Approved').order('created_at',{ascending:false}).order('hangout_id').range(offset,offset+PAGE_SIZE);
  if(error)throw error;return {rows:data.slice(0,PAGE_SIZE).map(r=>r.hangouts) as unknown as Activity[],more:data.length>PAGE_SIZE};
 });
 return <><p className="list-hint">Approved activities, including past and cancelled hangouts. Activities you left are excluded.</p><div className="hangout-grid">{list.rows.map(renderCard)}</div>{list.loading&&<p role="status" className="muted">Loading joined hangouts…</p>}{list.error&&<p role="alert" className="error">{list.error}<button className="switch" onClick={()=>void list.next()}>Retry</button></p>}{!list.loading&&!list.error&&!list.rows.length&&<p className="muted">No joined hangouts yet.</p>}{list.more&&<button className="quiet list-more" disabled={list.loading} onClick={()=>void list.next()}>Load more joined hangouts</button>}</>;
}
