import { z } from 'zod';
import { bookingRecordSchema, catalogSchema, challengeSchema, checkoutSchema, quoteSchema, requestReceiptSchema, sessionSchema, ServiceError, customRequestRecordSchema, resourcesSchema, driverSchema, type TripAction, type AssignmentInput, type BookingInput, type CustomRequest, type Journey, type OwnerBookingInput, type OwnerQuoteInput, type TravelService } from '../domain';

/** The only network boundary. Components consume TravelService, never fetch. */
export class HttpTravelService implements TravelService {
  readonly mode='api' as const;
  private listeners=new Set<()=>void>();
  subscribe(listener:()=>void){this.listeners.add(listener);const timer=window.setInterval(()=>{if(document.visibilityState==='visible')listener();},15000);return()=>{this.listeners.delete(listener);window.clearInterval(timer);};}
  private invalidate(){for(const listener of this.listeners)listener();}
  constructor(private base = import.meta.env.VITE_API_BASE_URL || '/api/v2') {}
  private async request<T>(path:string,schema:z.ZodType<T>, options:{method?:string;body?:unknown;signal?:AbortSignal;idempotencyKey?:string}={}) : Promise<T> {
    let response:Response;
    try { response=await fetch(`${this.base.replace(/\/$/,'')}${path}`, {method:options.method??'GET',credentials:'include',signal:options.signal,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.idempotencyKey?{'Idempotency-Key':options.idempotencyKey}:{}),...(options.method && options.method!=='GET'?{'X-Requested-With':'HamdiWeb'}:{})},...(options.body?{body:JSON.stringify(options.body)}:{})}); }
    catch(error) { if(error instanceof DOMException && error.name==='AbortError')throw error;throw new ServiceError('NETWORK','We could not reach the service. Check your connection and retry.'); }
    const data:unknown = response.status===204?null:await response.json().catch(()=>null);
    if(!response.ok){const parsed=z.object({code:z.string(),message:z.string()}).safeParse(data);throw new ServiceError(parsed.success?parsed.data.code:`HTTP_${response.status}`,parsed.success?parsed.data.message:'The service could not complete this request. Try again.');}
    const parsed=schema.safeParse(data);if(!parsed.success)throw new ServiceError('INVALID_RESPONSE','The service returned an unexpected response. Please try again.');if(options.method&&options.method!=='GET')this.invalidate();return parsed.data;
  }
  getCatalog(signal?:AbortSignal){return this.request('/catalog',catalogSchema,{signal});}
  getQuote(journey:Journey,signal?:AbortSignal){return this.request('/quotes',quoteSchema,{method:'POST',body:journey,signal});}
  getSession(signal?:AbortSignal){return this.request('/session',sessionSchema.nullable(),{signal});}
  requestSignIn(email:string){return this.request('/auth/challenges',challengeSchema,{method:'POST',body:{email}});}
  verifySignIn(challengeId:string,code:string){return this.request('/auth/verify',sessionSchema,{method:'POST',body:{challengeId,code}});}
  async signOut(){await this.request('/auth/session',z.null(),{method:'DELETE'});}
  createBooking(input:BookingInput){return this.request('/bookings',bookingRecordSchema,{method:'POST',body:input,idempotencyKey:input.idempotencyKey});}
  listBookings(signal?:AbortSignal){return this.request('/bookings',z.array(bookingRecordSchema),{signal});}
  getBooking(id:string,signal?:AbortSignal){return this.request(`/bookings/${encodeURIComponent(id)}`,bookingRecordSchema,{signal});}
  startCheckout(bookingId:string){return this.request(`/bookings/${encodeURIComponent(bookingId)}/checkout`,checkoutSchema,{method:'POST',body:{}});}
  submitCustomRequest(input:CustomRequest){return this.request('/custom-requests',requestReceiptSchema,{method:'POST',body:input,idempotencyKey:input.idempotencyKey});}
  requestCancellation(id:string,reason?:string){return this.request(`/bookings/${encodeURIComponent(id)}/cancellation`,bookingRecordSchema,{method:'POST',body:{reason}});}
  listCustomRequests(signal?:AbortSignal){return this.request('/custom-requests',z.array(customRequestRecordSchema),{signal});}
  getCustomRequest(id:string,signal?:AbortSignal){return this.request(`/custom-requests/${encodeURIComponent(id)}`,customRequestRecordSchema,{signal});}
  acceptCustomQuote(id:string,idempotencyKey:string){return this.request(`/custom-requests/${encodeURIComponent(id)}/accept`,bookingRecordSchema,{method:'POST',body:{},idempotencyKey});}
  driverProfile(signal?:AbortSignal){return this.request('/driver/profile',driverSchema,{signal});}
  driverListBookings(signal?:AbortSignal){return this.request('/driver/bookings',z.array(bookingRecordSchema),{signal});}
  driverGetBooking(id:string,signal?:AbortSignal){return this.request(`/driver/bookings/${encodeURIComponent(id)}`,bookingRecordSchema,{signal});}
  driverTripAction(input:TripAction){return this.request(`/driver/bookings/${encodeURIComponent(input.bookingId)}/progress`,bookingRecordSchema,{method:'POST',body:input,idempotencyKey:input.idempotencyKey});}
  ownerListBookings(signal?:AbortSignal){return this.request('/owner/bookings',z.array(bookingRecordSchema),{signal});}
  ownerGetBooking(id:string,signal?:AbortSignal){return this.request(`/owner/bookings/${encodeURIComponent(id)}`,bookingRecordSchema,{signal});}
  ownerResources(signal?:AbortSignal){return this.request('/owner/resources',resourcesSchema,{signal});}
  ownerAssign(input:AssignmentInput){return this.request(`/owner/bookings/${encodeURIComponent(input.bookingId)}/assignment`,bookingRecordSchema,{method:'PUT',body:input});}
  ownerConfirm(id:string){return this.request(`/owner/bookings/${encodeURIComponent(id)}/confirm`,bookingRecordSchema,{method:'POST',body:{}});}
  ownerListCustomRequests(signal?:AbortSignal){return this.request('/owner/custom-requests',z.array(customRequestRecordSchema),{signal});}
  ownerGetCustomRequest(id:string,signal?:AbortSignal){return this.request(`/owner/custom-requests/${encodeURIComponent(id)}`,customRequestRecordSchema,{signal});}
  ownerQuote(input:OwnerQuoteInput){return this.request(`/owner/custom-requests/${encodeURIComponent(input.requestId)}/quote`,customRequestRecordSchema,{method:'PUT',body:input});}
  ownerResolveCancellation(id:string,decision:'approved'|'declined',note:string){return this.request(`/owner/bookings/${encodeURIComponent(id)}/cancellation`,bookingRecordSchema,{method:'POST',body:{decision,note}});}
  ownerRefund(id:string,amount:number,idempotencyKey:string){return this.request(`/owner/bookings/${encodeURIComponent(id)}/refund`,bookingRecordSchema,{method:'POST',body:{amount},idempotencyKey});}
  ownerCreateBooking(input:OwnerBookingInput){return this.request('/owner/bookings',bookingRecordSchema,{method:'POST',body:input,idempotencyKey:input.idempotencyKey});}
}
