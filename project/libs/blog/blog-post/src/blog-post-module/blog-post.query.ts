import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

import { PostType, PostStatus } from '@prisma/client';
import { SortType, SortDirection } from '@project/core';

import {
  DEFAULT_POST_COUNT_LIMIT,
  DEFAULT_SORT_TYPE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_PAGE_COUNT
} from './blog-post.constant';

export class BlogPostQuery {
  @ApiProperty({
    description: 'Max items per page',
    required: false,
    default: DEFAULT_POST_COUNT_LIMIT,
  })
  @Transform(({ value }) => +value || DEFAULT_POST_COUNT_LIMIT)
  @IsNumber()
  @IsOptional()
  public limit = DEFAULT_POST_COUNT_LIMIT;

  @ApiProperty({
    description: 'Sorting direction',
    required: false,
    default: DEFAULT_SORT_DIRECTION,
    enum: SortDirection,
  })
  @IsIn(Object.values(SortDirection))
  @IsOptional()
  public sortDirection: SortDirection = DEFAULT_SORT_DIRECTION;

  @ApiProperty({
    description: 'Sorting type',
    required: false,
    default: DEFAULT_SORT_TYPE,
    enum: SortType,
  })
  @IsIn(Object.values(SortType))
  @IsOptional()
  public sortBy: SortType = DEFAULT_SORT_TYPE;

  @ApiProperty({
    description: 'Current page number',
    required: false,
    default: DEFAULT_PAGE_COUNT,
  })
  @Transform(({ value }) => +value || DEFAULT_PAGE_COUNT)
  @IsOptional()
  public page: number = DEFAULT_PAGE_COUNT;

  @ApiProperty({
    description: 'Post type',
    required: false,
    enum: PostType,
  })
  @IsOptional()
  public type?: PostType;

  @ApiProperty({
    description: 'Post tags',
    required: false,
  })
  @IsString({ each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  public tags?: string[];

  @ApiProperty({
    description: 'Post title',
    required: false,
  })
  @IsString()
  @IsOptional()
  public search?: string;

  @ApiProperty({
    description: 'Post status',
    required: false,
    enum: PostStatus,
  })
  @IsOptional()
  public status?: PostStatus;

  @ApiProperty({
    description: 'User IDs',
    required: false,
  })
  @IsMongoId({ each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  public userIds?: string[];
}
