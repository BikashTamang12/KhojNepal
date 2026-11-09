import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { diskStorage } from 'multer';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const MAX_ITEM_IMAGES = 5;
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function getUploadRoot(uploadDir = process.env.UPLOAD_DIR || 'uploads'): string {
  return path.resolve(process.cwd(), uploadDir);
}

export function createItemImageMulterOptions(): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dest = path.join(getUploadRoot(), 'items');
        mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        const ext =
          MIME_TO_EXT[file.mimetype] ||
          path.extname(file.originalname || '').toLowerCase() ||
          '.jpg';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: {
      fileSize: MAX_IMAGE_FILE_SIZE_BYTES,
      files: MAX_ITEM_IMAGES,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        cb(
          new BadRequestException(
            'Only JPEG, PNG, and WebP images are allowed',
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export async function removeUploadedFiles(
  files: Array<Pick<Express.Multer.File, 'path'>>,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      if (!file.path) return;
      try {
        await unlink(file.path);
      } catch {
        // Ignore already-deleted temp files
      }
    }),
  );
}

export async function removeStoredImagePath(
  filePath: string,
  uploadDir?: string,
): Promise<void> {
  const cleanRelative = filePath.replace(/^\/+uploads\/?/i, '');
  const root = getUploadRoot(uploadDir);
  const resolved = path.resolve(root, cleanRelative);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return;
  }

  try {
    await unlink(resolved);
  } catch {
    // Ignore missing files on disk
  }
}
