import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpTravelService } from '../src/services/http';
import { seedState } from '../src/services/mock';
import { defaultJourney } from '../src/domain';
afterEach(()=>vi.unstubAllGlobals());
describe('future HTTP adapter',()=>{
 it('uses credentialed relative API requests and validates the response',async()=>{const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({locations:[],vehicles:[],extras:[]}),{status:200}));vi.stubGlobal('fetch',fetch);const result=await new HttpTravelService('/api/v2').getCatalog();expect(result.vehicles).toEqual([]);expect(fetch).toHaveBeenCalledWith('/api/v2/catalog',expect.objectContaining({credentials:'include'}));});
 it('rejects malformed success responses',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({vehicles:'invalid'}))));await expect(new HttpTravelService().getCatalog()).rejects.toMatchObject({code:'INVALID_RESPONSE'});});
 it('preserves meaningful server error codes',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'QUOTE_EXPIRED',message:'Refresh the quote.'}),{status:409})));await expect(new HttpTravelService().getQuote(defaultJourney())).rejects.toMatchObject({code:'QUOTE_EXPIRED',message:'Refresh the quote.'});});
 it('handles disconnected networks with a recoverable message',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));await expect(new HttpTravelService().getCatalog()).rejects.toMatchObject({code:'NETWORK'});});
 it('sends Driver progress through the typed API with assignment precondition and idempotency',async()=>{const booking=seedState().bookings[0];const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(booking)));vi.stubGlobal('fetch',fetch);const input={bookingId:'trip/1',leg:'outbound' as const,action:'start' as const,expectedAssignmentAt:'2026-10-22T10:00:00Z',idempotencyKey:'progress-once'};const actual=await new HttpTravelService('/api/v2').driverTripAction(input);expect(actual.tripProgress.outbound.startedAt).toBe('');expect(fetch).toHaveBeenCalledWith('/api/v2/driver/bookings/trip%2F1/progress',expect.objectContaining({method:'POST',credentials:'include',body:JSON.stringify(input),headers:expect.objectContaining({'Idempotency-Key':'progress-once'})}));});

});
