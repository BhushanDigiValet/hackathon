import { BadRequestException } from '@nestjs/common';
import { VideoRequestValidator } from './video-request.validator';

describe('VideoRequestValidator', () => {
  it('should accept valid requests', () => {
    const valid = {
      prompt: 'A tranquil Japanese garden with koi swimming in a pond',
      subject: {
        name: 'Koi fish',
        appearance: 'Vibrant orange and white scales',
      },
      scene: {
        location: 'Kyoto garden',
        timeOfDay: 'Morning',
      },
      options: {
        duration: 5,
        aspectRatio: '16:9',
        resolution: '1080p',
        style: 'Cinematic',
      },
    };

    expect(() => VideoRequestValidator.validate(valid)).not.toThrow();
  });

  it('should reject non-object or null request body', () => {
    expect(() => VideoRequestValidator.validate(null)).toThrow(
      BadRequestException,
    );
    expect(() => VideoRequestValidator.validate('string request')).toThrow(
      BadRequestException,
    );
  });

  it('should reject missing or empty prompt', () => {
    expect(() => VideoRequestValidator.validate({ prompt: '' })).toThrow(
      BadRequestException,
    );
    expect(() => VideoRequestValidator.validate({ prompt: '  ' })).toThrow(
      BadRequestException,
    );
    expect(() => VideoRequestValidator.validate({})).toThrow(
      BadRequestException,
    );
  });

  it('should reject prompt that is too short', () => {
    expect(() => VideoRequestValidator.validate({ prompt: 'hi' })).toThrow(
      BadRequestException,
    );
  });

  it('should reject invalid subject age', () => {
    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        subject: { age: -5 },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        subject: { age: 300 },
      }),
    ).toThrow(BadRequestException);
  });

  it('should reject invalid options', () => {
    // Negative duration
    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        options: { duration: -2 },
      }),
    ).toThrow(BadRequestException);

    // Duration over 120s
    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        options: { duration: 150 },
      }),
    ).toThrow(BadRequestException);

    // Invalid resolution
    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        options: { resolution: 'invalid-res' },
      }),
    ).toThrow(BadRequestException);

    // Invalid aspect ratio
    expect(() =>
      VideoRequestValidator.validate({
        prompt: 'Valid prompt description',
        options: { aspectRatio: 'non-ratio' },
      }),
    ).toThrow(BadRequestException);
  });
});
