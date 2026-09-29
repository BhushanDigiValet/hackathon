import { PromptBuilderService } from './prompt-builder.service';
import { GenerateVideoRequest } from '../interfaces/video-generation.interface';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build a comprehensive prompt with subject, scene, user request, and options', () => {
    const request: GenerateVideoRequest = {
      prompt:
        'A confident guest walking into a luxury penthouse suite at sunset',
      subject: {
        name: 'Elena Rostova',
        age: 32,
        gender: 'Female',
        appearance: 'Tall with dark auburn hair tied back, elegant posture',
        clothing: 'Designer silk black evening dress with subtle gold accents',
      },
      scene: {
        location: 'Wynn Las Vegas Tower Suite',
        environment: 'Modern high-end luxury interior overlooking the Strip',
        timeOfDay: 'Golden hour sunset',
        lighting:
          'Warm ambient glow with soft golden rim lighting through floor-to-ceiling glass',
      },
      options: {
        duration: 5,
        aspectRatio: '16:9',
        style: 'Cinematic 35mm film aesthetic with shallow depth of field',
        cameraMovement: 'Slow tracking shot moving forward smoothly',
      },
    };

    const result = service.buildPrompt(request);

    // Verify key sections are present
    expect(result).toContain(
      'Create a realistic video based on the following description.',
    );
    expect(result).toContain('Subject:');
    expect(result).toContain('- Name: Elena Rostova');
    expect(result).toContain('- Age: 32');
    expect(result).toContain('- Gender: Female');
    expect(result).toContain('- Appearance: Tall with dark auburn hair');
    expect(result).toContain('- Clothing: Designer silk black evening dress');

    expect(result).toContain('Scene:');
    expect(result).toContain('- Location: Wynn Las Vegas Tower Suite');
    expect(result).toContain('- Environment: Modern high-end luxury interior');
    expect(result).toContain('- Time of Day: Golden hour sunset');
    expect(result).toContain('- Lighting: Warm ambient glow');

    expect(result).toContain(
      'User request:\nA confident guest walking into a luxury penthouse suite at sunset',
    );

    expect(result).toContain('Cinematography & Style:');
    expect(result).toContain('- Visual Style: Cinematic 35mm film aesthetic');
    expect(result).toContain(
      '- Camera Movement: Slow tracking shot moving forward smoothly',
    );

    expect(result).toContain(
      "Maintain consistency in the subject's appearance, clothing, environment, and actions throughout the video.",
    );
    expect(result).toContain(
      'Use realistic human movement, natural facial expressions, believable interactions, and physically realistic motion.',
    );
    expect(result).toContain('Avoid:');
    expect(result).toContain('- distorted limbs or extra fingers');
  });

  it('should format minimal request correctly without empty subject or scene blocks', () => {
    const request: GenerateVideoRequest = {
      prompt: 'Waves crashing against rugged ocean cliffs in slow motion',
    };

    const result = service.buildPrompt(request);

    expect(result).toContain(
      'Create a realistic video based on the following description.',
    );
    expect(result).not.toContain('Subject:');
    expect(result).not.toContain('Scene:');
    expect(result).toContain(
      'User request:\nWaves crashing against rugged ocean cliffs in slow motion',
    );
    expect(result).toContain('Avoid:');
  });

  it('should append custom negative prompt items to the Avoid block', () => {
    const request: GenerateVideoRequest = {
      prompt: 'A sleek sports car cruising down an empty desert highway',
      options: {
        negativePrompt: 'rain, clouds, pedestrians, street vendors',
      },
    };

    const result = service.buildPrompt(request);

    expect(result).toContain('- rain, clouds, pedestrians, street vendors');
  });
});
