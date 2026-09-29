import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';

describe('GuestController.login', () => {
  const guest = {
    id: 5,
    name: 'Prasun',
    email: 'prasun@example.com',
  };
  let findByEmail: jest.Mock;
  let controller: GuestController;

  beforeEach(() => {
    findByEmail = jest.fn();
    controller = new GuestController({
      findByEmail,
    } as unknown as GuestService);
  });

  it('returns the guest id for a known email', async () => {
    findByEmail.mockResolvedValue(guest);
    await expect(
      controller.login({ email: '  Prasun@Example.com ' }),
    ).resolves.toEqual({
      guestId: 5,
      name: 'Prasun',
      email: 'prasun@example.com',
    });
    expect(findByEmail).toHaveBeenCalledWith('prasun@example.com');
  });

  it('rejects a missing email', async () => {
    await expect(controller.login({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findByEmail).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown email', async () => {
    findByEmail.mockResolvedValue(null);
    await expect(
      controller.login({ email: 'nobody@example.com' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
