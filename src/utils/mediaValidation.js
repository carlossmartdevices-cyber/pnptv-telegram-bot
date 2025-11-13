/**
 * Media Validation Utilities
 * Validates file sizes and types for broadcasts and uploads
 */

const logger = require("./logger");

// File size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types for documents
const ALLOWED_MIME_TYPES = [
  'image/',
  'video/',
  'application/pdf',
  'application/msword',
  'application/vnd.ms-',
  'application/vnd.openxmlformats-officedocument',
];

/**
 * Validate photo size
 * @param {number} fileSize - File size in bytes
 * @param {string} lang - User language
 * @returns {Object} { valid: boolean, error: string }
 */
function validatePhotoSize(fileSize, lang = 'en') {
  if (!fileSize || fileSize <= MAX_PHOTO_SIZE) {
    return { valid: true };
  }

  const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
  const error = lang === 'es'
    ? `❌ La foto es demasiado grande (máximo 10MB). Tamaño: ${sizeMB}MB`
    : `❌ Photo is too large (max 10MB). Size: ${sizeMB}MB`;

  logger.warn(`Photo size validation failed: ${sizeMB}MB`);
  return { valid: false, error };
}

/**
 * Validate video size
 * @param {number} fileSize - File size in bytes
 * @param {string} lang - User language
 * @returns {Object} { valid: boolean, error: string }
 */
function validateVideoSize(fileSize, lang = 'en') {
  if (!fileSize || fileSize <= MAX_VIDEO_SIZE) {
    return { valid: true };
  }

  const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
  const error = lang === 'es'
    ? `❌ El video es demasiado grande (máximo 50MB). Tamaño: ${sizeMB}MB`
    : `❌ Video is too large (max 50MB). Size: ${sizeMB}MB`;

  logger.warn(`Video size validation failed: ${sizeMB}MB`);
  return { valid: false, error };
}

/**
 * Validate document size and type
 * @param {number} fileSize - File size in bytes
 * @param {string} mimeType - MIME type of the document
 * @param {string} lang - User language
 * @returns {Object} { valid: boolean, error: string }
 */
function validateDocument(fileSize, mimeType, lang = 'en') {
  // Check size
  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    const error = lang === 'es'
      ? `❌ El archivo es demasiado grande (máximo 50MB). Tamaño: ${sizeMB}MB`
      : `❌ File is too large (max 50MB). Size: ${sizeMB}MB`;

    logger.warn(`Document size validation failed: ${sizeMB}MB`);
    return { valid: false, error };
  }

  // Check MIME type
  const isAllowed = ALLOWED_MIME_TYPES.some(type => mimeType.startsWith(type));

  if (!isAllowed) {
    const error = lang === 'es'
      ? `❌ Tipo de archivo no permitido: ${mimeType}\n\nFormatos permitidos: imágenes, videos, PDFs, documentos de Office`
      : `❌ File type not allowed: ${mimeType}\n\nAllowed formats: images, videos, PDFs, Office documents`;

    logger.warn(`Document type validation failed: ${mimeType}`);
    return { valid: false, error };
  }

  return { valid: true };
}

/**
 * Validate broadcast media
 * Main function for validating media in broadcasts
 * @param {Object} ctx - Telegraf context
 * @param {string} mediaType - 'photo', 'video', or 'document'
 * @returns {Object} { valid: boolean, error: string, fileId: string }
 */
function validateBroadcastMedia(ctx, mediaType) {
  const lang = ctx.session?.language || 'en';
  let fileId, fileSize, mimeType;

  try {
    switch (mediaType) {
      case 'photo':
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        fileId = photo.file_id;
        fileSize = photo.file_size || 0;

        const photoValidation = validatePhotoSize(fileSize, lang);
        if (!photoValidation.valid) {
          return photoValidation;
        }
        break;

      case 'video':
        fileId = ctx.message.video.file_id;
        fileSize = ctx.message.video.file_size || 0;

        const videoValidation = validateVideoSize(fileSize, lang);
        if (!videoValidation.valid) {
          return videoValidation;
        }
        break;

      case 'document':
        fileId = ctx.message.document.file_id;
        fileSize = ctx.message.document.file_size || 0;
        mimeType = ctx.message.document.mime_type || '';

        const docValidation = validateDocument(fileSize, mimeType, lang);
        if (!docValidation.valid) {
          return docValidation;
        }
        break;

      default:
        return {
          valid: false,
          error: lang === 'es'
            ? '❌ Tipo de medio no soportado'
            : '❌ Unsupported media type'
        };
    }

    logger.info(`Media validation passed: ${mediaType}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    return {
      valid: true,
      fileId,
      fileSize,
      mimeType
    };

  } catch (error) {
    logger.error('Error in media validation:', error);
    return {
      valid: false,
      error: lang === 'es'
        ? '❌ Error al validar el archivo'
        : '❌ Error validating file'
    };
  }
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "5.2 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  validatePhotoSize,
  validateVideoSize,
  validateDocument,
  validateBroadcastMedia,
  formatFileSize,
  MAX_FILE_SIZE,
  MAX_PHOTO_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_MIME_TYPES
};
