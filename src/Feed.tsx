import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from './supabase';
import { errorMessage } from './accountFlow';

type Post = { id: string; author_id: string; content: string; created_at: string; profiles: { display_name: string; program: string } | null };
export function Feed({ userId, name }: { userId: string; name: string }) {
 const [posts, setPosts] = useState<Post[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [draft, setDraft] = useState('');
 const [busy, setBusy] = useState(false);
 const [hasMore, setHasMore] = useState(false);
 async function load(older = false) {
  if (!supabase) return;
  setLoading(true);setError('');
  try {
   let query = supabase.from('posts').select('id,author_id,content,created_at,profiles!posts_author_id_fkey(display_name,program)').order('created_at', { ascending: false }).limit(21);
   if (older && posts.length) query = query.lt('created_at', posts[posts.length - 1].created_at);
   const { data, error } = await query;
   if (error) throw error;
   const page = data.slice(0,20) as unknown as Post[];
   setPosts(previous => older ? [...previous, ...page] : page);setHasMore(data.length > 20);
  } catch(e) {setError(errorMessage(e, 'Unable to load campus posts.'));}
  finally {setLoading(false);}
 }
 useEffect(() => {void load();}, [userId]);
 async function publish(e: FormEvent) {
  e.preventDefault();if(!supabase || busy || !draft.trim())return;
  setBusy(true);setError('');
  try {
   const {error} = await supabase.from('posts').insert({author_id:userId,content:draft.trim()});
   if(error)throw error;
   setDraft('');await load();
  }catch(e){setError(errorMessage(e,'Unable to publish. Your draft has been kept.'));}finally{setBusy(false);}
 }
 async function remove(id: string) {
  if(!supabase || busy)return;setBusy(true);setError('');
  try {const {data,error}=await supabase.from('posts').delete().eq('id',id).eq('author_id',userId).select('id');if(error)throw error;if(!data.length)throw new Error('This post could not be deleted. Refresh and try again.');setPosts(p=>p.filter(post=>post.id!==id));}
  catch(e){setError(errorMessage(e,'Unable to delete post.'));}finally{setBusy(false);}
 }
 return <main className="feed-layout"><aside className="feed-aside"><div className="eyebrow">A LITTLE CLOSER TO YOUR PEOPLE</div><h2>Your campus,<br/>in conversation.</h2><p className="muted">A question, a small win, or a simple hello. There’s room for it here.</p><div className="phase-note">Campus feed · Text posts are live once database setup is complete. Likes, comments, reporting, and hangouts are still in development.</div></aside><section className="feed-column" aria-label="Campus feed"><div className="feed-heading"><div><div className="eyebrow">YOUR CAMPUS. YOUR PEOPLE.</div><h1>Campus feed<span>.</span></h1></div><button className="quiet" disabled={loading||busy} onClick={()=>void load()} aria-label="Refresh feed"><RefreshCw size={17}/></button></div><form className="composer" onSubmit={publish}><label htmlFor="post-content">Hey {name}, what’s on your mind?</label><textarea id="post-content" value={draft} onChange={e=>setDraft(e.target.value)} rows={3} maxLength={2000} required placeholder="Say hello to your campus…"/><div className="composer-bottom"><small>{draft.length}/2,000 · Visible to verified UA students</small><button className="primary" disabled={busy||!draft.trim()}>{busy?'Please wait…':'Post'}<ArrowRight size={16}/></button></div></form>{error&&<div className="feed-error" role="alert"><p>{error.includes('schema cache')?'The campus feed needs its database setup. Run supabase/feed-setup.sql in your Supabase SQL Editor, then refresh the feed.':error}</p><button className="quiet" disabled={loading} onClick={()=>void load()}>Try again</button></div>}{loading&&<p role="status" className="muted">Loading campus posts…</p>}{!loading&&!error&&!posts.length&&<div className="empty-feed"><MessageCircle size={32}/><h2>Every community starts with a hello.</h2><p className="muted">No posts yet. Be the first to start a campus conversation.</p></div>}{posts.map(post=><article className="post" key={post.id}><div className="post-heading"><span className="post-avatar">{post.profiles?.display_name.slice(0,1).toUpperCase()||'U'}</span><div><strong>{post.profiles?.display_name||'Campus member'}</strong><small>{post.profiles?.program && `${post.profiles.program} · `}{new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date(post.created_at))}</small></div>{post.author_id===userId&&<button className="delete-post" aria-label="Delete your post" disabled={busy} onClick={()=>void remove(post.id)}><Trash2 size={16}/></button>}</div><p className="post-content">{post.content}</p></article>)}{hasMore&&<button className="quiet" disabled={loading} onClick={()=>void load(true)}>Load older posts</button>}</section></main>;
}
