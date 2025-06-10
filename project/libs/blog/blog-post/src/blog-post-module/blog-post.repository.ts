import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PostType, PostStatus } from '@prisma/client';

import { BasePostgresRepository } from '@project/data-access';
import { BlogPostEntity } from './blog-post.entity';
import { PaginationResult, Post, PostContent, SortDirection, SortType } from '@project/core';
import { BlogPostFactory } from './blog-post.factory';
import { PrismaClientService } from '@project/blog-models';
import { BlogPostQuery } from './blog-post.query';

const defaultInclude = {
  tags: true,
  _count: {
    select: { favorite: true, comments: true },
  },
};

@Injectable()
export class BlogPostRepository extends BasePostgresRepository<BlogPostEntity, Post> {
  constructor(
    entityFactory: BlogPostFactory,
    readonly client: PrismaClientService
  ) {
    super(entityFactory, client);
  }

  private async getPostCount(where: Prisma.PostWhereInput): Promise<number> {
    return this.client.post.count({ where });
  }

  private calculatePostsPages(totalCount: number, limit: number): number {
    return Math.ceil(totalCount / limit);
  }

  public async save(entity: BlogPostEntity): Promise<void> {
    const pojoEntity = entity.toPOJO();
    const record = await this.client.post.create({
      data: {
        ...pojoEntity,
        id: undefined,
        tags: {
          connectOrCreate: pojoEntity?.tags
            ? pojoEntity.tags.map((name) => ({
              where: { name },
              create: { name },
            }))
            : [],
        },
      },
    });

    entity.id = record.id;
  }

  public async deleteById(id: string): Promise<void> {
    await this.client.post.delete({
      where: {
        id,
      },
    });
  }

  public async findById(id: string): Promise<BlogPostEntity> {
    const document = await this.client.post.findFirst({
      where: {
        id,
      },
      include: defaultInclude,
    });

    if (!document) {
      throw new NotFoundException(`Post with id ${id} not found.`);
    }

    return this.createEntityFromDocument(this.transformRawDocument(document));
  }

  public async update(entity: BlogPostEntity): Promise<void> {
    const pojoEntity = entity.toPOJO();
    await this.client.post.update({
      where: { id: entity.id },
      data: {
        type: pojoEntity.type,
        content: pojoEntity.content,
        tags: {
          connectOrCreate: pojoEntity.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
          set: pojoEntity.tags.map((tag) => ({ name: tag })),
        },
        status: entity.status,
      },
      include: defaultInclude,
    });
  }

  public async find(query?: BlogPostQuery, currentUserId?: string): Promise<PaginationResult<BlogPostEntity>> {
    const skip = query?.page && query?.limit ? (query.page - 1) * query.limit : undefined;
    const take = query?.limit;
    const where: Prisma.PostWhereInput = {};
    const orderBy: Prisma.PostOrderByWithRelationInput = {};

    if (query?.tags) {
      where.tags = {
        some: {
          name: {
            in: query.tags,
          },
        },
      };
    }

    if (query?.search) {
      where.content = {
        path: ['title'],
        string_contains: query.search,
      };
    }

    if (query?.userIds) {
      where.userId = {
        in: query?.userIds,
      };
    }

    if (query?.status) {
      where.userId = currentUserId;
      where.status = PostStatus.DRAFT;
    } else {
      where.status = PostStatus.PUBLISHED;
    }

    if (query?.type) {
      where.type = query.type;
    }

    if (query?.sortBy) {
      switch (query?.sortBy) {
        case SortType.CreationDate:
          orderBy.createdAt = query.sortDirection;
          break;
        case SortType.CommentsCount:
          orderBy.comments = { _count: query.sortDirection };
          break;
        case SortType.LikesCount:
          orderBy.favorite = { _count: query.sortDirection };
          break;
      }
    }

    const [records, postCount] = await Promise.all([
      this.client.post.findMany({
        where,
        orderBy,
        skip,
        take,
        include: defaultInclude,
      }),
      this.getPostCount(where),
    ]);

    return {
      entities: records.map((record) =>
        this.createEntityFromDocument(this.transformRawDocument(record))
      ),
      currentPage: query?.page,
      totalPages: this.calculatePostsPages(postCount, take),
      itemsPerPage: take,
      totalItems: postCount,
    };
  }

  public async addLike(userId: string, postId: string) {
    const existsLike = await this.client.favorite.findFirst({
      where: { userId, postId },
    });

    if (existsLike) return;

    await this.client.favorite.create({
      data: { userId, postId },
    });
  }

  public async deleteLike(userId: string, postId: string) {
    const existsLike = await this.client.favorite.findFirst({
      where: { userId, postId },
    });

    if (!existsLike) return;

    await this.client.favorite.delete({
      where: {
        userId_postId: { userId, postId },
      },
    });
  }

  public async getPostsToNotify() {
    const lastNotify = await this.client.notification.findFirst({
      orderBy: {
        updatedAt: SortDirection.Desc,
      },
    });

    const where: Prisma.PostWhereInput = {};

    if (lastNotify) {
      where.createdAt = { gt: lastNotify.updatedAt };
    }

    const records = await this.client.post.findMany({
      where,
      orderBy: { createdAt: SortDirection.Desc },
      include: defaultInclude,
    });

    return records.map((record) =>
      this.createEntityFromDocument(this.transformRawDocument(record))
    );
  }

  public async makeNotifyRecord() {
    await this.client.notification.create({ data: {} });
  }

  private transformRawDocument(
    document: {
      tags: {
        name: string;
      }[];
      _count: {
        comments: number;
        favorite: number;
      };
    } & {
      id: string;
      type: PostType;
      content: Prisma.JsonValue;
      status: PostStatus;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      isRepost: boolean;
      originalPostId: string | null;
      originalAuthorId: string | null;
    }
  ) {
    return {
      ...document,
      tags: document.tags.map(({ name }) => name),
      content: document.content as PostContent,
      likesCount: document._count.favorite,
      commentsCount: document._count.comments,
    };
  }
}
