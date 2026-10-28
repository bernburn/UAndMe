import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Home, Compass, Plus, Bell, User, Shield, Heart, MessageCircle, Flag, Ban, Trash2, RefreshCw, MapPin, CalendarDays, Users } from 'lucide-react';
import { supabase } from './supabase';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { PagedExplore } from './PagedExplore';
import { PagedNotifications } from './PagedNotifications';
import { PagedComments } from './PagedComments';
import { JoinedHangouts } from './JoinedHangouts';
import { readCampusRoute } from './profileRoute';
import { CommentItem } from './CommentItem';
import { errorMessage } from './accountFlow';
import { manilaInputToIso, isPastActivity } from './scheduling';
import { matchesDiscovery } from './discovery';
import { buildTimeline } from './timeline';
import { countNewUpdates } from './feedUpdates';
type Person={avatar_path:string|null;id:string;display_name:string;program:string;bio:string;interests:string[]};
type Post={id:string;author_id:string;content:string;created_at:string};
type Hangout={created_at:string;id:string;organizer_id:string;title:string;description:string;category:string;location:string;starts_at:string;capacity:number;status:string};
type Request={hangout_id:string;user_id:string;status:string};
type Note={id:string;message:string;hangout_id:string|null;read_at:string|null;created_at:string};
type Comment={id:string;post_id:string;author_id:string;content:string;created_at:string};
type HangoutComment={id:string;hangout_id:string;author_id:string;content:string;created_at:string};
type Report={id:string;target_type:string;target_id:string;reason:string;status:string};
const categories=['Games','Study','Sports','Food','Casual','Other'];
export const campusTime=(date:string)=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
export function Campus({userId,name,onProfile}:{userId:string;name:string;onProfile:()=>void}){
 const [page,setPageState]=useState(()=>readCampusRoute(window.location.hash).page),[posts,setPosts]=useState<Post[]>([]),[people,setPeople]=useState<Person[]>([]),[hangouts,setHangouts]=useState<Hangout[]>([]),[requests,setRequests]=useState<Request[]>([]),[notes,setNotes]=useState<Note[]>([]),[comments,setComments]=useState<Comment[]>([]),[likes,setLikes]=useState<{post_id:string;user_id:string}[]>([]),[blocks,setBlocks]=useState<{blocked_id:string}[]>([]),[reports,setReports]=useState<Report[]>([]),[admin,setAdmin]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[draft,setDraft]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('All'),[date,setDate]=useState(''),[history,setHistory]=useState(false),[selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState<Hangout|null>(null),[expanded,setExpanded]=useState<string|null>(null),[person,setPerson]=useState<string|null>(()=>readCampusRoute(window.location.hash).person),[report,setReport]=useState<{id:string;type:string}|null>(null),[limit,setLimit]=useState(30);
 const [hangoutLikes,setHangoutLikes]=useState<{hangout_id:string;user_id:string}[]>([]);
 const [hangoutComments,setHangoutComments]=useState<HangoutComment[]>([]);
 const [deletingHangout,setDeletingHangout]=useState<Hangout|null>(null);
 const [viewedPerson,setViewedPerson]=useState<Person|null>(null);
 const [profilePosts,setProfilePosts]=useState<Post[]>([]),[profileHangouts,setProfileHangouts]=useState<Hangout[]>([]);
 const [profileLoading,setProfileLoading]=useState(false),[profileError,setProfileError]=useState(''),[profileLimit,setProfileLimit]=useState(30);
 const profileId=person||userId;
 function setPage(next:string){setPerson(null);setPageState(next);window.location.hash=next.toLowerCase();}
 function openProfile(id:string){setSelected(null);setReport(null);setPerson(id);setProfileLimit(30);setPageState('Profile');window.location.hash='profile/'+id;}
 useEffect(()=>{const sync=()=>{const route=readCampusRoute(window.location.hash);setPageState(route.page);setPerson(route.person);setSelected(null);setReport(null);};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page,person]);
 const backgroundRunning=useRef(false);
 const [newUpdates,setNewUpdates]=useState(0),[refreshing,setRefreshing]=useState(false),[pullDistance,setPullDistance]=useState(0);
 const pullStart=useRef<{x:number;y:number}|null>(null);
 const pulling=useRef(0);
 const [activityRevision,setActivityRevision]=useState(0);
 const [counts,setCounts]=useState<{posts:Record<string,{likes:number;comments:number}>;hangouts:Record<string,{likes:number;comments:number}>}>({posts:{},hangouts:{}});
 const [unreadCount,setUnreadCount]=useState(0);
 const db=supabase!;
 useEffect(()=>{
  if(page!=='Profile')return;let active=true;setProfileLoading(true);setProfileError('');setViewedPerson(null);setProfilePosts([]);setProfileHangouts([]);
  void Promise.all([db.from('profiles').select('id,display_name,program,bio,interests,avatar_path').eq('id',profileId).maybeSingle(),db.from('posts').select('*').eq('author_id',profileId).order('created_at',{ascending:false}).limit(profileLimit),db.from('hangouts').select('*').eq('organizer_id',profileId).order('created_at',{ascending:false})]).then(results=>{
   if(!active)return;const failed=results.find(r=>r.error);if(failed){setProfileError(failed.error!.message);return;}if(!results[0].data){setProfileError('This profile is unavailable.');return;}
   setViewedPerson(results[0].data as Person);setProfilePosts(results[1].data as Post[]);setProfileHangouts(results[2].data as Hangout[]);
  }).catch(e=>{if(active)setProfileError(errorMessage(e,'Unable to load this profile.'));}).finally(()=>{if(active)setProfileLoading(false);});
  return()=>{active=false;};
 },[page,profileId,profileLimit,posts,hangouts]);
 useEffect(()=>{
  if(!selected&&!report&&!deletingHangout)return;
  const previous=document.activeElement as HTMLElement|null;
  const dialogs=document.querySelectorAll<HTMLElement>('[role="dialog"]');
  const dialog=dialogs[dialogs.length-1];
  if(!dialog)return;
  const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,[tabindex="0"]'));
  focusable()[0]?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){if(deletingHangout)setDeletingHangout(null);else if(report)setReport(null);else setSelected(null);}
   if(event.key==='Tab'){const items=focusable();const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  };
  document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);previous?.focus();};
 },[selected,report,deletingHangout]);
 async function load(includeNew=true){setLoading(true);setError('');try{
  const results=await Promise.all([db.from('profiles').select('id,display_name,program,bio,interests,avatar_path'),db.from('posts').select('*').order('created_at',{ascending:false}).limit(limit),db.from('hangouts').select('*').order('starts_at'),db.from('join_requests').select('*'),db.from('notifications').select('*').order('created_at',{ascending:false}).limit(30),db.from('comments').select('*').limit(0),db.from('post_likes').select('*').eq('user_id',userId),db.from('user_blocks').select('blocked_id'),db.rpc('is_moderator'),db.from('hangout_likes').select('*').eq('user_id',userId),db.from('hangout_comments').select('*').limit(0)]);
  // Keep successful lists usable when a different endpoint fails.
  if(results[0].data)setPeople(results[0].data as Person[]);
  if(results[1].data)setPosts((results[1].data as Post[]).filter(p=>includeNew||p.author_id===userId||posts.some(existing=>existing.id===p.id)));
  if(results[2].data)setHangouts((results[2].data as Hangout[]).filter(h=>includeNew||h.organizer_id===userId||hangouts.some(existing=>existing.id===h.id)));
  if(results[3].data)setRequests(results[3].data as Request[]);
  if(results[4].data)setNotes(results[4].data as Note[]);
  if(results[5].data)setComments(results[5].data as Comment[]);
  if(results[6].data)setLikes(results[6].data as {post_id:string;user_id:string}[]);
  if(results[7].data)setBlocks(results[7].data as {blocked_id:string}[]);
  if(!results[8].error)setAdmin(Boolean(results[8].data));
  if(results[9].data)setHangoutLikes(results[9].data as {hangout_id:string;user_id:string}[]);
  if(results[10].data)setHangoutComments(results[10].data as HangoutComment[]);
  if(results[9].error||results[10].error)throw new Error('Hangout reactions need setup. Run supabase/hangout-interactions.sql in Supabase SQL Editor, then refresh.');
  const failed=results.findIndex(r=>r.error);
  if(failed>=0)throw new Error(['Profiles','Posts','Hangouts','Join requests','Notifications','Comments','Likes','Blocks','Moderator access'][failed]+': '+results[failed].error!.message);
  const totals=await db.rpc('activity_counts',{post_ids:[...(results[1].data||[]).map(p=>p.id),...profilePosts.map(p=>p.id)],activity_ids:(results[2].data||[]).map(h=>h.id)});if(totals.error)throw totals.error;setCounts(totals.data);const unread=await db.from('notifications').select('id',{count:'exact',head:true}).is('read_at',null);if(!unread.error)setUnreadCount(unread.count||0);
  if(results[8].data){const r=await db.from('reports').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;setReports(r.data);}
 return true;}catch(e){setError(errorMessage(e,'Unable to load your campus.'));return false;}finally{setLoading(false);}}
 useEffect(()=>{void load();},[userId,limit]);
 async function refreshNow(){
  if(refreshing||busy||loading)return;setRefreshing(true);
  try{const [ok]=await Promise.all([load(),new Promise(resolve=>window.setTimeout(resolve,400))]);if(ok)setNewUpdates(0);}finally{setRefreshing(false);setPullDistance(0);}
 }
 useEffect(()=>{
  let active=true;
  const check=async()=>{
   if(page!=='Home'||document.visibilityState!=='visible'||busy||loading||backgroundRunning.current)return;
   backgroundRunning.current=true;
   try{const [p,h]=await Promise.all([db.from('posts').select('id').order('created_at',{ascending:false}).limit(limit),db.from('hangouts').select('id').order('created_at',{ascending:false}).limit(limit)]);
    if(active&&!p.error&&!h.error)setNewUpdates(countNewUpdates(posts,hangouts,p.data||[],h.data||[]));
   }finally{backgroundRunning.current=false;}
  };
  const timer=window.setInterval(()=>void check().catch(()=>{}),30000);
  const visible=()=>{if(document.visibilityState==='visible')void check().catch(()=>{});};
  window.addEventListener('focus',visible);window.addEventListener('online',visible);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);};
 },[page,busy,loading,userId,limit,posts,hangouts]);
 useEffect(()=>{
  if(page!=='Home')return;
  const main=document.querySelector('.campus-main');if(!main)return;
  const start=(event:Event)=>{const e=event as TouchEvent;pullStart.current=null;pulling.current=0;if(window.innerWidth>760||window.scrollY>0||e.touches.length!==1||busy||loading||refreshing||selected||report||deletingHangout||(e.target as HTMLElement).closest('input,textarea,select,button'))return;pullStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
  const move=(event:Event)=>{const e=event as TouchEvent;if(!pullStart.current||e.touches.length!==1)return;const dy=e.touches[0].clientY-pullStart.current.y,dx=e.touches[0].clientX-pullStart.current.x;if(dy<0||Math.abs(dx)>dy){pullStart.current=null;setPullDistance(0);return;}if(dy>12&&window.scrollY<=0){if(e.cancelable)e.preventDefault();pulling.current=Math.min(100,dy*.5);setPullDistance(pulling.current);}};
  const end=()=>{const ready=pulling.current>=64;pullStart.current=null;pulling.current=0;setPullDistance(0);if(ready)void refreshNow();};
  const cancel=()=>{pullStart.current=null;pulling.current=0;setPullDistance(0);};
  main.addEventListener('touchstart',start,{passive:true});main.addEventListener('touchmove',move,{passive:false});main.addEventListener('touchend',end);main.addEventListener('touchcancel',cancel);
  return()=>{main.removeEventListener('touchstart',start);main.removeEventListener('touchmove',move);main.removeEventListener('touchend',end);main.removeEventListener('touchcancel',cancel);};
 },[page,busy,loading,refreshing,selected,report,deletingHangout]);
 async function perform(work:()=>PromiseLike<{error:unknown}>,success=''){if(busy)return false;setBusy(true);setError('');setNotice('');try{const result=await work();if(result.error)throw result.error;setNotice(success);await load(false);setActivityRevision(n=>n+1);return true;}catch(e){setError(errorMessage(e,'Something went wrong. Please try again.'));return false;}finally{setBusy(false);}}
 const action=(a:string,p:Record<string,unknown>,message='')=>perform(()=>db.rpc('campus_action',{action:a,payload:p}),message);
 const student=(id:string)=>people.find(p=>p.id===id);
 const title=(id:string)=>student(id)?.display_name||'Campus member';
 const participants=(id:string)=>requests.filter(r=>r.hangout_id===id&&r.status==='Approved');
 const ended=(h:Hangout)=>isPastActivity(h);
 const filtered=hangouts.filter(h=>matchesDiscovery(h,{query,category,date,history}));
 const allTimeline=buildTimeline(posts,hangouts);
 const timeline=allTimeline.slice(0,limit);
 const current=hangouts.find(h=>h.id===selected);
 const me=student(userId);
 async function publish(e:FormEvent){e.preventDefault();if(await perform(()=>db.from('posts').insert({author_id:userId,content:draft.trim()}),'Post shared.'))setDraft('');}
 async function saveHangout(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;const form=new FormData(e.currentTarget);const payload:Record<string,unknown>=Object.fromEntries(form.entries());
  setBusy(true);setError('');setNotice('');
  try{
   payload.starts_at=manilaInputToIso(String(payload.starts_at));if(editing)payload.id=editing.id;
   const result=await db.rpc('campus_action',{action:editing?'edit_hangout':'create_hangout',payload});if(result.error)throw result.error;
   const savedId=editing?.id||result.data?.id;if(!savedId)throw new Error('The server did not confirm this hangout. Please refresh Explore before trying again.');
   const saved=await db.from('hangouts').select('*').eq('id',savedId).single();if(saved.error)throw new Error('Your hangout was saved, but could not be loaded: '+saved.error.message+'. Refresh Explore; do not create it again.');
   setHangouts(previous=>[saved.data as Hangout,...previous.filter(h=>h.id!==savedId)].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
   setQuery('');setCategory('All');setDate('');setHistory(isPastActivity(saved.data));setEditing(null);setPage('Explore');setActivityRevision(n=>n+1);setNotice('Hangout saved. You can find it below.');
  }catch(e){setError(errorMessage(e,'Could not save your hangout. Your form has been kept.'));}finally{setBusy(false);}
 }
 function author(id:string){return <button className="author-name" onClick={()=>openProfile(id)}>{title(id)}</button>;}
 function hangoutCard(h:Hangout){return <button key={h.id} className="hangout-tile" onClick={()=>{setHangouts(previous=>previous.some(item=>item.id===h.id)?previous:[...previous,h]);setSelected(h.id);}}><span className={`category-chip cat-${h.category}`}>{h.category}</span><h3>{h.title}</h3><p><MapPin size={14}/>{h.location}</p><p><CalendarDays size={14}/>{campusTime(h.starts_at)}</p><div className="tile-foot"><span><Users size={14}/>{participants(h.id).length+1}/{h.capacity} going</span><b>{h.status==='Upcoming'&&ended(h)?'Past':h.status}</b></div></button>;}
 function postCard(post:Post){return <article className="social-post" data-timeline-key={"post:"+post.id} key={"post:"+post.id}><button className="avatar profile-avatar-link" aria-label={"View "+title(post.author_id)+" profile"} onClick={()=>openProfile(post.author_id)}><Avatar name={title(post.author_id)} path={student(post.author_id)?.avatar_path}/></button><div className="post-body"><div className="social-author">{author(post.author_id)}<span className="verified-badge" title="Verified campus account">✓</span><small>{campusTime(post.created_at)}</small></div><small className="muted">{student(post.author_id)?.program}</small><p className="post-content">{post.content}</p><div className="post-actions"><button aria-label="Like post" aria-pressed={likes.some(l=>l.post_id===post.id&&l.user_id===userId)} disabled={busy} onClick={()=>void action('like',{id:post.id})}><Heart size={17}/>{counts.posts[post.id]?.likes||0}</button><button aria-label="View comments" onClick={()=>setExpanded(expanded===post.id?null:post.id)}><MessageCircle size={17}/>{counts.posts[post.id]?.comments||0}</button><button aria-label="Report post" onClick={()=>setReport({id:post.id,type:'post'})}><Flag size={16}/></button>{post.author_id===userId&&<button aria-label="Delete your post" disabled={busy} onClick={()=>void perform(()=>db.from('posts').delete().eq('id',post.id),'Post deleted.')}><Trash2 size={16}/></button>}</div>{expanded===post.id&&<div className="comments"><PagedComments id={post.id} kind="post" revision={activityRevision} onProfile={openProfile}/><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const content=String(new FormData(form).get('content'));if(await action('comment',{id:post.id,content},'Comment added.'))form.reset();}}><label className="sr-only" htmlFor={`comment-${post.id}`}>Your comment</label><input id={`comment-${post.id}`} name="content" placeholder="Add to the conversation…" required maxLength={1000}/><button className="primary" disabled={busy}>Reply</button></form></div>}</div></article>;}
 function feedHangout(h:Hangout){
  const confirmed=participants(h.id).length+1;
  const slots=Math.max(0,h.capacity-confirmed);
  const status=h.status==='Upcoming'&&ended(h)?'Past':h.status;
  const accepting=status==='Upcoming';
  return <article className="social-post feed-hangout" data-timeline-key={"hangout:"+h.id} key={'hangout:'+h.id}>
   <button className="avatar profile-avatar-link" aria-label={"View "+title(h.organizer_id)+" profile"} onClick={()=>openProfile(h.organizer_id)}><Avatar name={title(h.organizer_id)} path={student(h.organizer_id)?.avatar_path}/></button>
   <div className="post-body">
    <div className="social-author">{author(h.organizer_id)}<span className="verified-badge" title="Verified campus account">✓</span><small>{campusTime(h.created_at)}</small></div>
    <p className="hangout-announcement"><CalendarDays size={13}/> Created a campus hangout</p>
    <div className={'feed-activity-card activity-'+status.toLowerCase()}>
     <div className="feed-activity-top"><span className={'category-chip cat-'+h.category}>{h.category}</span><span className="feed-activity-status">{status}</span></div>
     <h2>{h.title}</h2><p className="feed-activity-description">{h.description}</p>
     <div className="feed-activity-meta"><span><MapPin size={15}/>{h.location}</span><span><CalendarDays size={15}/>{campusTime(h.starts_at)} · Manila</span><span><Users size={15}/>{confirmed}/{h.capacity} confirmed · {accepting?(slots?slots+' '+(slots===1?'slot':'slots')+' available':'Full'):'Not accepting requests'}</span></div>
     <div className="feed-activity-footer"><small>{h.organizer_id===userId?'Your hangout':requests.find(r=>r.hangout_id===h.id&&r.user_id===userId)?.status||'Join requests need organizer approval'}</small><button className="primary" onClick={()=>setSelected(h.id)}>View hangout</button></div>
    </div>
    <div className="post-actions hangout-post-actions">
     <button aria-label="Like hangout" aria-pressed={hangoutLikes.some(l=>l.hangout_id===h.id&&l.user_id===userId)} disabled={busy} onClick={()=>void perform(()=>db.rpc('hangout_interaction',{action:'like',activity_id:h.id}))}><Heart size={17}/>{counts.hangouts[h.id]?.likes||0}</button>
     <button aria-label="View hangout comments" aria-expanded={expanded==='hangout:'+h.id} onClick={()=>setExpanded(expanded==='hangout:'+h.id?null:'hangout:'+h.id)}><MessageCircle size={17}/>{counts.hangouts[h.id]?.comments||0}</button>
     <button aria-label="Report hangout" onClick={()=>setReport({id:h.id,type:'hangout'})}><Flag size={16}/></button>
     {h.organizer_id===userId&&<button aria-label="Delete your hangout" disabled={busy} onClick={()=>setDeletingHangout(h)}><Trash2 size={16}/></button>}
    </div>
    {expanded==='hangout:'+h.id&&<div className="comments"><h3 className="hangout-comments-title">Hangout conversation</h3><PagedComments id={h.id} kind="hangout" revision={activityRevision} onProfile={openProfile}/><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const content=String(new FormData(form).get('content')).trim();if(content&&await perform(()=>db.rpc('hangout_interaction',{action:'comment',activity_id:h.id,comment_text:content}),'Comment added.'))form.reset();}}><label className="sr-only" htmlFor={'hangout-comment-'+h.id}>Your hangout comment</label><input id={'hangout-comment-'+h.id} name="content" required maxLength={1000} placeholder="Ask a question or say hello…"/><button className="primary" disabled={busy}>Reply</button></form></div>}
   </div>
  </article>;
 }
 return <div className="campus-shell"><aside className="campus-nav"><a className="campus-brand" href="/"><Logo/></a><span className="campus-wordmark">UNIVERSITY OF THE ASSUMPTION</span><nav aria-label="Campus navigation">{[{name:'Home',icon:Home},{name:'Explore',icon:Compass},{name:'Create',icon:Plus},{name:'Notifications',icon:Bell},{name:'Profile',icon:User},...(admin?[{name:'Moderation',icon:Shield}]:[])].map(item=><button key={item.name} aria-current={page===item.name?'page':undefined} onClick={()=>{setPerson(null);if(item.name==='Create')setEditing(null);if(item.name==='Home'&&page==='Home'){window.scrollTo({top:0,behavior:'instant'});void refreshNow();}else setPage(item.name);}}><item.icon size={23}/><span>{item.name}</span>{item.name==='Notifications'&&unreadCount>0&&<i className="unread-dot"/>}</button>)}</nav><button className="primary new-hangout" onClick={()=>{setEditing(null);setPage('Create');}}>Create a hangout <Plus size={18}/></button><button className="campus-signout" disabled={busy} onClick={()=>void perform(()=>db.auth.signOut())}>Sign out</button><div className="nav-student"><span className="avatar"><Avatar name={name} path={student(userId)?.avatar_path}/></span><div><strong>{name}</strong><small>UA community member</small></div></div></aside><main className="campus-main"><div className="campus-top"><div><h1>{page==='Home'?'Your campus feed':page==='Create'?(editing?'Edit hangout':'Make a little plan'):page}</h1><small>{page==='Home'?'Your people. Your stories. Your next hello.':'University of the Assumption community'}</small></div></div>{error&&<div className="campus-alert" role="alert">{error.includes('schema cache')||error.includes('does not exist')?'Database update needed. Run supabase/mvp-upgrade.sql in Supabase SQL Editor, then refresh.':error}<button onClick={()=>void load()}>Retry</button></div>}{loading&&!refreshing&&<p role="status" className="section-pad muted">Loading your campus…</p>}
 <div className="page-transition" key={page+":"+(person||"self")}>
 {page==='Home'&&<><div className="feed-tab">Campus conversations & hangouts <span>Newest first</span></div><div className={"pull-refresh"+(refreshing?" is-refreshing":pullDistance>0?" is-pulling":"")} role="status" aria-live="polite" aria-hidden={!refreshing&&pullDistance===0} style={{height:refreshing?56:pullDistance,opacity:refreshing||pullDistance>0?1:0}}><RefreshCw size={18} className="pull-refresh-icon" style={refreshing?undefined:{transform:"rotate("+pullDistance*2.8+"deg)"}}/><span>{refreshing?'Loading your campus…':pullDistance>=64?'Release to refresh':pullDistance>0?'Pull to refresh':''}</span></div>{newUpdates>0&&<button className="new-updates-button" disabled={loading||busy} onClick={()=>{window.scrollTo({top:0,behavior:'instant'});void refreshNow();}}>Show {newUpdates} new {newUpdates===1?'update':'updates'}</button>}<form className="social-composer" onSubmit={publish}><span className="avatar"><Avatar name={name} path={student(userId)?.avatar_path}/></span><div><label className="sr-only" htmlFor="campus-draft">Write a campus post</label><textarea id="campus-draft" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} required placeholder="What’s happening on campus?" rows={3}/><div className="compose-actions"><small>{draft.length}/2,000 · UA students only</small><button className="primary" disabled={busy||!draft.trim()}>Post</button></div></div></form>{!loading&&!timeline.length&&!error&&<div className="section-pad empty-feed"><MessageCircle/><h2>A new campus conversation starts here.</h2><p>Share your first hello.</p></div>}{timeline.map(item=>item.kind==='post'?postCard(item.value):feedHangout(item.value))}{(posts.length>=limit||allTimeline.length>limit)&&<button className="quiet section-pad" onClick={()=>setLimit(l=>l+30)}>Load older updates</button>}</>}
 {page==='Explore'&&<PagedExplore revision={activityRevision} renderCard={hangoutCard} onCreate={()=>{setEditing(null);setPage('Create');}}/>}
 {page==='Create'&&<form className="section-pad hangout-form" key={editing?.id||'new'} onSubmit={saveHangout}><p className="muted">Bring your people together. All times are in Asia/Manila.</p><label>Title<input name="title" required minLength={3} maxLength={100} defaultValue={editing?.title} placeholder="Play UNO at the library"/></label><label>Description<textarea name="description" required maxLength={2000} defaultValue={editing?.description} placeholder="What’s the plan? Who’s welcome?" rows={4}/></label><label>Category<select name="category" defaultValue={editing?.category||'Games'}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Campus location<input name="location" required minLength={2} maxLength={200} defaultValue={editing?.location} placeholder="University Library"/></label><label>Date and start time (Manila)<input type="datetime-local" name="starts_at" required defaultValue={editing?new Date(new Date(editing.starts_at).getTime()+8*3600000).toISOString().slice(0,16):''}/></label><label>Maximum participants, including you<input type="number" name="capacity" min={2} max={100} defaultValue={editing?.capacity||6} required/></label><div className="form-summary"><Shield size={17}/><small>Requests need your approval. Pending requests don’t take a confirmed slot.</small></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Create hangout'}</button></form>}
 {page==='Notifications'&&<PagedNotifications revision={0} onRead={id=>action('read_notification',{id})} onOpen={id=>{void db.from('hangouts').select('*').eq('id',id).single().then(({data,error})=>{if(error){setError(error.message);return;}setHangouts(previous=>[data,...previous.filter(h=>h.id!==id)]);setSelected(id);});}}/>}
 {page==='Profile'&&<section className="profile-page" aria-label="Student profile"><div className="profile-page-toolbar"><button className="quiet" onClick={()=>setPage('Home')}>← Back to feed</button>{profileId===userId&&<button className="quiet profile-mobile-signout" disabled={busy} onClick={()=>void perform(()=>db.auth.signOut())}>Sign out</button>}</div>{profileLoading&&<p className="section-pad muted" role="status">Loading profile…</p>}{profileError&&<p className="section-pad error" role="alert">{profileError}</p>}{viewedPerson&&!profileLoading&&<><div className="section-pad"><div className="profile-cover"><span className="avatar big-avatar"><Avatar name={viewedPerson.display_name} path={viewedPerson.avatar_path}/></span></div><h2>{viewedPerson.display_name} <span className="verified-badge">✓</span></h2><p className="muted">{viewedPerson.program}</p><p className="profile-bio">{viewedPerson.bio||'Your campus story starts here.'}</p><div className="interest-tags">{viewedPerson.interests.map(i=><span key={i}>{i}</span>)}</div>{profileId===userId?<button className="quiet" onClick={onProfile}>Edit profile</button>:<div className="inline-actions"><button onClick={()=>setReport({id:profileId,type:'account'})}><Flag size={15}/> Report account</button><button disabled={busy} onClick={async()=>{if(await action('block',{id:profileId},'Account blocked.'))setPage('Home');}}><Ban size={15}/> Block account</button></div>}<section className="joined-history"><h3>Joined hangouts</h3><JoinedHangouts userId={profileId} revision={activityRevision} renderCard={hangoutCard}/></section><h3>Created hangouts</h3><div className="hangout-grid">{profileHangouts.map(hangoutCard)}</div>{!profileHangouts.length&&<p className="muted">No created hangouts yet.</p>}</div><div className="profile-section-title">Campus posts</div>{profilePosts.map(postCard)}{!profilePosts.length&&<p className="section-pad muted">No campus posts yet.</p>}{profilePosts.length>=profileLimit&&<button className="quiet profile-more" onClick={()=>setProfileLimit(n=>n+30)}>Load older posts</button>}{profileId===userId&&<div className="section-pad"><h3>Blocked accounts</h3>{blocks.length?blocks.map(b=><div className="blocked-row" key={b.blocked_id}><span>Blocked account</span><button disabled={busy} onClick={()=>void action('unblock',{id:b.blocked_id},'Account unblocked.')}>Unblock</button></div>):<p className="muted">You haven’t blocked anyone.</p>}</div>}</>}</section>}
 {page==='Moderation'&&admin&&<div className="section-pad"><h2>Reported content</h2>{!reports.length&&<p>No reports to review.</p>}{reports.map(r=><article className="report-card" key={r.id}><b>{r.target_type} · {r.status}</b><p>{r.reason}</p><p className="muted">{r.target_type==='post'?posts.find(p=>p.id===r.target_id)?.content:r.target_type==='hangout'?hangouts.find(h=>h.id===r.target_id)?.title:title(r.target_id)}</p><small>Target: {r.target_id}</small>{r.status==='Open'&&<div className="inline-actions"><button disabled={busy} onClick={()=>void action('moderate',{id:r.id,remove:false},'Report resolved.')}>Resolve</button>{r.target_type!=='account'&&<button disabled={busy} onClick={()=>void action('moderate',{id:r.id,remove:true},'Content removed.')}>Remove content</button>}{r.target_type==='account'&&<p>Review account restrictions in Supabase Authentication.</p>}</div>}</article>)}</div>}
 </div></main><aside className="campus-right"><div className="campus-welcome"><span className="eyebrow">YOUR CAMPUS. YOUR PEOPLE.</span><h2>A little hello.<br/>A whole new circle.</h2><p>Find your people between classes.</p><button onClick={()=>setPage('Explore')}>Explore hangouts →</button></div><section className="right-section"><div className="right-heading"><h3>Coming up on campus</h3><button onClick={()=>setPage('Explore')}>See all</button></div>{hangouts.filter(h=>!ended(h)).slice(0,3).map(hangoutCard)}{!loading&&!hangouts.some(h=>!ended(h))&&<p className="muted">Be the first to make a plan.</p>}</section><div className="campus-safety"><Shield size={20}/><div><b>A community we care for.</b><p>Keep it kind. Meet in campus spaces. Report anything that feels wrong.</p></div></div><small className="campus-copyright">UAndMe · University of the Assumption<br/>Your campus. Your people.</small></aside>
 {current&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="hangout-title" className="modal detail-modal"><button className="close" aria-label="Close hangout" onClick={()=>setSelected(null)}>×</button><span className="category-chip">{current.category}</span><h2 id="hangout-title">{current.title}</h2><p className="status-label">{current.status==='Upcoming'&&ended(current)?'Past':current.status} · {participants(current.id).length+1}/{current.capacity} confirmed</p><p className="detail-description">{current.description}</p><p><MapPin size={16}/> {current.location}</p><p><CalendarDays size={16}/> {campusTime(current.starts_at)} (Manila)</p><p>Organized by {author(current.organizer_id)}</p><h3>Confirmed participants</h3><ul><li>{author(current.organizer_id)} · Organizer</li>{participants(current.id).map(r=><li key={r.user_id}>{author(r.user_id)}</li>)}</ul>{current.organizer_id===userId?<><h3>Join requests</h3>{requests.filter(r=>r.hangout_id===current.id&&r.status==='Pending').map(r=><div className="request-row" key={r.user_id}>{author(r.user_id)}<button disabled={busy||ended(current)} onClick={()=>void action('approve',{id:current.id,user_id:r.user_id},'Request approved.')}>Approve</button><button disabled={busy||ended(current)} onClick={()=>void action('reject',{id:current.id,user_id:r.user_id},'Request rejected.')}>Reject</button></div>)}<div className="inline-actions"><button disabled={busy||current.status!=='Upcoming'} onClick={()=>{setEditing(current);setSelected(null);setPage('Create');}}>Edit</button><button disabled={busy||current.status==='Cancelled'||current.status==='Completed'} onClick={()=>void action('cancel',{id:current.id},'Hangout cancelled.')}>Cancel hangout</button><button disabled={busy||current.status!=='Upcoming'} onClick={()=>void action('status',{id:current.id,status:'Ongoing'})}>Mark ongoing</button><button disabled={busy||['Completed','Cancelled'].includes(current.status)} onClick={()=>void action('status',{id:current.id,status:'Completed'})}>Mark completed</button></div></>:<><p>Your request: {requests.find(r=>r.hangout_id===current.id&&r.user_id===userId)?.status||'Not requested'}</p>{requests.some(r=>r.hangout_id===current.id&&r.user_id===userId&&['Pending','Approved'].includes(r.status))?<button className="quiet" disabled={busy} onClick={()=>void action('withdraw',{id:current.id},'You have left this activity.')}>Withdraw / leave</button>:<button className="primary" disabled={busy||ended(current)||current.status!=='Upcoming'||participants(current.id).length+1>=current.capacity} onClick={()=>void action('request',{id:current.id},'Request sent. The organizer will review it.')}>Request to join</button>}<button className="switch" onClick={()=>setReport({id:current.id,type:'hangout'})}>Report hangout</button></>}{error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="success">{notice}</p>}</section></div>}

 {report&&<div className="overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="close" aria-label="Close report" onClick={()=>setReport(null)}>×</button><h2 id="report-title">Report {report.type}</h2><form onSubmit={async e=>{e.preventDefault();const reason=String(new FormData(e.currentTarget).get('reason'));if(await action('report',{id:report.id,target_type:report.type,reason},'Report sent to campus moderation.'))setReport(null);}}><label>What happened?<textarea name="reason" required minLength={5} maxLength={1000} rows={4}/></label><button disabled={busy} className="primary">Send report</button></form>{error&&<p className="error" role="alert">{error}</p>}</section></div>}
 {deletingHangout&&<div className="overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-hangout-title"><button className="close" aria-label="Close delete confirmation" onClick={()=>setDeletingHangout(null)}>×</button><h2 id="delete-hangout-title">Delete this hangout?</h2><p className="muted">“{deletingHangout.title}” and its comments and likes will be removed. Students who requested or joined will be notified. This cannot be undone.</p><div className="inline-actions"><button disabled={busy} onClick={()=>setDeletingHangout(null)}>Keep hangout</button><button className="danger-action" disabled={busy} onClick={async()=>{if(await perform(()=>db.rpc('hangout_interaction',{action:'delete',activity_id:deletingHangout.id}),'Hangout deleted.')){if(selected===deletingHangout.id)setSelected(null);setDeletingHangout(null);}}}>{busy?'Deleting…':'Delete hangout'}</button></div>{error&&<p className="error" role="alert">{error}</p>}</section></div>}
 </div>;
}












