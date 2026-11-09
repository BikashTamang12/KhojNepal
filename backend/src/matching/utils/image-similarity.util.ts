import { readFile } from 'node:fs/promises';
import path from 'node:path';
import jpegJs from 'jpeg-js';
import pngjs from 'pngjs';

export interface DecodedRgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface ImageSignature {
  dHash: bigint;
  colorHistogram: number[];
}

function resolveUploadFilePath(filePath: string, uploadDir: string): string {
  const cleanRelative = filePath.replace(/^\/+uploads\/?/i, '');
  const resolvedRoot = path.resolve(process.cwd(), uploadDir);
  const resolvedPath = path.resolve(resolvedRoot, cleanRelative);

  // Prevent path traversal outside configured uploadDir
  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error('Invalid image path');
  }

  return resolvedPath;
}

export function decodeImageBuffer(
  buffer: Buffer,
  mimeType?: string,
): DecodedRgbaImage | null {
  if (buffer.length === 0) return null;

  const isPng =
    mimeType === 'image/png' ||
    (buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47);

  if (isPng) {
    try {
      const png = pngjs.PNG.sync.read(buffer);
      if (png.width > 0 && png.height > 0 && png.data.length >= png.width * png.height * 4) {
        return {
          width: png.width,
          height: png.height,
          data: new Uint8Array(png.data),
        };
      }
    } catch {
      return null;
    }
  }

  const isJpeg =
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff);

  if (isJpeg) {
    try {
      const decoded = jpegJs.decode(buffer, { useTArray: true, formatAsRGBA: true });
      if (
        decoded.width > 0 &&
        decoded.height > 0 &&
        decoded.data.length >= decoded.width * decoded.height * 4
      ) {
        return {
          width: decoded.width,
          height: decoded.height,
          data: decoded.data,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function computeImageSignature(image: DecodedRgbaImage): ImageSignature {
  const { width, height, data } = image;

  // 1. 64-bit Difference Hash (9x8 grayscale grid)
  const gridWidth = 9;
  const gridHeight = 8;
  const grid: number[] = [];

  for (let gy = 0; gy < gridHeight; gy++) {
    const sy = Math.min(height - 1, Math.floor(((gy + 0.5) * height) / gridHeight));
    for (let gx = 0; gx < gridWidth; gx++) {
      const sx = Math.min(width - 1, Math.floor(((gx + 0.5) * width) / gridWidth));
      const idx = (sy * width + sx) * 4;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      grid.push(luminance);
    }
  }

  let dHash = 0n;
  let bitPos = 0n;
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridHeight; col++) {
      const left = grid[row * gridWidth + col];
      const right = grid[row * gridWidth + col + 1];
      if (left > right) {
        dHash |= 1n << bitPos;
      }
      bitPos += 1n;
    }
  }

  // 2. Normalized 24-bin soft RGB color histogram (8 smoothly interpolated bins per channel)
  const binsPerChannel = 8;
  const histogram = Array.from({ length: binsPerChannel * 3 }, () => 0);
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 4096));
  let sampledCount = 0;

  const addChannelSample = (offset: number, value: number) => {
    const pos = (Math.min(255, Math.max(0, value)) / 255) * (binsPerChannel - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(binsPerChannel - 1, lo + 1);
    const wHi = pos - lo;
    const wLo = 1 - wHi;
    histogram[offset + lo] += wLo;
    histogram[offset + hi] += wHi;
  };

  for (let p = 0; p < totalPixels; p += sampleStep) {
    const idx = p * 4;
    const a = data[idx + 3] ?? 255;
    if (a < 32) continue;
    addChannelSample(0, data[idx] ?? 0);
    addChannelSample(binsPerChannel, data[idx + 1] ?? 0);
    addChannelSample(binsPerChannel * 2, data[idx + 2] ?? 0);
    sampledCount += 1;
  }

  if (sampledCount > 0) {
    for (let i = 0; i < histogram.length; i++) {
      histogram[i] = histogram[i] / (sampledCount * 3);
    }
  }

  return { dHash, colorHistogram: histogram };
}

function hammingDistance64(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    if ((xor & 1n) === 1n) {
      count++;
    }
    xor >>= 1n;
  }
  return count;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.min(1, Math.max(0, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

export function compareSignatures(a: ImageSignature, b: ImageSignature): number {
  const hashSimilarity = 1 - hammingDistance64(a.dHash, b.dHash) / 64;
  const colorSimilarity = cosineSimilarity(a.colorHistogram, b.colorHistogram);
  return Math.min(1, Math.max(0, 0.55 * colorSimilarity + 0.45 * hashSimilarity));
}

export async function loadSignatureFromFile(
  filePath: string,
  mimeType: string | undefined,
  uploadDir: string,
): Promise<ImageSignature | null> {
  try {
    const resolved = resolveUploadFilePath(filePath, uploadDir);
    const buffer = await readFile(resolved);
    const decoded = decodeImageBuffer(buffer, mimeType);
    if (decoded) {
      return computeImageSignature(decoded);
    }

    // Fallback normalized byte histogram for valid WebP or synthetic image buffers
    const bins = Array.from({ length: 24 }, () => 0);
    const sampleSize = Math.min(buffer.length, 4096);
    if (sampleSize === 0) return null;
    for (let i = 0; i < sampleSize; i++) {
      const bin = Math.min(23, Math.floor((buffer[i] / 256) * 24));
      bins[bin] += 1;
    }
    for (let i = 0; i < bins.length; i++) {
      bins[i] /= sampleSize;
    }
    return { dHash: 0n, colorHistogram: bins };
  } catch {
    return null;
  }
}

export function computeBestImageScore(
  lostSignatures: ImageSignature[],
  foundSignatures: ImageSignature[],
): { imageScore: number; hasComparableImages: boolean } {
  if (lostSignatures.length === 0 || foundSignatures.length === 0) {
    return { imageScore: 0, hasComparableImages: false };
  }

  let best = 0;
  for (const lostSig of lostSignatures) {
    for (const foundSig of foundSignatures) {
      const score = compareSignatures(lostSig, foundSig);
      if (score > best) {
        best = score;
      }
    }
  }

  return {
    imageScore: Number(best.toFixed(4)),
    hasComparableImages: true,
  };
}
