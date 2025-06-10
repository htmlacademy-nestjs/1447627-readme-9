import { ApiResponse } from '@nestjs/swagger';
import { Controller, Req, Get, HttpStatus, Query, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';

import { AxiosExceptionFilter } from './filters/axios-exception.filter';
import { CheckAuthGuard } from './guards/check-auth.guard';
import { ApplicationServiceURL } from './app.config';
import { InjectUserIdInterceptor } from '@project/interceptors';
import { Post as PostInterface } from '@project/core';
import { BlogPostQuery, BlogPostResponseMessages, BlogPostWithPaginationRdo } from '@project/blog-post';
import { transformPost } from './helpers/transform-post';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@Controller('feed')
@UseFilters(AxiosExceptionFilter)
export class FeedController {
  constructor(private readonly httpService: HttpService) { }

  @ApiResponse({
    type: BlogPostWithPaginationRdo,
    status: HttpStatus.OK,
    description: BlogPostResponseMessages.PostFound,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: BlogPostResponseMessages.ServerError,
  })
  @UseGuards(CheckAuthGuard)
  @UseInterceptors(InjectUserIdInterceptor)
  @Get('/')
  public async index(@Query() query: BlogPostQuery, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const { data: { subscriptions } } = await this.httpService.axiosRef.get(`${ApplicationServiceURL.Users}/${userId}/subscriptions`);

    const { data } = await this.httpService.axiosRef.get<{ entities: PostInterface[] }>(
      `${ApplicationServiceURL.Posts}`, {
      params: {
        ...query,
        userIds: [userId, ...subscriptions]
      }
    }
    );

    for (const post of data.entities) {
      await transformPost(this.httpService, post);
    }

    return data;
  }
}
