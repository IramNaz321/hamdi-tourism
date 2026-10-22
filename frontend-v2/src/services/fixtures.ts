import {catalogSchema,type Catalog} from '../domain';
export const catalog: Catalog = catalogSchema.parse({
  locations: [
    { id: 'dxb', name: 'Dubai International Airport (DXB)', shortName: 'Dubai Airport (DXB)', type: 'airport', city: 'Dubai' },
    { id: 'dwc', name: 'Al Maktoum International Airport (DWC)', shortName: 'Al Maktoum Airport', type: 'airport', city: 'Dubai' },
    { id: 'marina', name: 'Dubai Marina', shortName: 'Dubai Marina', type: 'destination', city: 'Dubai' },
    { id: 'downtown', name: 'Downtown Dubai', shortName: 'Downtown Dubai', type: 'destination', city: 'Dubai' },
    { id: 'palm', name: 'Palm Jumeirah', shortName: 'Palm Jumeirah', type: 'destination', city: 'Dubai' },
    { id: 'auh', name: 'Zayed International Airport (AUH)', shortName: 'Abu Dhabi Airport', type: 'airport', city: 'Abu Dhabi' },
    { id: 'abudhabi', name: 'Abu Dhabi city', shortName: 'Abu Dhabi', type: 'destination', city: 'Abu Dhabi' },
    { id: 'sharjah', name: 'Sharjah city', shortName: 'Sharjah', type: 'destination', city: 'Sharjah' },
  ],
  vehicles: [
    { id: 'sedan', name: 'Sedan', description: 'Comfortable and spacious for everyday travel.', passengers: 3, bags: 3, image: '/images/fleet-sedan.webp' },
    { id: 'luxury', name: 'Luxury sedan', description: 'Premium comfort with a little more space.', passengers: 3, bags: 3, image: '/images/fleet-luxury.webp' },
    { id: 'family', name: 'Family vehicle', description: 'Room for everyone, and everything you bring.', passengers: 7, bags: 6, image: '/images/fleet-family.webp' },
  ],
  extras: [ { id: 'child-seat', name: 'Child seat', description: 'One child seat, on each booked leg.', amount: 3500 }, { id: 'meet-greet', name: 'Meet & greet', description: 'A personal welcome at arrivals, per leg.', amount: 5000 } ],
});
