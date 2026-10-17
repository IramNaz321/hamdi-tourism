# Homepage car interaction

The approved black sedan and Dubai scene are unchanged. The car is baked into one
flat WebP; there is no separate car, wheel or suspension layer. The enhancement uses
a restrained pan/zoom of that same photograph, including the background, to suggest
startup and acceleration. It is not an independently moving vehicle or rotating
wheels. No replacement image, external audio asset or recording was introduced.

Click/tap the car hotspot, or activate Rev engine by keyboard. A 3.2-second visual
sequence starts gently, adds tiny startup movement, accelerates and returns to its
exact original transform. Further clicks during playback do not queue effects;
click again after completion to replay. The hero text, branding, booking buttons,
route overlays and section geometry do not animate. Motion uses transform only,
with temporary compositor hints and no animation loop or added animation library.

The original procedural Web Audio graph now has a brief cranking texture, settled
idle, rising combustion harmonics and throttle lift-off/fade. It is synthesized,
not a genuine BMW/vehicle recording. Buffers/nodes are created only after the user's
click. Bounded gain and compression limit peaks. No microphone, download or server
request is involved. Sources stop after 2.7 seconds; the context closes when the
3.2-second sequence ends. Audio policies/resume failures leave the visual effect
usable and report an unavailable sound state.

Mute remains persistent with an in-memory fallback if local storage is blocked.
Muting stops audio immediately while the visual return continues. Hidden-page and
unmount cleanup stop sound and reset the effect. Reduced-motion preferences disable
the movement while leaving explicitly requested audio/mute controls available.

Keep CAR_DRIVE_DURATION_MS and the CSS sequence at the same duration. The supported
CSS :has()/media-query/transform behavior is exercised in Chromium desktop and
Pixel mobile emulation. 20 targeted browser tests passed, covering native Web Audio
startup/rev levels, unclipped peaks and a silent tail; user-triggered playback,
mute/persistence, keyboard, unsupported audio, reduced motion, transform timing,
exact return/replay, unchanged controls, retained image and existing hero/auth guards.
This does not certify audible realism on physical phones or Safari/Edge devices.
