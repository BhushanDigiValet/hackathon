import { BadRequestException } from '@nestjs/common';
import { GenerateVideoRequest } from '../interfaces/video-generation.interface';

export class VideoRequestValidator {
  private static readonly VALID_ASPECT_RATIOS = new Set([
    '16:9',
    '9:16',
    '1:1',
    '4:3',
    '3:4',
    '21:9',
    '9:21',
  ]);

  private static readonly VALID_RESOLUTIONS = new Set([
    '480p',
    '540p',
    '720p',
    '1080p',
    '1440p',
    '4k',
  ]);

  /**
   * Validates a GenerateVideoRequest object.
   * Throws BadRequestException with clear descriptions if validation fails.
   */
  public static validate(request: any): GenerateVideoRequest {
    if (!request || typeof request !== 'object') {
      throw new BadRequestException('Request body must be a valid JSON object');
    }

    // 1. Validate prompt
    if (
      typeof request.prompt !== 'string' ||
      request.prompt.trim().length === 0
    ) {
      throw new BadRequestException(
        'The "prompt" field is required and must be a non-empty string',
      );
    }

    const trimmedPrompt = request.prompt.trim();
    if (trimmedPrompt.length < 3) {
      throw new BadRequestException(
        'The "prompt" must be at least 3 characters long',
      );
    }

    if (trimmedPrompt.length > 3000) {
      throw new BadRequestException(
        'The "prompt" exceeds the maximum length of 3000 characters',
      );
    }

    // 2. Validate subject (if provided)
    if (request.subject !== undefined && request.subject !== null) {
      if (
        typeof request.subject !== 'object' ||
        Array.isArray(request.subject)
      ) {
        throw new BadRequestException('"subject" must be an object');
      }

      if (request.subject.age !== undefined && request.subject.age !== null) {
        if (
          typeof request.subject.age !== 'number' ||
          !Number.isInteger(request.subject.age) ||
          request.subject.age < 0 ||
          request.subject.age > 150
        ) {
          throw new BadRequestException(
            '"subject.age" must be an integer between 0 and 150',
          );
        }
      }

      const stringFields = ['name', 'gender', 'appearance', 'clothing'];
      for (const field of stringFields) {
        if (
          request.subject[field] !== undefined &&
          request.subject[field] !== null &&
          typeof request.subject[field] !== 'string'
        ) {
          throw new BadRequestException(`"subject.${field}" must be a string`);
        }
      }
    }

    // 3. Validate scene (if provided)
    if (request.scene !== undefined && request.scene !== null) {
      if (typeof request.scene !== 'object' || Array.isArray(request.scene)) {
        throw new BadRequestException('"scene" must be an object');
      }

      const stringFields = ['location', 'environment', 'timeOfDay', 'lighting'];
      for (const field of stringFields) {
        if (
          request.scene[field] !== undefined &&
          request.scene[field] !== null &&
          typeof request.scene[field] !== 'string'
        ) {
          throw new BadRequestException(`"scene.${field}" must be a string`);
        }
      }
    }

    // 4. Validate options (if provided)
    if (request.options !== undefined && request.options !== null) {
      if (
        typeof request.options !== 'object' ||
        Array.isArray(request.options)
      ) {
        throw new BadRequestException('"options" must be an object');
      }

      if (
        request.options.duration !== undefined &&
        request.options.duration !== null
      ) {
        if (
          typeof request.options.duration !== 'number' ||
          request.options.duration <= 0 ||
          request.options.duration > 120
        ) {
          throw new BadRequestException(
            '"options.duration" must be a positive number up to 120 seconds',
          );
        }
      }

      if (
        request.options.aspectRatio !== undefined &&
        request.options.aspectRatio !== null
      ) {
        if (typeof request.options.aspectRatio !== 'string') {
          throw new BadRequestException(
            '"options.aspectRatio" must be a string (e.g., "16:9", "9:16")',
          );
        }
        const ar = request.options.aspectRatio.trim();
        const ratioPattern = /^\d+:\d+$/;
        if (!this.VALID_ASPECT_RATIOS.has(ar) && !ratioPattern.test(ar)) {
          throw new BadRequestException(
            `"options.aspectRatio" "${ar}" is invalid. Expected format e.g. "16:9", "9:16", "1:1"`,
          );
        }
      }

      if (
        request.options.resolution !== undefined &&
        request.options.resolution !== null
      ) {
        if (typeof request.options.resolution !== 'string') {
          throw new BadRequestException(
            '"options.resolution" must be a string (e.g., "720p", "1080p", "4k")',
          );
        }
        const res = request.options.resolution.trim().toLowerCase();
        if (!this.VALID_RESOLUTIONS.has(res)) {
          throw new BadRequestException(
            `"options.resolution" "${res}" is invalid. Allowed values: ${Array.from(this.VALID_RESOLUTIONS).join(', ')}`,
          );
        }
      }

      if (
        request.options.style !== undefined &&
        request.options.style !== null &&
        typeof request.options.style !== 'string'
      ) {
        throw new BadRequestException('"options.style" must be a string');
      }

      if (
        request.options.cameraMovement !== undefined &&
        request.options.cameraMovement !== null &&
        typeof request.options.cameraMovement !== 'string'
      ) {
        throw new BadRequestException(
          '"options.cameraMovement" must be a string',
        );
      }

      if (
        request.options.loop !== undefined &&
        request.options.loop !== null &&
        typeof request.options.loop !== 'boolean'
      ) {
        throw new BadRequestException('"options.loop" must be a boolean');
      }
    }

    return request as GenerateVideoRequest;
  }
}
