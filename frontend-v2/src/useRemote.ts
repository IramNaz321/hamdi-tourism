import { useEffect, useRef, useState } from 'react';
import { errorMessage } from './domain';
import { useApp } from './state';
/** Shared revalidation for local mutations, cross-tab storage updates and window focus. */
export function useRemote<T>(load:(signal:AbortSignal)=>Promise<T>,keys:unknown[]=[]){
  const {dataRevision}=useApp();const keyValue=JSON.stringify(keys);const priorKey=useRef(keyValue);const loader=useRef(load);loader.current=load;const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();if(priorKey.current!==keyValue){setData(null);priorKey.current=keyValue;}setLoading(true);setError('');loader.current(controller.signal).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(e=>{if(e.name!=='AbortError')setError(errorMessage(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[dataRevision,retry,...keys]);
  return {data,error,loading,reload:()=>setRetry(n=>n+1)};
}
