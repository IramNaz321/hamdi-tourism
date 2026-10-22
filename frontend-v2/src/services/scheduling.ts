import {fullPickup,type Booking,type Resources} from '../domain';
export function reservationWindows(booking:Booking,expectedEnd=booking.expectedEnd){
  const start=fullPickup(booking.journey);const end=Date.parse(expectedEnd)||start+booking.durationMinutes*60_000;
  const windows=[{start,end:end+20*60_000}];
  if(booking.journey.tripType==='return'){const back=Date.parse(`${booking.journey.returnDate}T${booking.journey.returnTime}:00+04:00`);windows.push({start:back,end:back+(booking.durationMinutes+20)*60_000});}
  return windows;
}
export function assignmentIssue(booking:Booking,driverId:string,vehicleId:string,expectedEnd:string,all:Booking[],resources:Resources):string|null{
  const driver=resources.drivers.find(d=>d.id===driverId);const vehicle=resources.vehicles.find(v=>v.id===vehicleId);
  const end=Date.parse(expectedEnd);const start=fullPickup(booking.journey);
  if(!Number.isFinite(end)||end<=start||end>start+24*3600_000)return 'Expected end must be after pickup and within 24 hours.';
  if(!driver?.active||!driver.available)return 'This driver is not available for assignment.';
  if(!vehicle?.active)return 'This vehicle is not operational.';
  if(vehicle.categoryId!==booking.vehicleId)return 'Choose a vehicle in the booked category.';
  if(vehicle.passengers<booking.journey.passengers||vehicle.bags<booking.journey.bags)return 'This vehicle does not have enough passenger or luggage capacity.';
  const windows=reservationWindows(booking,expectedEnd);
  const lastEnd=Math.max(...windows.map(w=>w.end));
  if(Date.parse(`${driver.licenceUntil}T23:59:59+04:00`)<lastEnd)return 'The driver licence expires before this journey ends.';
  if(Date.parse(`${vehicle.registrationUntil}T23:59:59+04:00`)<lastEnd)return 'The vehicle registration expires before this journey ends.';
  if(windows.length>1&&windows[1].start<windows[0].end)return 'The return trip starts before the outbound trip and turnaround finish.';
  for(const other of all){if(other.id===booking.id||!other.assignment||['cancelled','completed'].includes(other.status))continue;if(other.assignment.driverId!==driverId&&other.assignment.fleetVehicleId!==vehicleId)continue;
    if(windows.some(a=>reservationWindows(other).some(b=>a.start<b.end&&a.end>b.start)))return `Scheduling conflict with ${other.reference}. Choose another driver/vehicle or adjust the expected end.`;
  }
  return null;
}
