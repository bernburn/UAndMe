import {CommentItem} from './CommentItem';
import {usePagedList,PAGE_SIZE} from './usePagedList';
import {supabase} from './supabase';
type Author={id:string;display_name:string;program:string;avatar_path?:string|null};
type Comment={id:string;author_id:string;content:string;created_at:string;profiles:Author|null};
export function PagedComments({id,kind,revision,onProfile}:{id:string;kind:'post'|'hangout';revision:number;onProfile:(id:string)=>void}){
 const list=usePagedList<Comment>(`${kind}:${id}:${revision}`,async offset=>{
  const table=kind==='post'?'comments':'hangout_comments';const fk=kind==='post'?'comments_author_id_fkey':'hangout_comments_author_id_fkey';
  const {data,error}=await supabase!.from(table).select(`id,author_id,content,created_at,profiles!${fk}(id,display_name,program,avatar_path)`).eq(kind==='post'?'post_id':'hangout_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+PAGE_SIZE);
  if(error)throw error;return {rows:data.slice(0,PAGE_SIZE) as unknown as Comment[],more:data.length>PAGE_SIZE};
 });
 return <><small className="list-hint">Newest comments first</small>{list.rows.map(c=><CommentItem key={c.id} author={c.profiles||undefined} createdAt={c.created_at} content={c.content} onOpenProfile={()=>onProfile(c.author_id)}/>)}{list.loading&&<p className="muted" role="status">Loading comments…</p>}{list.error&&<p className="error" role="alert">{list.error}<button type="button" className="switch" onClick={()=>void list.next()}>Retry</button></p>}{list.more&&<button type="button" className="quiet list-more" disabled={list.loading} onClick={()=>void list.next()}>Load older comments</button>}</>;
}
