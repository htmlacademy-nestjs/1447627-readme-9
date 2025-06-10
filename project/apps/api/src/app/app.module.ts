import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { HttpClient } from './app.config';
import { UsersController } from './users.controller';
import { CheckAuthGuard } from './guards/check-auth.guard';
import { BlogController } from './blog.controller';
import { FeedController } from './feed.controller';
import { CommentController } from './comment.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: HttpClient.Timeout,
      maxRedirects: HttpClient.MaxRedirects,
    }),
  ],
  controllers: [
    UsersController,
    BlogController,
    FeedController,
    CommentController
  ],
  providers: [CheckAuthGuard],
})
export class AppModule { }
