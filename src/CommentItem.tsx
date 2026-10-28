import {Avatar} from './Avatar';
type CommentAuthor={display_name:string;program:string;avatar_path?:string|null};
type Props={author?:CommentAuthor;content:string;createdAt:string;onOpenProfile:()=>void};

export function CommentItem({author,content,createdAt,onOpenProfile}:Props){
 const name=author?.display_name||'Campus member';
 const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
 const timestamp=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date(createdAt));
 return <article className="comment comment-with-profile">
  <button className="avatar comment-avatar" type="button" aria-label={`View ${name}'s profile`} onClick={onOpenProfile}><Avatar name={name} path={author?.avatar_path}/></button>
  <div className="comment-body">
   <div className="comment-author-row"><button className="author-name" type="button" onClick={onOpenProfile}>{name}</button>{author&&<span className="verified-badge" title="Verified campus account">✓</span>}</div>
   {author?.program&&<span className="comment-program">{author.program}</span>}
   <time className="comment-time" dateTime={createdAt}>{timestamp}</time>
   <p>{content}</p>
  </div>
 </article>;
}
