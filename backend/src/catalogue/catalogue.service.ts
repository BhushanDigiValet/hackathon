import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogueItem } from '../entities';

@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(CatalogueItem)
    private readonly catalogueRepo: Repository<CatalogueItem>,
  ) {}

  async findAll() {
    return this.catalogueRepo.find();
  }
}
