import { micInput } from './MicInput'

export interface Take {
  id: number
  url: string
  blob: Blob
  seconds: number
  createdAt: number
}

/** Records the microphone with MediaRecorder (shares the stream with pitch detection). */
export class Recorder {
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  private ownStream: MediaStream | null = null
  private nextId = 1

  get recording(): boolean {
    return this.rec?.state === 'recording'
  }

  static supported(): boolean {
    return typeof MediaRecorder !== 'undefined'
  }

  async start(): Promise<void> {
    let stream = micInput.mediaStream
    if (!stream) {
      this.ownStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      stream = this.ownStream
    }
    this.chunks = []
    this.rec = new MediaRecorder(stream)
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
    this.rec.start()
    this.startedAt = performance.now()
  }

  stop(): Promise<Take> {
    return new Promise((resolve, reject) => {
      const rec = this.rec
      if (!rec) return reject(new Error('not recording'))
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' })
        this.ownStream?.getTracks().forEach((t) => t.stop())
        this.ownStream = null
        this.rec = null
        resolve({ id: this.nextId++, url: URL.createObjectURL(blob), blob, seconds: (performance.now() - this.startedAt) / 1000, createdAt: Date.now() })
      }
      rec.stop()
    })
  }
}
