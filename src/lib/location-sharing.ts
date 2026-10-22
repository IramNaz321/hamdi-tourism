import { gpsSchema, type GPSFix } from "./tracking";
type Options = {
  geolocation?: Pick<Geolocation, "watchPosition" | "clearWatch">;
  send: (fix: GPSFix) => Promise<{ denied?: boolean; error?: boolean }>;
  revoke: () => Promise<void>;
  report: (message: string, sharing: boolean) => void;
  now?: () => number;
};
/** Only explicit start() requests device permission; no coordinate history or offline queue. */
export class LocationSharing {
  private watch: number | null = null;
  private pending: number | null = null;
  private lastSent = -Infinity;
  private active = false;
  private generation = 0;
  constructor(private options: Options) {}
  start() {
    if (this.active) return;
    if (!this.options.geolocation) {
      this.options.report("GPS is unavailable in this browser.", false);
      return;
    }
    this.active = true;
    const generation = ++this.generation;
    this.lastSent = -Infinity;
    this.options.report("Requesting location permission…", true);
    try {
      this.watch = this.options.geolocation.watchPosition(
        (position) => void this.position(position, generation),
        (error) => {
          if (generation !== this.generation) return;
          if (error.code === 1)
            this.stop("Location permission denied. Enable it in browser settings to share.");
          else
            this.options.report(
              "Waiting for a reliable GPS signal. You can stop sharing at any time.",
              true,
            );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    } catch {
      this.stop("GPS could not start. Check browser permissions and retry.");
    }
  }
  private async position(position: GeolocationPosition, generation: number) {
    const now = (this.options.now ?? Date.now)();
    if (
      !this.active ||
      generation !== this.generation ||
      this.pending === generation ||
      now - this.lastSent < 8000
    )
      return;
    const c = position.coords;
    if (
      !Number.isFinite(position.timestamp) ||
      now - position.timestamp > 30000 ||
      position.timestamp - now > 5000
    ) {
      this.options.report("GPS fix is stale. Waiting for a fresh location.", true);
      return;
    }
    const parsed = gpsSchema.safeParse({
      latitude: c.latitude,
      longitude: c.longitude,
      accuracy: c.accuracy,
      heading: c.heading != null && Number.isFinite(c.heading) ? c.heading : null,
      capturedAt: new Date(position.timestamp).toISOString(),
    });
    if (!parsed.success) {
      this.options.report("GPS accuracy is insufficient. Waiting for a reliable fix.", true);
      return;
    }
    this.pending = generation;
    this.lastSent = now;
    try {
      const result = await this.options.send(parsed.data);
      if (generation !== this.generation) return;
      if (result.denied) {
        this.stop("Trip access changed or your session expired. Refresh before restarting.");
        return;
      }
      this.options.report(
        result.error
          ? "Location could not be sent. Last received position may be stale."
          : c.accuracy > 100
            ? "Sharing · GPS accuracy is low."
            : "Sharing your current GPS location.",
        true,
      );
    } catch {
      if (generation === this.generation)
        this.stop(
          "Connection unavailable. Sharing stopped; reconnect and start again with consent.",
        );
    } finally {
      if (this.pending === generation) this.pending = null;
    }
  }
  stop(message = "Location sharing stopped.") {
    const wasActive = this.active;
    this.active = false;
    ++this.generation;
    if (this.watch !== null) this.options.geolocation?.clearWatch(this.watch);
    this.watch = null;
    this.options.report(message, false);
    if (wasActive)
      void this.options
        .revoke()
        .catch(() =>
          this.options.report(
            "Sharing stopped on this device. The last server position expires within two minutes.",
            false,
          ),
        );
  }
}
