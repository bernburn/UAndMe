import {useEffect,useState} from 'react';
import {supabase} from './supabase';
const cache=new Map<string,{url:string;expires:number}>();
export function Avatar({name,path}:{name:string;path?:string|null}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let active=true;setUrl('');if(!path||!supabase)return;
  const update=async()=>{const cached=cache.get(path);if(cached&&cached.expires>Date.now()){if(active)setUrl(cached.url);return;}const {data}=await supabase!.storage.from('avatars').createSignedUrl(path,3600);if(data){cache.set(path,{url:data.signedUrl,expires:Date.now()+3000000});if(active)setUrl(data.signedUrl);}};
  void update().catch(()=>{});const timer=window.setInterval(()=>void update().catch(()=>{}),300000);return()=>{active=false;window.clearInterval(timer);};
 },[path]);
 return url?<img className="avatar-photo" src={url} alt="" onError={()=>setUrl('')}/>:<>{name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase()}</>;
}

