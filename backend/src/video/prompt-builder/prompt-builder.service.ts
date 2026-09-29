import { Injectable } from '@nestjs/common';
import {
  GenerateVideoRequest,
  SubjectDetails,
  SceneDetails,
  VideoGenerationOptions,
} from '../interfaces/video-generation.interface';

@Injectable()
export class PromptBuilderService {
  /**
   * Default negative traits to avoid in AI-generated video.
   */
  private readonly defaultAvoidances = [
    'distorted limbs or extra fingers',
    'unnatural morphing or warping',
    'jittery artifacts or flickers',
    'blurred faces or melted facial features',
    'sudden camera cuts or jerky jumps',
    'low resolution or pixelated textures',
    'unrealistic physics or floating elements',
  ];

  /**
   * Builds a structured, high-coherence prompt for the AI video provider.
   *
   * @param request The complete generation request containing prompt, subject, scene, and options.
   * @returns Formatted prompt string.
   */
  public buildPrompt(request: GenerateVideoRequest): string {
    const sections: string[] = [];

    // 1. Base opening directive
    sections.push(
      'Create a realistic video based on the following description.',
    );

    // 2. Subject section (if provided and non-empty)
    const subjectBlock = this.formatSubject(request.subject);
    if (subjectBlock) {
      sections.push(subjectBlock);
    }

    // 3. Scene section (if provided and non-empty)
    const sceneBlock = this.formatScene(request.scene);
    if (sceneBlock) {
      sections.push(sceneBlock);
    }

    // 4. User request (mandatory)
    sections.push(`User request:\n${request.prompt.trim()}`);

    // 5. Cinematography and Style (if specified in options)
    const styleBlock = this.formatStyleAndCamera(request.options);
    if (styleBlock) {
      sections.push(styleBlock);
    }

    // 6. Quality & Consistency constraints
    sections.push(
      "Maintain consistency in the subject's appearance, clothing, environment, and actions throughout the video.",
    );

    // 7. Motion & Interaction realism
    sections.push(
      'Use realistic human movement, natural facial expressions, believable interactions, and physically realistic motion.',
    );

    // 8. Avoidance / Negative constraints
    const avoidBlock = this.formatAvoidance(request.options?.negativePrompt);
    sections.push(avoidBlock);

    return sections.join('\n\n');
  }

  /**
   * Formats subject details into a clean block.
   */
  private formatSubject(subject?: SubjectDetails): string | null {
    if (!subject) return null;

    const lines: string[] = [];
    if (subject.name) lines.push(`- Name: ${subject.name.trim()}`);
    if (typeof subject.age === 'number') lines.push(`- Age: ${subject.age}`);
    if (subject.gender) lines.push(`- Gender: ${subject.gender.trim()}`);
    if (subject.appearance)
      lines.push(`- Appearance: ${subject.appearance.trim()}`);
    if (subject.clothing) lines.push(`- Clothing: ${subject.clothing.trim()}`);

    if (lines.length === 0) return null;
    return `Subject:\n${lines.join('\n')}`;
  }

  /**
   * Formats scene and environmental details into a clean block.
   */
  private formatScene(scene?: SceneDetails): string | null {
    if (!scene) return null;

    const lines: string[] = [];
    if (scene.location) lines.push(`- Location: ${scene.location.trim()}`);
    if (scene.environment)
      lines.push(`- Environment: ${scene.environment.trim()}`);
    if (scene.timeOfDay) lines.push(`- Time of Day: ${scene.timeOfDay.trim()}`);
    if (scene.lighting) lines.push(`- Lighting: ${scene.lighting.trim()}`);

    if (lines.length === 0) return null;
    return `Scene:\n${lines.join('\n')}`;
  }

  /**
   * Formats camera movement and visual style if defined in options.
   */
  private formatStyleAndCamera(
    options?: VideoGenerationOptions,
  ): string | null {
    if (!options) return null;

    const lines: string[] = [];
    if (options.style) lines.push(`- Visual Style: ${options.style.trim()}`);
    if (options.cameraMovement)
      lines.push(`- Camera Movement: ${options.cameraMovement.trim()}`);

    if (lines.length === 0) return null;
    return `Cinematography & Style:\n${lines.join('\n')}`;
  }

  /**
   * Formats the negative/avoidance prompt combining standard guidelines and custom constraints.
   */
  private formatAvoidance(customNegativePrompt?: string): string {
    const avoidances = [...this.defaultAvoidances];
    if (customNegativePrompt && customNegativePrompt.trim().length > 0) {
      avoidances.push(customNegativePrompt.trim());
    }

    return `Avoid:\n${avoidances.map((item) => `- ${item}`).join('\n')}`;
  }
}
