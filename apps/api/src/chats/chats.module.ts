import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service.js';
import { ChatsController } from './chats.controller.js';

@Module({
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
