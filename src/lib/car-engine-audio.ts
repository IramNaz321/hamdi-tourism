/** Original synthesized engine, not a recording or a claim about the pictured car's engine. */
export const CAR_DRIVE_DURATION_MS = 3200;
export function playEngineStartup(audio: BaseAudioContext) {
  const start = audio.currentTime;
  const output = audio.createGain();
  const filter = audio.createBiquadFilter();
  const compressor = audio.createDynamicsCompressor();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, start);
  filter.frequency.exponentialRampToValueAtTime(520, start + 0.8);
  filter.frequency.exponentialRampToValueAtTime(1850, start + 1.65);
  filter.frequency.exponentialRampToValueAtTime(300, start + 2.55);
  output.gain.setValueAtTime(0, start);
  output.gain.linearRampToValueAtTime(0.04, start + 0.05);
  output.gain.linearRampToValueAtTime(0.025, start + 0.28);
  output.gain.linearRampToValueAtTime(0.07, start + 0.55);
  output.gain.linearRampToValueAtTime(0.08, start + 0.85);
  output.gain.linearRampToValueAtTime(0.16, start + 1.65);
  output.gain.exponentialRampToValueAtTime(0.045, start + 2.1);
  output.gain.exponentialRampToValueAtTime(0.001, start + 2.65);
  compressor.threshold.value = -18;
  compressor.knee.value = 20;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  output.connect(filter);
  filter.connect(compressor);
  compressor.connect(audio.destination);

  // Short mechanical crank followed by filtered, correlated exhaust texture.
  // Generated only on interaction: no download, recording, loop or microphone.
  const texture = audio.createBuffer(1, Math.ceil(audio.sampleRate * 2.7), audio.sampleRate);
  const samples = texture.getChannelData(0);
  let smooth = 0;
  for (let i = 0; i < samples.length; i++) {
    smooth = (smooth + 0.18 * (Math.random() * 2 - 1)) / 1.18;
    samples[i] = smooth;
  }
  const exhaust = audio.createBufferSource();
  exhaust.buffer = texture;
  const textureLevel = audio.createGain();
  textureLevel.gain.setValueAtTime(0.6, start);
  for (let pulse = 0; pulse < 5; pulse++) {
    textureLevel.gain.setValueAtTime(0.7, start + pulse * 0.06);
    textureLevel.gain.linearRampToValueAtTime(0.12, start + pulse * 0.06 + 0.04);
  }
  textureLevel.gain.linearRampToValueAtTime(0.35, start + 0.5);
  textureLevel.gain.linearRampToValueAtTime(0.55, start + 1.65);
  exhaust.connect(textureLevel);
  textureLevel.connect(output);
  exhaust.start(start);
  exhaust.stop(start + 2.7);

  // Four combustion pulses/revolution approximated with bounded harmonics.
  // Idle settles first; throttle then opens before a smooth lift-off.
  for (let harmonic = 1; harmonic <= 6; harmonic++) {
    const oscillator = audio.createOscillator();
    const level = audio.createGain();
    oscillator.type = harmonic <= 2 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(32 * harmonic, start + 0.28);
    oscillator.frequency.exponentialRampToValueAtTime(52 * harmonic, start + 0.55);
    oscillator.frequency.exponentialRampToValueAtTime(58 * harmonic, start + 0.85);
    oscillator.frequency.exponentialRampToValueAtTime(230 * harmonic, start + 1.65);
    oscillator.frequency.exponentialRampToValueAtTime(62 * harmonic, start + 2.5);
    level.gain.setValueAtTime(0, start);
    level.gain.linearRampToValueAtTime(1 / (harmonic * harmonic * 2.5), start + 0.4);
    oscillator.connect(level);
    level.connect(output);
    oscillator.start(start + 0.28);
    oscillator.stop(start + 2.7);
  }
}
