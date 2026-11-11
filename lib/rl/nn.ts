// Minimal dependency-free neural network (MLP) with manual backprop + Adam.
// Used by the PPO actor and critic. Runs in the browser or Node.

export type RNG = () => number;

/** Deterministic seeded PRNG (mulberry32). */
export function createRng(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller. */
export function randn(rng: RNG): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class Dense {
  W: Float64Array; // shape [out][in], row-major
  b: Float64Array;
  gW: Float64Array;
  gb: Float64Array;
  private mW: Float64Array;
  private vW: Float64Array;
  private mb: Float64Array;
  private vb: Float64Array;

  constructor(public nIn: number, public nOut: number, gain: number, rng: RNG) {
    this.W = new Float64Array(nIn * nOut);
    this.b = new Float64Array(nOut);
    this.gW = new Float64Array(nIn * nOut);
    this.gb = new Float64Array(nOut);
    this.mW = new Float64Array(nIn * nOut);
    this.vW = new Float64Array(nIn * nOut);
    this.mb = new Float64Array(nOut);
    this.vb = new Float64Array(nOut);
    const std = gain / Math.sqrt(nIn);
    for (let i = 0; i < this.W.length; i++) this.W[i] = randn(rng) * std;
  }

  resetOptimizer() {
    this.mW.fill(0);
    this.vW.fill(0);
    this.mb.fill(0);
    this.vb.fill(0);
  }

  zeroGrad() {
    this.gW.fill(0);
    this.gb.fill(0);
  }

  adamStep(lr: number, step: number, scale = 1, b1 = 0.9, b2 = 0.999, eps = 1e-8) {
    const c1 = 1 - Math.pow(b1, step);
    const c2 = 1 - Math.pow(b2, step);
    for (let i = 0; i < this.W.length; i++) {
      const g = this.gW[i] * scale;
      this.mW[i] = b1 * this.mW[i] + (1 - b1) * g;
      this.vW[i] = b2 * this.vW[i] + (1 - b2) * g * g;
      this.W[i] -= (lr * (this.mW[i] / c1)) / (Math.sqrt(this.vW[i] / c2) + eps);
    }
    for (let i = 0; i < this.b.length; i++) {
      const g = this.gb[i] * scale;
      this.mb[i] = b1 * this.mb[i] + (1 - b1) * g;
      this.vb[i] = b2 * this.vb[i] + (1 - b2) * g * g;
      this.b[i] -= (lr * (this.mb[i] / c1)) / (Math.sqrt(this.vb[i] / c2) + eps);
    }
  }
}

export interface MLPState {
  sizes: number[];
  W: number[][];
  b: number[][];
}

/** tanh MLP with linear output layer. */
export class MLP {
  layers: Dense[] = [];
  private adamT = 0;

  constructor(public sizes: number[], outputGain: number, rng: RNG) {
    for (let i = 0; i < sizes.length - 1; i++) {
      const isLast = i === sizes.length - 2;
      this.layers.push(new Dense(sizes[i], sizes[i + 1], isLast ? outputGain : Math.SQRT2, rng));
    }
  }

  /** Forward pass. Returns activations: acts[0]=input, acts[i]=tanh output of layer i-1, acts[L]=linear output. */
  forward(x: ArrayLike<number>): Float64Array[] {
    const acts: Float64Array[] = [Float64Array.from(x as ArrayLike<number>)];
    for (let l = 0; l < this.layers.length; l++) {
      const L = this.layers[l];
      const inp = acts[l];
      const out = new Float64Array(L.nOut);
      for (let o = 0; o < L.nOut; o++) {
        let s = L.b[o];
        const base = o * L.nIn;
        for (let i = 0; i < L.nIn; i++) s += L.W[base + i] * inp[i];
        out[o] = l === this.layers.length - 1 ? s : Math.tanh(s);
      }
      acts.push(out);
    }
    return acts;
  }

  predict(x: ArrayLike<number>): Float64Array {
    const acts = this.forward(x);
    return acts[acts.length - 1];
  }

  /** Accumulate gradients given dLoss/dOutput for one sample. */
  backward(acts: Float64Array[], dOut: ArrayLike<number>) {
    let delta = Float64Array.from(dOut as ArrayLike<number>);
    for (let l = this.layers.length - 1; l >= 0; l--) {
      const L = this.layers[l];
      const aIn = acts[l];
      const next = l > 0 ? new Float64Array(L.nIn) : null;
      for (let o = 0; o < L.nOut; o++) {
        const d = delta[o];
        if (d === 0) continue;
        L.gb[o] += d;
        const base = o * L.nIn;
        for (let i = 0; i < L.nIn; i++) {
          L.gW[base + i] += d * aIn[i];
          if (next) next[i] += d * L.W[base + i];
        }
      }
      if (next) {
        for (let i = 0; i < next.length; i++) next[i] *= 1 - aIn[i] * aIn[i]; // tanh'
        delta = next;
      }
    }
  }

  zeroGrad() {
    for (const L of this.layers) L.zeroGrad();
  }

  gradNorm(): number {
    let s = 0;
    for (const L of this.layers) {
      for (let i = 0; i < L.gW.length; i++) s += L.gW[i] * L.gW[i];
      for (let i = 0; i < L.gb.length; i++) s += L.gb[i] * L.gb[i];
    }
    return Math.sqrt(s);
  }

  /** Apply one Adam step. `scale` multiplies gradients (batch-averaging / norm clipping). */
  step(lr: number, scale: number) {
    this.adamT++;
    for (const L of this.layers) L.adamStep(lr, this.adamT, scale);
  }

  toJSON(): MLPState {
    return {
      sizes: this.sizes.slice(),
      W: this.layers.map((l) => Array.from(l.W)),
      b: this.layers.map((l) => Array.from(l.b)),
    };
  }

  loadState(s: MLPState) {
    if (s.sizes.length !== this.sizes.length || s.sizes.some((v, i) => v !== this.sizes[i])) {
      throw new Error("MLP shape mismatch while loading weights");
    }
    this.layers.forEach((l, i) => {
      l.W.set(s.W[i]);
      l.b.set(s.b[i]);
      l.resetOptimizer();
    });
    this.adamT = 0;
  }
}
