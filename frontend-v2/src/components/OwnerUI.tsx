import { Clock } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { type Booking, type CustomRequestRecord, uaeDateTime } from '../domain';
import { useApp } from '../state';
export function Status({value,label}:{value:string;label?:string}){return <span className={`status-tag ${value}`}><span/>{label??value.replaceAll('_',' ')}</span>;}
export function OwnerPageHeading({title,subtitle,action}:{title:string;subtitle?:ReactNode;action?:ReactNode}){return <div className="owner-page-heading"><div><h1>{title}</h1>{subtitle?<p>{subtitle}</p>:null}</div>{action}</div>;}
export function OwnerPanel({title,children,action,className=''}:{title?:string;children:ReactNode;action?:ReactNode;className?:string}){return <section className={`owner-panel ${className}`}>{title?<div className="owner-panel-heading"><h2>{title}</h2>{action}</div>:null}{children}</section>;}
export function Activity({items}:{items:Booking['activity']|CustomRequestRecord['activity']}){return <OwnerPanel title="Activity"><ol className="activity-list">{items.map(item=><li key={item.id}><span/><div><strong>{item.message}</strong><time>{uaeDateTime(item.at)} · {item.actor}</time></div></li>)}</ol></OwnerPanel>;}
export function useBookingLabels(){const {catalog}=useApp();return (b:Booking)=>({pickup:b.pickupLabel??catalog?.locations.find(l=>l.id===b.journey.pickupId)?.shortName??b.journey.pickupId,destination:b.destinationLabel??catalog?.locations.find(l=>l.id===b.journey.destinationId)?.shortName??b.journey.destinationId,vehicle:catalog?.vehicles.find(v=>v.id===b.vehicleId)?.name??b.vehicleId});}
export function OwnerEmpty({title='Nothing here yet.',children}:{title?:string;children?:ReactNode}){return <div className="owner-empty"><Clock size={32}/><h2>{title}</h2><p>{children??'New customer activity will appear here.'}</p></div>;}
