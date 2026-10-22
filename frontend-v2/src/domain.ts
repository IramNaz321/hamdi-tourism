import { z } from 'zod';

export const locationSchema = z.object({ id: z.string(), name: z.string(), shortName: z.string(), type: z.enum(['airport', 'destination']), city: z.string() });
export const vehicleSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), passengers: z.number().int(), bags: z.number().int(), image: z.string() });
export const extraSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), amount: z.number().int().nonnegative() });
export const catalogSchema = z.object({ locations: z.array(locationSchema), vehicles: z.array(vehicleSchema), extras: z.array(extraSchema) });
export type Catalog = z.infer<typeof catalogSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export const journeySchema = z.object({ pickupId: z.string().min(1, 'Choose a pickup location.'), destinationId: z.string().min(1, 'Choose a destination.'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), passengers: z.number().int().min(1).max(7), bags: z.number().int().min(0).max(6), tripType: z.enum(['one-way', 'return']), returnDate: z.string(), returnTime: z.string(), extraIds: z.array(z.string()) }).superRefine((v, ctx) => {
  if (v.pickupId === v.destinationId) ctx.addIssue({ code: 'custom', path: ['destinationId'], message: 'Choose a different destination.' });
  const pickup = new Date(`${v.date}T${v.time}:00+04:00`).getTime();
  if (!Number.isFinite(pickup) || pickup < Date.now() + 2 * 3600_000) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Choose a pickup at least 2 hours from now (UAE time).' });
  if (v.tripType === 'return') {
    const back = new Date(`${v.returnDate}T${v.returnTime}:00+04:00`).getTime();
    if (!Number.isFinite(back) || back <= pickup + 3600_000) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Choose a return at least 1 hour after pickup.' });
  }
});
export type Journey = z.infer<typeof journeySchema>;
export const contactSchema = z.object({ name: z.string().trim().min(2, 'Enter your full name.').max(100), email: z.email('Enter a valid email address.').max(254), phone: z.string().trim().regex(/^\+?[\d\s()-]{8,22}$/, 'Enter a valid phone number, including country code.') });
export type Contact = z.infer<typeof contactSchema>;
export const sessionSchema = z.object({ id: z.string(), name: z.string(), email: z.email() });
export type Session = z.infer<typeof sessionSchema>;
export const offerSchema = z.object({ vehicleId: z.string(), transfer: z.number().int().nonnegative(), returnTransfer: z.number().int().nonnegative(), extras: z.number().int().nonnegative(), total: z.number().int().nonnegative() });
export type Offer = z.infer<typeof offerSchema>;
export const quoteSchema = z.object({ id: z.string(), journey: z.object(journeySchema.shape), offers: z.array(offerSchema), expiresAt: z.string(), durationMinutes: z.number() });
export type Quote = z.infer<typeof quoteSchema>;
export const bookingInputSchema = z.object({ quoteId: z.string(), vehicleId: z.string(), contact: contactSchema, flightNumber: z.string().max(16), notes: z.string().max(1000), acceptedTerms: z.literal(true), idempotencyKey: z.string() });
export type BookingInput = z.infer<typeof bookingInputSchema>;
// Persisted journeys intentionally do not re-run future-date validation on historical records.
export const journeyRecordSchema = z.object({ pickupId: z.string(), destinationId: z.string(), date: z.string(), time: z.string(), passengers: z.number(), bags: z.number(), tripType: z.enum(['one-way', 'return']), returnDate: z.string(), returnTime: z.string(), extraIds: z.array(z.string()) });
export const legProgressSchema = z.object({startedAt:z.string().default(''),completedAt:z.string().default('')});
export const tripProgressSchema = z.object({outbound:legProgressSchema,return:legProgressSchema}).default({outbound:{startedAt:'',completedAt:''},return:{startedAt:'',completedAt:''}});
export const tripActionSchema = z.object({bookingId:z.string(),leg:z.enum(['outbound','return']),action:z.enum(['start','complete']),expectedAssignmentAt:z.string(),idempotencyKey:z.string().min(1)});
export type TripAction = z.infer<typeof tripActionSchema>;
export const bookingRecordSchema = z.object({ id: z.string(), reference: z.string(), customerId: z.string(), createdAt: z.string(), journey: journeyRecordSchema, vehicleId: z.string(), contact: contactSchema, offer: offerSchema, flightNumber: z.string(), notes: z.string(), status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']), paymentStatus: z.enum(['unpaid', 'paid', 'failed', 'refunded']), cancellationRequested: z.boolean(),
  pickupLabel:z.string().optional(), destinationLabel:z.string().optional(), durationMinutes:z.number().default(40), expectedEnd:z.string().default(''),
  assignment:z.object({driverId:z.string(),fleetVehicleId:z.string(),assignedAt:z.string(),driverName:z.string(),driverPhone:z.string(),vehicleName:z.string(),registration:z.string()}).nullable().default(null),
  amountPaid:z.number().int().nonnegative().default(0),amountRefunded:z.number().int().nonnegative().default(0),
  cancellation:z.object({status:z.enum(['none','requested','approved','declined']),reason:z.string(),ownerNote:z.string(),requestedAt:z.string(),resolvedAt:z.string()}).default({status:'none',reason:'',ownerNote:'',requestedAt:'',resolvedAt:''}),
  tripProgress:tripProgressSchema, assignedDriverIds:z.array(z.string()).default([]),
  activity:z.array(z.object({id:z.string(),at:z.string(),message:z.string(),actor:z.enum(['customer','owner','driver','system'])})).default([])
});
export type Booking = z.infer<typeof bookingRecordSchema>;
export const customRequestSchema = z.object({ contact: contactSchema, pickup: z.string().trim().min(2), destination: z.string().trim().min(2), date: z.string().min(1), time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('10:30'), passengers:z.number().int().min(1).max(30).default(2), bags:z.number().int().min(0).max(30).default(2), details: z.string().trim().min(10, 'Tell us a little more (at least 10 characters).').max(2000), acceptedTerms: z.literal(true), idempotencyKey: z.string() });
export type CustomRequest = z.infer<typeof customRequestSchema>;
export const requestReceiptSchema = z.object({ reference: z.string(), status: z.literal('pending_review') });
export type RequestReceipt = z.infer<typeof requestReceiptSchema>;
export const challengeSchema = z.object({ id: z.string(), demoCode: z.string().optional() });
export type Challenge = z.infer<typeof challengeSchema>;
export const checkoutSchema = z.discriminatedUnion('kind', [z.object({ kind: z.literal('demo'), bookingId: z.string() }), z.object({ kind: z.literal('redirect'), url: z.url() })]);
export type Checkout = z.infer<typeof checkoutSchema>;
export interface TravelService {
  readonly mode: 'mock' | 'api';
  getCatalog(signal?: AbortSignal): Promise<Catalog>;
  getQuote(journey: Journey, signal?: AbortSignal): Promise<Quote>;
  getSession(signal?: AbortSignal): Promise<Session | null>;
  requestSignIn(email: string): Promise<Challenge>;
  verifySignIn(challengeId: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
  createBooking(input: BookingInput): Promise<Booking>;
  listBookings(signal?: AbortSignal): Promise<Booking[]>;
  getBooking(id: string, signal?: AbortSignal): Promise<Booking>;
  startCheckout(bookingId: string): Promise<Checkout>;
  submitCustomRequest(input: CustomRequest): Promise<RequestReceipt>;
  requestCancellation(bookingId: string,reason?:string): Promise<Booking>;
  listCustomRequests(signal?:AbortSignal):Promise<CustomRequestRecord[]>;
  getCustomRequest(id:string,signal?:AbortSignal):Promise<CustomRequestRecord>;
  acceptCustomQuote(id:string,idempotencyKey:string):Promise<Booking>;
  ownerListBookings(signal?:AbortSignal):Promise<Booking[]>;
  ownerGetBooking(id:string,signal?:AbortSignal):Promise<Booking>;
  ownerResources(signal?:AbortSignal):Promise<Resources>;
  ownerAssign(input:AssignmentInput):Promise<Booking>;
  ownerConfirm(id:string):Promise<Booking>;
  ownerListCustomRequests(signal?:AbortSignal):Promise<CustomRequestRecord[]>;
  ownerGetCustomRequest(id:string,signal?:AbortSignal):Promise<CustomRequestRecord>;
  ownerQuote(input:OwnerQuoteInput):Promise<CustomRequestRecord>;
  ownerResolveCancellation(id:string,decision:'approved'|'declined',note:string):Promise<Booking>;
  ownerRefund(id:string,amount:number,idempotencyKey:string):Promise<Booking>;
  ownerCreateBooking(input:OwnerBookingInput):Promise<Booking>;
  driverProfile(signal?:AbortSignal):Promise<Resources['drivers'][number]>;
  driverListBookings(signal?:AbortSignal):Promise<Booking[]>;
  driverGetBooking(id:string,signal?:AbortSignal):Promise<Booking>;
  driverTripAction(input:TripAction):Promise<Booking>;
  subscribe?(listener:()=>void):()=>void;
  demo?:DemoControls;
}
export class ServiceError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'ServiceError'; }
}
export const money = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100);
export const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }).format(new Date(`${date}T12:00:00+04:00`));
export const todayUae = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function defaultJourney(): Journey {
  const next = new Date(); next.setDate(next.getDate() + 2);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(next);
  return { pickupId: 'dxb', destinationId: 'marina', date, time: '10:30', passengers: 2, bags: 2, tripType: 'one-way', returnDate: '', returnTime: '18:00', extraIds: [] };
}
export function errorMessage(error: unknown): string { return error instanceof ServiceError ? error.message : error instanceof z.ZodError ? error.issues[0]?.message ?? 'Check your details.' : 'Something went wrong. Please try again.'; }

