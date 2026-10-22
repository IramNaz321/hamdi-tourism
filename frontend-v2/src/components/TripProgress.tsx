import { CheckCircle, Circle, Clock } from '@phosphor-icons/react';
import { type Booking, uaeDateTime } from '../domain';
export function TripProgress({booking:b}:{booking:Booking}){
  const legs=b.journey.tripType==='return'?(['outbound','return'] as const):(['outbound'] as const);
  return <ol className="trip-timeline" aria-label="Trip progress">{legs.map(key=>{const leg=b.tripProgress[key];const title=b.journey.tripType==='return'?(key==='outbound'?'Outbound':'Return'):'Trip';return <li key={key}><div className="trip-timeline-label">{leg.completedAt?<CheckCircle size={22} weight="fill"/>:leg.startedAt?<Clock size={22}/>:<Circle size={22}/>}<strong>{title}{leg.completedAt?' completed':leg.startedAt?' in progress':' not started'}</strong></div><div className="trip-timeline-times">{leg.startedAt?<p>Started <time>{uaeDateTime(leg.startedAt)}</time></p>:null}{leg.completedAt?<p>Completed <time>{uaeDateTime(leg.completedAt)}</time></p>:leg.startedAt?<p>Awaiting drop-off</p>:<p>{b.status==='cancelled'?'Cancelled':key==='return'?'Awaiting return pickup':'Awaiting pickup'}</p>}</div></li>;})}</ol>;
}
