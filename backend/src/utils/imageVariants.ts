import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { s3Client, generateCloudfrontSignedUrl } from '../config/s3.js';
import { ENV_VARS } from '../config/envVars.js';
import logger from '../config/logger.js';

export type ImageSize = 'thumb' | 'medium' | 'full';

export interface VariantKeys {
  thumb: string;
  medium: string;
  full: string;
}

export interface VariantUrls {
  thumb: string;
  medium: string;
  full: string;
}

const VARIANT_WIDTHS: Record<Exclude<ImageSize, 'full'>, number> = {
  thumb: 200,
  medium: 400,
};

// Insert a `_size` suffix before the extension. Pure function — keeps key
// derivation deterministic so the backend, frontend (via the same shape), and
// the backfill script all agree on where variants live in S3.
export const getVariantKeys = (originalKey: string): VariantKeys => {
  const dot = originalKey.lastIndexOf('.');
  const base = dot === -1 ? originalKey : originalKey.slice(0, dot);
  const ext = dot === -1 ? '' : originalKey.slice(dot);
  return {
    thumb: `${base}_thumb${ext}`,
    medium: `${base}_medium${ext}`,
    full: originalKey,
  };
};

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const getOriginalBuffer = async (key: string): Promise<Buffer> => {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: ENV_VARS.AWS_BUCKET_NAME, Key: key })
  );
  if (!response.Body) {
    throw new Error(`S3 object has no body: ${key}`);
  }
  return streamToBuffer(response.Body as NodeJS.ReadableStream);
};

const putVariant = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

// Reads the just-uploaded original from S3, generates `_thumb` (200w) and
// `_medium` (400w) JPEG variants, and writes them back to S3 alongside the
// original. Used by upload routes after multer-s3 streams the original.
// Returns true on full success — callers should only set the
// `hasImageVariants` flag if this returns true.
export const generateImageVariants = async (originalKey: string): Promise<boolean> => {
  try {
    const original = await getOriginalBuffer(originalKey);
    const variants = getVariantKeys(originalKey);

    const [thumbBuf, mediumBuf] = await Promise.all([
      sharp(original).resize({ width: VARIANT_WIDTHS.thumb, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer(),
      sharp(original).resize({ width: VARIANT_WIDTHS.medium, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(),
    ]);

    await Promise.all([
      putVariant(variants.thumb, thumbBuf, 'image/jpeg'),
      putVariant(variants.medium, mediumBuf, 'image/jpeg'),
    ]);

    logger.info('Image variants generated', { originalKey, thumb: variants.thumb, medium: variants.medium });
    return true;
  } catch (error) {
    logger.error('Failed to generate image variants', {
      originalKey,
      error: (error as Error).message,
    });
    return false;
  }
};

// Sign all three CloudFront URLs in parallel. Caller is responsible for
// gating this behind a `hasImageVariants` flag — calling it on a key whose
// variants don't exist returns valid-looking URLs that 404 at the edge.
export const generatePosterUrls = async (originalKey: string): Promise<VariantUrls> => {
  const variants = getVariantKeys(originalKey);
  const [thumb, medium, full] = await Promise.all([
    generateCloudfrontSignedUrl(variants.thumb),
    generateCloudfrontSignedUrl(variants.medium),
    generateCloudfrontSignedUrl(variants.full),
  ]);
  return { thumb, medium, full };
};

// Mutates `movie` in place: sets `posterUrl` always; sets `posterUrls` triple
// only when `hasImageVariants === true`. Centralizes the gating so every API
// response shape stays consistent.
export const attachPosterUrls = async (
  movie: { posterKey?: string; posterUrl?: string; posterUrls?: VariantUrls; hasImageVariants?: boolean }
): Promise<void> => {
  if (!movie.posterKey) return;
  try {
    if (movie.hasImageVariants) {
      const urls = await generatePosterUrls(movie.posterKey);
      movie.posterUrls = urls;
      movie.posterUrl = urls.full;
    } else {
      movie.posterUrl = await generateCloudfrontSignedUrl(movie.posterKey);
    }
  } catch (error) {
    logger.warn('Failed to attach poster URLs', { posterKey: movie.posterKey, error: (error as Error).message });
  }
};
