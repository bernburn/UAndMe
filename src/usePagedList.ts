import {useCallback,useEffect,useRef,useState} from 'react';
export const PAGE_SIZE=20;
export function usePagedList<T extends {id:string}>(key:string,fetchPage:(offset:number)=>Promise<{rows:T[];more:boolean}>){
 const fetchRef=useRef(fetchPage);fetchRef.current=fetchPage;
 const generation=useRef(0),inFlight=useRef(false),offset=useRef(0);
 const [rows,setRows]=useState<T[]>([]),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const run=useCallback(async(reset:boolean)=>{if(!reset&&inFlight.current)return;const token=reset?++generation.current:generation.current;inFlight.current=true;setLoading(true);setError('');if(reset){offset.current=0;setRows([]);setMore(false);}const from=offset.current;
  try{const result=await fetchRef.current(from);if(token!==generation.current)return;setRows(previous=>{const merged=new Map<string,T>();for(const row of (reset?result.rows:[...previous,...result.rows]))merged.set(row.id,row);return [...merged.values()];});setMore(result.more);offset.current=from+result.rows.length;}
  catch(e){if(token===generation.current)setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Unable to load this list.');}
  finally{if(token===generation.current){inFlight.current=false;setLoading(false);}}
 },[]);
 useEffect(()=>{void run(true);return()=>{generation.current++;inFlight.current=false;};},[key,run]);
 return {rows,more,loading,error,update:setRows,reload:()=>run(true),next:()=>run(false)};
}
