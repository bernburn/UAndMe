import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, Users, Sparkles, MapPin, BookOpen, Heart, ArrowRight, Check, LogOut } from 'lucide-react';
import { supabase } from './supabase';
import { validateProfile } from './validation';
import './style.css';
import { Campus } from './Campus';
import { Logo } from './Logo';
import { ProfilePhoto } from './ProfilePhoto';
import { accountDestination, errorMessage } from './accountFlow';

type Profile = { avatar_path: string|null; profile_completed_at:string|null; id: string; display_name: string; program: string; bio: string; interests: string[]; created_at: string; updated_at: string };
function App() {
 const [session, setSession] = useState<Session|null>(null);
 const [loading, setLoading] = useState(Boolean(supabase));
 const [mode, setMode] = useState<'login'|'signup'|null>(null);
 const [notice, setNotice] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [profile, setProfile] = useState<Profile|null>(null);
 const [page, setPage] = useState<'profile'|'feed'>('profile');
 const [verificationEmail, setVerificationEmail] = useState('');
 const [retry, setRetry] = useState(0);
 useEffect(() => {
  if (!supabase) return;
  let active = true;
  supabase.auth.getSession().then(({data,error}) => {if(active) {setSession(data.session);setLoading(false);if(error)setError(error.message);}});
  const {data} = supabase.auth.onAuthStateChange((_event, next) => {setSession(next);if(next){setMode(null);setVerificationEmail('');}else{setProfile(null);setPage('profile');}setLoading(false);});
  return () => {active=false;data.subscription.unsubscribe();};
 }, []);
 useEffect(() => {
  if (!session || !supabase) return;
  let active = true;
  supabase.from('profiles').select('id,display_name,program,bio,interests,created_at,updated_at,avatar_path,profile_completed_at').eq('id',session.user.id).single().then(({data,error}) => {if(active){if(error)setError(error.message);else {setProfile(data);setPage(accountDestination(data));setError('');}}});
  return () => {active=false;};
 }, [session?.user.id, retry]);
 async function authenticate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();setError('');setNotice('');
  if (!supabase) {setError('Account access is awaiting campus setup. Follow the project setup guide to connect Supabase.');return;}
  setBusy(true);
  try {
   const f = new FormData(e.currentTarget);const email=String(f.get('email')).trim();const password=String(f.get('password'));
   const result = mode==='signup' ? await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin,data:{display_name:String(f.get('name')).trim()}}}) : await supabase.auth.signInWithPassword({email,password});
   if(result.error) throw result.error;
   if(mode==='signup'&&!result.data.session){setVerificationEmail(email);setNotice('');e.currentTarget?.reset();}
  } catch(e) {setError(errorMessage(e,'Unable to access your account. Please try again.'));} finally {setBusy(false);}
 }
 async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();if(!supabase||!session)return;setError('');setNotice('');
  const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();const bio=String(f.get('bio'));const interests=[...new Set(String(f.get('interests')).split(',').map(i=>i.trim()).filter(Boolean))];
  const invalid=validateProfile(name,bio,interests);if(invalid){setError(invalid);return;}
  setBusy(true);
  try {const {data,error}=await supabase.from('profiles').update({profile_completed_at:new Date().toISOString(),display_name:name,program:String(f.get('program')).trim(),bio,interests}).eq('id',session.user.id).select('id,display_name,program,bio,interests,created_at,updated_at,avatar_path,profile_completed_at').single();if(error)throw error;setProfile(data);window.location.hash='home';setPage('feed');setNotice('Profile saved. Welcome to your campus feed!');}catch(e){setError(errorMessage(e,'Unable to save your profile.'));}finally{setBusy(false);}
 }
 return <><header><a className="brand" href="/" aria-label="UAndMe home"><Logo/></a><nav aria-label="Main navigation">{session?<><button className="nav-link" aria-current={page==='feed'?'page':undefined} onClick={()=>setPage('feed')}>Campus feed</button><button className="nav-link" aria-current={page==='profile'?'page':undefined} onClick={()=>setPage('profile')}>My profile</button></>:<><a href="#how">How it works</a><a href="#community">Our community</a></>}</nav>{session?<button className="quiet" onClick={async()=>{const r=await supabase!.auth.signOut();if(r.error)setError(r.error.message);}}><LogOut size={16}/> Sign out</button>:<button className="quiet" onClick={()=>{setVerificationEmail('');setMode('login');setError('');setNotice('');}}>Log in <ArrowUpRight size={17}/></button>}</header>
 {loading?<main className="account"><p role="status">Loading your account…</p></main>:session&&page==='feed'&&profile?<Campus userId={session.user.id} name={profile.display_name} onProfile={()=>setPage('profile')}/>:session?<main className="account"><div className="eyebrow"><Check size={15}/> YOUR CAMPUS PROFILE</div><h1>Hey, {profile?.display_name || 'campus friend'}<span>.</span></h1><p className="muted">A little about you. A starting point for new connections.</p>{profile&&<ProfilePhoto userId={profile.id} name={profile.display_name} path={profile.avatar_path} onChange={path=>setProfile({...profile,avatar_path:path})}/>}{profile?<form onSubmit={saveProfile}><label>Display name<input name="name" defaultValue={profile.display_name} minLength={2} maxLength={60} required/></label><label>Program or department <span>(optional)</span><input name="program" defaultValue={profile.program} maxLength={100}/></label><label>Bio<textarea name="bio" defaultValue={profile.bio} maxLength={300} rows={3}/></label><label>Interests <span>(separate with commas)</span><input name="interests" defaultValue={profile.interests.join(', ')} placeholder="Board games, coffee, study sessions"/></label><button className="primary" disabled={busy}>{busy?'Saving…':'Save and go to feed'}<ArrowRight size={17}/></button></form>:<><p role="status">{error?'Your profile could not be loaded.':'Loading your profile…'}</p>{error&&<button className="quiet" onClick={()=>setRetry(r=>r+1)}>Retry</button>}</>}<p className="phase-note">Your university email stays private. Only your profile details are shared with verified students.</p></main>:<main className="login-landing"><section className="login-intro"><span className="campus-label">UNIVERSITY OF THE ASSUMPTION</span><h1><Logo/></h1><h2>Your campus. Your people.</h2><p>Connect with UA students.<br/>Share your day. Make a plan.</p><div className="login-values"><span>✓ Verified students</span><span>✦ Real campus connections</span></div></section><section className="login-card" aria-label="Log in to UAndMe"><h2>Welcome back</h2><p>Good to see you, Assumptionist.</p><form onSubmit={authenticate}><label>University email<input type="email" name="email" placeholder="you@ua.edu.ph" autoComplete="email" required/></label><label>Password<input type="password" name="password" placeholder="Your password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}>{busy?'Logging in…':'Log in'}</button></form>{error&&<p role="alert" className="error">{error}</p>}<p className="login-verification">New here? Confirm your university email after signing up.</p><div className="login-divider"/><button className="create-account-button" onClick={()=>{setVerificationEmail('');setMode('signup');setError('');}}>Create new account</button><small>Exclusively for @ua.edu.ph students.</small></section></main>}
 <footer><a className="brand" href="/"><Logo/></a><span>Made for the moments between classes.</span><span>University of the Assumption</span></footer>
 {mode&&!session&&<div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setMode(null);}}><section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="modal" onKeyDown={e=>{if(e.key==='Escape')setMode(null);if(e.key==='Tab'){const elements=e.currentTarget.querySelectorAll<HTMLElement>('button,input,a');const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}><button className="close" aria-label="Close account dialog" onClick={()=>setMode(null)}>×</button><div className="eyebrow">YOUR CAMPUS. YOUR PEOPLE.</div>{verificationEmail?<div className="verify-screen"><span className="verify-icon">✉</span><h2 id="auth-title" tabIndex={-1} ref={el=>el?.focus()}>Check your university inbox</h2><p>One more step before you join your campus.</p><p>Open the verification email sent to <strong>{verificationEmail}</strong> and click the confirmation link.</p><ol><li>Check your inbox and spam folder.</li><li>Open the link in this same browser to confirm your email.</li><li>Return here and log in to finish your profile.</li></ol><p className="phase-note">No email yet? Delivery can take a few minutes. If you already registered, check for an earlier verification email. Requesting an account again can trigger an email cooldown.</p><button className="primary" onClick={()=>{setVerificationEmail('');setMode('login');setNotice('');setError('');}}>I’ve verified my email — log in<ArrowRight size={16}/></button></div>:<><h2 id="auth-title">{mode==='signup'?'Your next hello starts here.':'Welcome back.'}</h2><p className="muted">{mode==='signup'?'Step 1 of 3 · Create your account':'Use your verified university email to connect.'}</p>{mode==='signup'&&<div className="verification-callout"><strong>Email confirmation is required</strong><p>After creating your account, we’ll email a verification link to your @ua.edu.ph inbox. Confirm your email, log in, then finish your profile.</p></div>}<form onSubmit={authenticate}>{mode==='signup'&&<label>Display name<input name="name" minLength={2} maxLength={60} required autoFocus/></label>}<label>University email<input type="email" name="email" required autoFocus={mode==='login'} autoComplete="email"/></label><label>Password<input type="password" name="password" minLength={12} maxLength={128} required autoComplete={mode==='signup'?'new-password':'current-password'}/></label>{mode==='signup'&&<small>Use at least 12 characters. Verify your email before signing in.</small>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account & send verification':'Log in'}<ArrowRight size={17}/></button></form><button className="switch" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setNotice('');}}>{mode==='login'?'New here? Create an account':'Already a member? Log in'}</button>{!supabase&&<p className="phase-note">Preview · Campus account access is awaiting Supabase configuration.</p>}{error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="success">{notice}</p>}</>}</section></div>}{!mode&&(error||notice)&&<div className="toast" role={error?'alert':'status'}>{error||notice}<button aria-label="Dismiss message" onClick={()=>{setError('');setNotice('');}}>×</button></div>}
 </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);


import './campus.css';



import './modern.css';




import './mobile-nav.css';

import './motion.css';

import './timeline.css';

import './profile-page.css';


import './refresh.css';

import './photos-lists.css';

