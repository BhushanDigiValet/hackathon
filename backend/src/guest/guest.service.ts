import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guest } from '../entities';

@Injectable()
export class GuestService {
  constructor(
    @InjectRepository(Guest)
    private readonly guestRepo: Repository<Guest>,
  ) {}

  async findAll() {
    return this.guestRepo.find();
  }

  async findOne(id: number) {
    return this.guestRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Guest>) {
    const guest = this.guestRepo.create(data);
    return this.guestRepo.save(guest);
  }
}
