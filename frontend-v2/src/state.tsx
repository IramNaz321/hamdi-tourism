import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { defaultJourney, errorMessage, journeyRecordSchema, type Catalog, type Journey, type Quote, type Session, type TravelService } from './domain';
import { MockTravelService } from './services/mock';
import { HttpTravelService } from './services/http';
const service: TravelService = import.meta.env.VITE_DATA_SOURCE==='api'?new HttpTravelService():new MockTravelService();
const draftSchema=z.object({journey:journeyRecordSchema,vehicleId:z.string()});
function readDraft(){try {const parsed=draftSchema.safeParse(JSON.parse(sessionStorage.getItem('hamdi:v2:draft:1')??'null'));return parsed.success?parsed.data:{journey:defaultJourney(),vehicleId:'sedan'};}catch{return {journey:defaultJourney(),vehicleId:'sedan'};}}
interface AppState { service:TravelService; catalog:Catalog|null; registerLocation:(l:Catalog['locations'][number])=>void; catalogError:string; retryCatalog:()=>void; session:Session|null; setSession:(s:Session|null)=>void; sessionLoading:boolean; journey:Journey; updateJourney:(j:Journey)=>void; quote:Quote|null; setQuote:(q:Quote|null)=>void; vehicleId:string; setVehicleId:(id:string)=>void; resetJourney:()=>void; dataRevision:number; demoRole:'customer'|'owner'|'driver'; driverId:string; }
const Context=createContext<AppState|null>(null);
export function AppProvider({children}:{children:ReactNode}) {
  const [driverId,setDriverId]=useState(()=>service.demo?.getDriverId()??'');
  const [dataRevision,setDataRevision]=useState(0);const [demoRole,setDemoRole]=useState<'customer'|'owner'|'driver'>(()=>service.demo?.getRole()??'customer');
  useEffect(()=>service.subscribe?.(()=>{setDataRevision(n=>n+1);setDriverId(service.demo?.getDriverId()??'');setDemoRole(service.demo?.getRole()??'customer');void service.getSession().then(setSession).catch(()=>{});}),[]);
  useEffect(()=>{const refresh=()=>setDataRevision(n=>n+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
  const [draft]=useState(readDraft);const [journey,setJourney]=useState<Journey>(draft.journey);const [vehicleId,setVehicleId]=useState(draft.vehicleId);
  const [quote,setQuote]=useState<Quote|null>(null);const [catalog,setCatalog]=useState<Catalog|null>(null);const [catalogError,setCatalogError]=useState('');const [revision,setRevision]=useState(0);
  const [session,setSession]=useState<Session|null>(null);const [sessionLoading,setSessionLoading]=useState(true);
  useEffect(()=>{const controller=new AbortController();setCatalogError('');service.getCatalog(controller.signal).then(setCatalog).catch(e=>{if(e.name!=='AbortError')setCatalogError(errorMessage(e));});return()=>controller.abort();},[revision]);
  useEffect(()=>{const controller=new AbortController();service.getSession(controller.signal).then(setSession).catch(()=>setSession(null)).finally(()=>{if(!controller.signal.aborted)setSessionLoading(false);});return()=>controller.abort();},[]);
  useEffect(()=>{try {sessionStorage.setItem('hamdi:v2:draft:1',JSON.stringify({journey,vehicleId}));}catch{/* Browsing remains usable when storage is unavailable. */}},[journey,vehicleId]);
  function updateJourney(j:Journey){setJourney(j);setQuote(null);}
  function resetJourney(){setJourney(defaultJourney());setQuote(null);setVehicleId('sedan');}
  return <Context.Provider value={{service,catalog,registerLocation:l=>setCatalog(c=>c?{...c,locations:[...c.locations.filter(p=>p.id!==l.id),l]}:c),catalogError,retryCatalog:()=>setRevision(v=>v+1),session,setSession,sessionLoading,journey,updateJourney,quote,setQuote,vehicleId,setVehicleId,resetJourney,dataRevision,demoRole:service.mode==='api'?session?.role??'customer':demoRole,driverId:service.mode==='api'?session?.driverId??'':driverId}}>{children}</Context.Provider>;
}
export function useApp(){const state=useContext(Context);if(!state)throw new Error('AppProvider is required');return state;}
