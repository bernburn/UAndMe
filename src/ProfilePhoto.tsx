import {useState} from 'react';
import {supabase} from './supabase';
import {Avatar} from './Avatar';
import {photoError} from './photoValidation';
import {errorMessage} from './accountFlow';
export function ProfilePhoto({userId,name,path,onChange}:{userId:string;name:string;path?:string|null;onChange:(path:string|null)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function update(file?:File){
  if(busy||!supabase)return;if(file){const invalid=photoError(file);if(invalid){setError(invalid);return;}}
  setBusy(true);setError('');const next=file?`${userId}/${crypto.randomUUID()}.${file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'}`:null;
  try{
   if(file&&next){const result=await supabase.storage.from('avatars').upload(next,file,{contentType:file.type,upsert:false});if(result.error)throw result.error;}
   const result=await supabase.from('profiles').update({avatar_path:next}).eq('id',userId).select('avatar_path').single();
   if(result.error){if(next)await supabase.storage.from('avatars').remove([next]);throw result.error;}
   onChange(result.data.avatar_path);if(path)await supabase.storage.from('avatars').remove([path]);
  }catch(e){setError(errorMessage(e,'Unable to update your photo.'));}finally{setBusy(false);}
 }
 return <div className="photo-editor"><span className="avatar photo-preview"><Avatar name={name} path={path}/></span><div><label className="photo-upload">{busy?'Updating…':'Upload profile photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void update(file);}}/></label><small>JPEG, PNG or WebP · up to 2 MB</small>{path&&<button type="button" className="switch" disabled={busy} onClick={()=>void update()}>Remove photo</button>}{error&&<p className="error" role="alert">{error}</p>}</div></div>;
}
