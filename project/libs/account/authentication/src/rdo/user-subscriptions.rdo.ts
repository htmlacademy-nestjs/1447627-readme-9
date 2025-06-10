import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserSubscriptionsRdo {
  @ApiProperty({
    description: 'User subscriptions',
    example: '[68409f8c7e1b6e38c2eb5e91, 68409f9f7e1b6e38c2eb5e94]',
  })
  @Expose()
  subscriptions: string[];
}
