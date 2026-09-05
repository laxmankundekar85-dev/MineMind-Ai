export class WavAudioRecorder {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private muteGain: GainNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private recordingSampleRate: number = 44100;
  private targetSampleRate: number = 16000;
  private isRecording: boolean = false;
  private dummyAudio: HTMLAudioElement | null = null;

  async start(stream: MediaStream) {
    this.pcmChunks = [];
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioContext = new AudioContextClass();
    this.recordingSampleRate = this.audioContext.sampleRate;

    // Resume AudioContext if suspended so onaudioprocess starts receiving samples immediately
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('AudioContext resume notice:', err);
      }
    }

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      this.pcmChunks.push(new Float32Array(input));
      try {
        if (e.outputBuffer && e.outputBuffer.numberOfChannels > 0) {
          e.outputBuffer.getChannelData(0).fill(0);
        }
      } catch {}
    };

    // Connect processor to a virtual MediaStreamDestination sink (NEVER the physical speakers)
    // This keeps ScriptProcessor active without routing any signal to audioContext.destination
    const virtualDest = this.audioContext.createMediaStreamDestination();
    this.source.connect(this.processor);
    this.processor.connect(virtualDest);

    // Force Chromium's audio graph to pull frames by attaching a muted sink
    try {
      this.dummyAudio = new Audio();
      this.dummyAudio.srcObject = virtualDest.stream;
      this.dummyAudio.muted = true;
      this.dummyAudio.play().catch(() => {});
    } catch {}

    this.isRecording = true;
  }

  async stop(): Promise<Blob | null> {
    this.isRecording = false;
    if (this.dummyAudio) {
      try {
        this.dummyAudio.pause();
        this.dummyAudio.srcObject = null;
      } catch {}
      this.dummyAudio = null;
    }
    if (this.processor) {
      try { this.processor.disconnect(); } catch {}
      this.processor = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { await this.audioContext.close(); } catch {}
      this.audioContext = null;
    }

    if (this.pcmChunks.length === 0) return null;

    let totalLength = 0;
    for (const chunk of this.pcmChunks) {
      totalLength += chunk.length;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const downsampled = this.downsampleBuffer(merged, this.recordingSampleRate, this.targetSampleRate);
    return this.encodeWAV(downsampled, this.targetSampleRate);
  }

  private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (outputRate === inputRate) return buffer;
    const sampleRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 channel (mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}
