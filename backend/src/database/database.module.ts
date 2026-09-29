import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