export const driverSchema=z.object({id:z.string(),name:z.string(),phone:z.string(),available:z.boolean(),active:z.boolean(),licenceUntil:z.string()});
export const fleetVehicleSchema=z.object({id:z.string(),name:z.string(),categoryId:z.string(),registration:z.string(),passengers:z.number(),bags:z.number(),active:z.boolean(),registrationUntil:z.string()});
export const resourcesSchema=z.object({drivers:z.array(driverSchema),vehicles:z.array(fleetVehicleSchema)});
export type Resources=z.infer<typeof resourcesSchema>;
export const assignmentInputSchema=z.object({bookingId:z.string(),driverId:z.string().min(1,'Choose a driver.'),fleetVehicleId:z.string().min(1,'Choose a vehicle.'),expectedEnd:z.string().min(1)});
export type AssignmentInput=z.infer<typeof assignmentInputSchema>;
export const manualQuoteSchema=z.object({vehicleId:z.string(),base:z.number().int().nonnegative(),additional:z.number().int().nonnegative(),total:z.number().int().positive(),validUntil:z.string(),notes:z.string(),sentAt:z.string()});
export const customRequestRecordSchema=z.object({id:z.string(),reference:z.string(),createdAt:z.string(),contact:contactSchema,pickup:z.string(),destination:z.string(),date:z.string(),time:z.string(),passengers:z.number(),bags:z.number(),details:z.string(),status:z.enum(['new','draft','quoted','converted']),quote:manualQuoteSchema.nullable(),bookingId:z.string().nullable(),activity:z.array(z.object({id:z.string(),at:z.string(),message:z.string(),actor:z.enum(['customer','owner','system'])}))});
export type CustomRequestRecord=z.infer<typeof customRequestRecordSchema>;
export const ownerQuoteInputSchema=z.object({requestId:z.string(),vehicleId:z.string(),base:z.number().int().nonnegative(),additional:z.number().int().nonnegative(),validUntil:z.string(),notes:z.string().max(1000),send:z.boolean()});
export type OwnerQuoteInput=z.infer<typeof ownerQuoteInputSchema>;
export const ownerBookingInputSchema=z.object({journey:journeySchema,vehicleId:z.string(),contact:contactSchema,notes:z.string().max(1000),idempotencyKey:z.string()});
export type OwnerBookingInput=z.infer<typeof ownerBookingInputSchema>;
export interface DemoControls {
  getRole(): 'customer'|'owner'|'driver';
  getDriverId():string;
  getDriverOptions():{id:string;name:string}[];
  selectDriver(id:string):void;
  switchRole(role:'customer'|'owner'|'driver'):void;
  completePayment(id:string,result:'paid'|'failed'):Promise<Booking>;
  exportData():string;
  resetData():void;
  storageAvailable:boolean;
}
export const uaeDateTime=(value:string)=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Dubai',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
export function uaeInput(value:string){if(!value)return '';const d=new Date(new Date(value).getTime()+4*3600_000);return d.toISOString().slice(0,16);}
export const fullPickup=(j:Journey)=>new Date(`${j.date}T${j.time}:00+04:00`).getTime();
