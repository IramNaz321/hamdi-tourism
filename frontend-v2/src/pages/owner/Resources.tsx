import { Plus, UserPlus, CarProfile } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../state";
import { useRemote } from "../../useRemote";
import { errorMessage, todayUae, type DriverInput, type VehicleInput } from "../../domain";
import { OwnerPageHeading, Status } from "../../components/OwnerUI";
import { Alert, Button, Field, Loading, Modal } from "../../components/ui";
export function OwnerResourcesPage() {
  const { service, demoRole } = useApp();
  const drivers = useLocation().pathname.endsWith("drivers");
  const result = useRemote((s) => service.ownerResources(s), [demoRole]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [driver, setDriver] = useState<DriverInput>({ name: "", email: "", phone: "" });
  const [vehicle, setVehicle] = useState<VehicleInput>({
    name: "",
    categoryId: "sedan",
    registration: "",
    registrationUntil: "",
    passengers: 3,
    bags: 3,
  });
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError("");
    try {
      if (drivers) {
        await service.ownerCreateDriver(driver);
        setSuccess(
          "Driver invited. They can sign in with their email, submit onboarding, and await your activation.",
        );
        setDriver({ name: "", email: "", phone: "" });
      } else {
        await service.ownerCreateVehicle(vehicle);
        setSuccess("Vehicle added and available for eligible assignments.");
        setVehicle({
          name: "",
          categoryId: "sedan",
          registration: "",
          registrationUntil: "",
          passengers: 3,
          bags: 3,
        });
      }
      setAdding(false);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function toggle(id: string, active: boolean) {
    setBusy(id);
    setError("");
    setSuccess("");
    try {
      if (drivers) await service.ownerSetDriverActive(id, active);
      else await service.ownerSetVehicleActive(id, active);
      setSuccess(`${drivers ? "Driver" : "Vehicle"} ${active ? "activated" : "deactivated"}.`);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <OwnerPageHeading
        title={drivers ? "Drivers" : "Fleet"}
        subtitle={
          drivers
            ? "Invite drivers, review onboarding, and manage assignment eligibility."
            : "Maintain your vehicles and control which can be assigned."
        }
        action={
          <Button
            onClick={() => {
              setError("");
              setAdding(true);
            }}
            disabled={service.mode === "mock"}
          >
            {drivers ? <UserPlus size={18} /> : <Plus size={18} />}{" "}
            {drivers ? "Invite driver" : "Add vehicle"}
          </Button>
        }
      />
      {error && !adding ? <Alert>{error}</Alert> : null}
      {success ? <Alert kind="success">{success}</Alert> : null}
      {result.error ? (
        <Alert>
          {result.error}
          <button onClick={result.reload} className="text-link">
            Try again
          </button>
        </Alert>
      ) : !result.data ? (
        <Loading />
      ) : (
        <div
          className="owner-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Data table. Scroll horizontally to view all columns."
        >
          <table className="owner-table">
            {drivers ? (
              <>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Contact</th>
                    <th>Onboarding</th>
                    <th>Licence valid until</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.drivers.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                      </td>
                      <td>
                        {d.email ? (
                          <span>
                            {d.email}
                            <br />
                          </span>
                        ) : null}
                        {d.phone}
                      </td>
                      <td>
                        <Status
                          value={d.onboardingStatus === "approved" ? "confirmed" : "pending"}
                          label={d.onboardingStatus ?? "approved"}
                        />
                      </td>
                      <td>
                        {d.licenceUntil}
                        {d.licenceNumber ? <small>{d.licenceNumber}</small> : null}
                      </td>
                      <td>
                        <Status
                          value={d.active ? "confirmed" : "cancelled"}
                          label={d.active ? "Active" : "Inactive"}
                        />
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          busy={busy === d.id}
                          disabled={
                            !!busy ||
                            service.mode === "mock" ||
                            (!d.active && d.onboardingStatus === "invited")
                          }
                          onClick={() => toggle(d.id, !d.active)}
                        >
                          {d.active
                            ? "Deactivate"
                            : d.onboardingStatus === "submitted"
                              ? "Approve & activate"
                              : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Registration</th>
                    <th>Category</th>
                    <th>Capacity</th>
                    <th>Registration valid until</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.registration}</td>
                      <td>{v.categoryId}</td>
                      <td>
                        {v.passengers} seats · {v.bags} bags
                      </td>
                      <td>{v.registrationUntil}</td>
                      <td>
                        <Status
                          value={v.active ? "confirmed" : "cancelled"}
                          label={v.active ? "Active" : "Inactive"}
                        />
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          busy={busy === v.id}
                          disabled={!!busy || service.mode === "mock"}
                          onClick={() => toggle(v.id, !v.active)}
                        >
                          {v.active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
          {!(drivers ? result.data.drivers : result.data.vehicles).length ? (
            <div className="owner-empty">
              <h2>{drivers ? "Your driver team starts here." : "Add your first vehicle."}</h2>
              <p>
                {drivers
                  ? "Invite a driver to begin onboarding."
                  : "Add an eligible vehicle before assigning bookings."}
              </p>
            </div>
          ) : null}
        </div>
      )}
      <div className="owner-info-strip">
        <CarProfile size={22} />
        <p>
          Active assignments must be reassigned or cancelled before a driver or vehicle can be
          deactivated.{" "}
          <Link className="text-link" to="/owner/bookings">
            Review bookings
          </Link>
        </p>
      </div>
      {service.mode === "mock" ? (
        <Alert kind="info">Onboarding and fleet changes require the connected local backend.</Alert>
      ) : null}
      {adding ? (
        <Modal
          title={drivers ? "Invite a driver" : "Add a vehicle"}
          onClose={() => {
            if (!busy) setAdding(false);
          }}
        >
          <form onSubmit={create} className="stack-form">
            {drivers ? (
              <>
                <p>
                  The driver signs in with their email and submits licence details. You review their
                  onboarding before activation.
                </p>
                <Field label="Full name" htmlFor="new-driver-name">
                  <input
                    id="new-driver-name"
                    required
                    value={driver.name}
                    onChange={(e) => setDriver({ ...driver, name: e.target.value })}
                  />
                </Field>
                <Field label="Work email" htmlFor="new-driver-email">
                  <input
                    id="new-driver-email"
                    type="email"
                    required
                    value={driver.email}
                    onChange={(e) => setDriver({ ...driver, email: e.target.value })}
                  />
                </Field>
                <Field label="Phone" htmlFor="new-driver-phone">
                  <input
                    id="new-driver-phone"
                    type="tel"
                    required
                    value={driver.phone}
                    onChange={(e) => setDriver({ ...driver, phone: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Vehicle name / model" htmlFor="new-vehicle-name">
                  <input
                    id="new-vehicle-name"
                    required
                    value={vehicle.name}
                    onChange={(e) => setVehicle({ ...vehicle, name: e.target.value })}
                  />
                </Field>
                <div className="form-row">
                  <Field label="Category" htmlFor="new-vehicle-category">
                    <select
                      id="new-vehicle-category"
                      value={vehicle.categoryId}
                      onChange={(e) =>
                        setVehicle({
                          ...vehicle,
                          categoryId: e.target.value as VehicleInput["categoryId"],
                        })
                      }
                    >
                      <option value="sedan">Sedan</option>
                      <option value="luxury">Luxury sedan</option>
                      <option value="family">Family vehicle</option>
                    </select>
                  </Field>
                  <Field label="Registration plate" htmlFor="new-vehicle-registration">
                    <input
                      id="new-vehicle-registration"
                      required
                      value={vehicle.registration}
                      onChange={(e) => setVehicle({ ...vehicle, registration: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="form-row">
                  <Field label="Passenger seats" htmlFor="new-vehicle-seats">
                    <input
                      id="new-vehicle-seats"
                      type="number"
                      min={1}
                      max={7}
                      required
                      value={vehicle.passengers}
                      onChange={(e) =>
                        setVehicle({ ...vehicle, passengers: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Luggage capacity" htmlFor="new-vehicle-bags">
                    <input
                      id="new-vehicle-bags"
                      type="number"
                      min={0}
                      max={6}
                      required
                      value={vehicle.bags}
                      onChange={(e) => setVehicle({ ...vehicle, bags: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <Field label="Registration expires" htmlFor="new-vehicle-expiry">
                  <input
                    id="new-vehicle-expiry"
                    type="date"
                    min={todayUae()}
                    required
                    value={vehicle.registrationUntil}
                    onChange={(e) => setVehicle({ ...vehicle, registrationUntil: e.target.value })}
                  />
                </Field>
              </>
            )}
            {error ? <Alert>{error}</Alert> : null}
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                disabled={!!busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy === "create"}>
                {drivers ? "Send invitation" : "Add vehicle"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
