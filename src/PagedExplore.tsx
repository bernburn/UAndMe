import {useEffect,useState,type ReactNode} from 'react';
import {Compass,Users} from 'lucide-react';
import {supabase} from './supabase';
import {usePagedList,PAGE_SIZE} from './usePagedList';
export type Activity={id:string;created_at:string;organizer_id:string;title:string;description:string;category:string;location:string;starts_at:string;capacity:number;status:string};
export function PagedExplore({revision,renderCard,onCreate}:{revision:number;renderCard:(h:Activity)=>ReactNode;onCreate:()=>void}){
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[category,setCategory]=useState('All'),[date,setDate]=useState(''),[history,setHistory]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query.trim()),250);return()=>clearTimeout(timer);},[query]);
 const list=usePagedList<Activity>(JSON.stringify([search,category,date,history,revision]),async offset=>{
  let q=supabase!.from('hangouts').select('*').order('starts_at').order('id').range(offset,offset+PAGE_SIZE);
  if(!history)q=q.not('status','in','(Cancelled,Completed)').gte('starts_at',new Date().toISOString());
  if(category!=='All')q=q.eq('category',category);
  if(date){const start=new Date(date+'T00:00:00+08:00');q=q.gte('starts_at',start.toISOString()).lt('starts_at',new Date(start.getTime()+86400000).toISOString());}
  const safe=search.replace(/[%,_().\\]/g,' ').trim();if(safe)q=q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%`);
  const {data,error}=await q;if(error)throw error;return {rows:data.slice(0,PAGE_SIZE),more:data.length>PAGE_SIZE};
 });
 const reset=()=>{setQuery('');setSearch('');setCategory('All');setDate('');setHistory(false);};
 return <div className="section-pad"><div className="explore-hero"><span className="eyebrow">MAKE ROOM FOR GOOD COMPANY</span><h2>Find your next campus moment.</h2><p className="muted">Small plans. New people. Good company.</p><div className="explore-count"><Users size={15}/> Discover your campus community</div></div><div className="explore-categories" aria-label="Quick category filters">{['All','Games','Study','Sports','Food','Casual','Other'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><label>Search activities<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="UNO, study session, lunch…"/></label><div className="filter-row explore-date-row"><button className="quiet clear-filters" onClick={reset}>Reset filters</button><label>Date (Manila)<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label className="check-label"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/> Include past and cancelled activities</label><div className="hangout-grid">{list.rows.map(renderCard)}</div>{list.loading&&<p className="muted" role="status">Loading activities…</p>}{list.error&&<p className="error" role="alert">{list.error}<button className="switch" onClick={()=>void list.next()}>Retry</button></p>}{list.more&&<button className="quiet list-more" disabled={list.loading} onClick={()=>void list.next()}>Load more hangouts</button>}{!list.loading&&!list.error&&!list.rows.length&&<div className="explore-empty"><Compass size={32}/><h3>No hangouts in this view</h3><p>Try another filter or make a little plan.</p><button className="primary" onClick={onCreate}>Create a hangout</button></div>}</div>;
}
