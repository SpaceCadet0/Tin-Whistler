export interface PitchEstimate {
  /** Detected fundamental in Hz, 0 when no periodic signal was found. */
  freq: number
  /** 0…1, how periodic the signal is (1 − YIN aperiodicity). */
  clarity: number
  /** Root-mean-square level of the frame. */
  rms: number
}

export interface YinOptions {
  minFreq: number
  maxFreq: number
  /** Absolute threshold on the cumulative mean normalised difference (lower = stricter). */
  threshold?: number
}

/**
 * YIN pitch detector (de Cheveigné & Kawahara, 2002) with parabolic interpolation.
 * Pure function, runs in a Web Worker in the app, and in Node for tests.
 */
export function yin(buf: Float32Array, sampleRate: number, opts: YinOptions): PitchEstimate {
  const n = buf.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += buf[i] * buf[i]
  const rms = Math.sqrt(sum / n)
  if (rms < 1e-4) return { freq: 0, clarity: 0, rms }

  const tauMin = Math.max(2, Math.floor(sampleRate / opts.maxFreq))
  const tauMax = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / opts.minFreq))
  const w = n - tauMax
  const threshold = opts.threshold ?? 0.12

  const d = new Float32Array(tauMax + 1)
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0
    for (let i = 0; i < w; i++) {
      const diff = buf[i] - buf[i + tau]
      s += diff * diff
    }
    d[tau] = s
  }
  // cumulative mean normalised difference
  const cmnd = new Float32Array(tauMax + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau]
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1
  }

  let best = -1
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++
      best = tau
      break
    }
  }
  if (best < 0) {
    // no dip under the threshold: take the global minimum but report low clarity
    let min = Infinity
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau] < min) {
        min = cmnd[tau]
        best = tau
      }
    }
  }
  if (best <= 0) return { freq: 0, clarity: 0, rms }

  let refined = best
  if (best > 1 && best < tauMax) {
    const a = cmnd[best - 1]
    const b = cmnd[best]
    const c = cmnd[best + 1]
    const denom = a + c - 2 * b
    if (denom !== 0) refined = best + (a - c) / (2 * denom)
  }
  const clarity = Math.max(0, Math.min(1, 1 - cmnd[best]))
  return { freq: sampleRate / refined, clarity, rms }
}
