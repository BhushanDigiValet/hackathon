import { TestBed } from '@angular/core/testing';

import { SoundService } from './sound.service';

describe('SoundService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stays silent where Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => TestBed.inject(SoundService).playJoin()).not.toThrow();
  });

  it('plays a three-note chime (a fundamental and a partial per note)', () => {
    const started: number[] = [];
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    const node = () => ({ connect: vi.fn((next: unknown) => next) });
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createGain = () => ({ ...node(), gain: param() });
      createBiquadFilter = () => ({ ...node(), type: '', frequency: param() });
      createOscillator = () => ({
        ...node(),
        type: '',
        frequency: param(),
        start: (at: number) => started.push(at),
        stop: vi.fn(),
      });
      resume = vi.fn();
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);

    TestBed.inject(SoundService).playJoin();
    expect(started).toHaveLength(6);
    // Notes rise in sequence rather than all at once.
    expect(started[0]).toBeLessThan(started[2]);
    expect(started[2]).toBeLessThan(started[4]);
  });
});
