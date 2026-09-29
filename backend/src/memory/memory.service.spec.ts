import { MemoryService } from './memory.service';

describe('MemoryService reel video', () => {
  const narration = {
    title: 'Your Vegas, slowed down',
    chapters: [
      {
        time: '10:30',
        title: 'A slower morning',
        text: 'The day slowed down.',
        category: 'spa',
      },
    ],
    closingLine: 'Until next time.',
  };

  function build(videoService: any) {
    const saved: any[] = [];
    const memoryRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => {
        saved.push(JSON.parse(JSON.stringify(x)));
        return x;
      }),
    };
    const planRepo = {
      find: jest.fn().mockResolvedValue([
        {
          catalogueItemId: 1,
          details: { state: 'confirmed', startAt: '10:30' },
        },
      ]),
    };
    const catalogueRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 1, name: 'Stone Ritual', details: { categoryGroup: 'spa' } },
        ]),
    };
    const profileRepo = {
      findOne: jest.fn().mockResolvedValue({ mood: 'relaxed' }),
    };
    const aiService = { narrateMemory: jest.fn().mockResolvedValue(narration) };
    const service = new MemoryService(
      memoryRepo as any,
      planRepo as any,
      catalogueRepo as any,
      profileRepo as any,
      aiService as any,
      videoService,
    );
    return { service, saved, memoryRepo };
  }

  it('starts a reel video from the narrated chapters and stores it', async () => {
    const videoService = {
      generateVideo: jest.fn().mockResolvedValue({
        jobId: 'local_reel_abc',
        status: 'processing',
        provider: 'local',
      }),
    };
    const { service, saved } = build(videoService);

    const result = await service.narrate(7);

    const req = videoService.generateVideo.mock.calls[0][0];
    expect(req.reel).toEqual({
      title: narration.title,
      chapters: narration.chapters,
      closingLine: narration.closingLine,
    });
    expect(result.video).toMatchObject({
      jobId: 'local_reel_abc',
      status: 'processing',
    });
    expect(saved[0].mediaUrls.video.jobId).toBe('local_reel_abc');
    expect(saved[0].mediaUrls.chapters).toEqual(narration.chapters);
  });

  it('still returns the narration when video generation fails', async () => {
    const videoService = {
      generateVideo: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const { service } = build(videoService);

    const result = await service.narrate(7);
    expect(result.title).toBe(narration.title);
    expect(result.video).toBeNull();
  });

  it('refreshes a still-rendering video when the memory is read', async () => {
    const videoService = {
      getVideoStatus: jest.fn().mockResolvedValue({
        jobId: 'local_reel_abc',
        status: 'completed',
        provider: 'local',
        videoUrl: 'http://localhost:3000/reels/local_reel_abc.mp4',
      }),
    };
    const { service, memoryRepo } = build(videoService);
    memoryRepo.findOne.mockResolvedValue({
      guestId: 7,
      narration: JSON.stringify(narration),
      mediaUrls: {
        chapters: narration.chapters,
        video: { jobId: 'local_reel_abc', status: 'processing' },
      },
    });

    const memory = await service.getMemory(7);
    expect(videoService.getVideoStatus).toHaveBeenCalledWith('local_reel_abc');
    expect(memory.mediaUrls.video.videoUrl).toBe(
      'http://localhost:3000/reels/local_reel_abc.mp4',
    );
    expect(memory.narration.title).toBe(narration.title);
  });
});
