import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ALL_ENTITIES } from './entities';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { ProfileModule } from './profile/profile.module';
import { PlanModule } from './plan/plan.module';
import { BookingsModule } from './bookings/bookings.module';
import { MemoryModule } from './memory/memory.module';
import { GuestModule } from './guest/guest.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root',
        database: process.env.DB_NAME || 'wynn_stay',
        synchronize: true,
        timezone: 'Z',
        charset: 'utf8mb4',
        entities: ALL_ENTITIES,
        retryAttempts: 10,
        retryDelay: 2000,
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
    DatabaseModule,
    EventsModule,
    AiModule,
    CatalogueModule,
    ProfileModule,
    PlanModule,
    BookingsModule,
    MemoryModule,
    GuestModule,
  ],
})
export class AppModule {}
