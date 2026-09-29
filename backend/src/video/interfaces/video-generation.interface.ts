/**
 * Subject details describing the central character, person, or object in the video.
 */
export interface SubjectDetails {
  name?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  clothing?: string;
}

/**
 * Scene details describing the setting, lighting, and environment.
 */
export interface SceneDetails {
  location?: string;
  environment?: string;
  timeOfDay?: string;
  lighting?: string;
}

/**
 * Video generation options that remain provider-independent.
 * Providers map these generic options into their provider-specific API payloads.
 */
export interface VideoGenerationOptions {
  /** Duration in seconds (e.g., 5, 10) */
  duration?: number;
  /** Aspect ratio string (e.g., '16:9', '9:16', '1:1', '4:3', '21:9') */
  aspectRatio?: string;
  /** Resolution identifier (e.g., '720p', '1080p', '4k') */
  resolution?: string;
  /** Artistic or visual style (e.g., 'cinematic photorealism', 'documentary', 'warm 35mm film') */
  style?: string;
  /** Camera movement instruction (e.g., 'slow push-in', 'orbit 360', 'static shot', 'tracking shot') */
  cameraMovement?: string;
  /** Optional negative prompt / items to avoid */
  negativePrompt?: string;
  /** Whether to loop the video seamlessly if supported */
  loop?: boolean;
}

/**
 * One scene of a structured itinerary reel (e.g. a narrated memory chapter).
 */
export interface ReelChapter {
  /** Display time, e.g. '10:30' */
  time?: string;
  /** Short chapter title */
  title?: string;
  /** One or two sentences of narration */
  text: string;
  /** Catalogue category group (spa, dining, bar, nightlife, experience, ...) */
  category?: string;
}

/**
 * Structured storyboard for providers that render from itinerary data
 * rather than a free-text prompt (used by the keyless 'local' provider).
 */
export interface ReelSpec {
  title: string;
  subtitle?: string;
  chapters: ReelChapter[];
  closingLine?: string;
}

/**
 * Main request contract accepted by the Video Generation Service.
 */
export interface GenerateVideoRequest {
  /** Core user prompt describing the action or event */
  prompt: string;
  /** Optional subject description */
  subject?: SubjectDetails;
  /** Optional scene and atmosphere description */
  scene?: SceneDetails;
  /** Provider-independent video options */
  options?: VideoGenerationOptions;
  /** Optional structured storyboard; prompt-only providers ignore it */
  reel?: ReelSpec;
}

/**
 * Status lifecycle of a video generation task.
 */
export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Standardized result returned to applications and frontend clients.
 * Keeps provider-specific details abstracted.
 */
export interface VideoGenerationResult {
  /** Unique job identifier */
  jobId: string;
  /** Current status of the job */
  status: VideoJobStatus;
  /** Public URL to the generated MP4/WebM video when completed */
  videoUrl?: string;
  /** Public URL to a generated poster/thumbnail image if available */
  thumbnailUrl?: string;
  /** The final expanded prompt used for generation */
  prompt: string;
  /** The provider that generated the video (e.g., 'luma', 'runway', 'pika', 'mock') */
  provider: string;
  /** Progress percentage (0 - 100) */
  progress?: number;
  /** Error message if the generation failed */
  error?: string;
  /** ISO timestamp when the job was created */
  createdAt: string;
  /** ISO timestamp when the job was last updated */
  updatedAt: string;
  /** ISO timestamp when the job completed */
  completedAt?: string;
  /** Options used for the generation */
  options?: VideoGenerationOptions;
  /** Additional provider metadata (safe for frontend, no secrets) */
  metadata?: Record<string, any>;
}

/**
 * Provider-agnostic interface that all external AI video providers must implement.
 */
export interface IVideoProvider {
  /** Identifier of the provider (e.g. 'runway', 'luma', 'pika', 'mock') */
  readonly name: string;

  /**
   * Dispatches a video generation task to the external API.
   * @param builtPrompt The formatted prompt produced by PromptBuilder.
   * @param options Provider-independent video generation options.
   * @param request The full validated request, for providers that need structured data.
   * @returns Initial job status and job identifier from the provider.
   */
  generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
    request?: GenerateVideoRequest,
  ): Promise<{
    jobId: string;
    status: VideoJobStatus;
    metadata?: Record<string, any>;
  }>;

  /**
   * Checks the status of an ongoing video generation task.
   * @param jobId The external or internal job ID.
   * @returns Current progress and outcome.
   */
  checkStatus(jobId: string): Promise<VideoGenerationResult>;

  /**
   * Optional method to cancel an ongoing generation task.
   * @param jobId The job ID to cancel.
   */
  cancelGeneration?(jobId: string): Promise<void>;
}
