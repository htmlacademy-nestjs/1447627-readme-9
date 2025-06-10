import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { MongoIdValidationPipe } from '@project/pipes';
import { fillDto } from '@project/helpers';
import { NotifyService } from '@project/account-notify';

import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoggedUserRdo } from '../rdo/logged-user.rdo';
import { UserRdo } from '../rdo/user.rdo';
import { UserDetailsRdo } from '../rdo/user-details.rdo';
import { UserSubscriptionsRdo } from '../rdo/user-subscriptions.rdo';
import { TokenPairRdo } from '../rdo/token-pair.rdo';

import { AuthenticationResponseMessage } from './authentication.constant';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { RequestWithUser } from './request-with-user.interface';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { RequestWithTokenPayload } from './request-with-token-payload.interface';


@ApiTags('authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly notifyService: NotifyService
  ) { }

  @ApiResponse({
    type: UserRdo,
    status: HttpStatus.CREATED,
    description: AuthenticationResponseMessage.UserCreated,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: AuthenticationResponseMessage.UserExist,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: AuthenticationResponseMessage.ServerError,
  })
  @Post('register')
  public async create(@Body() dto: CreateUserDto) {
    const newUser = await this.authService.register(dto);
    const { email, name } = newUser;
    await this.notifyService.registerSubscriber({ email, name });

    return fillDto(UserRdo, newUser.toPOJO());
  }

  @ApiResponse({
    type: UserRdo,
    status: HttpStatus.CREATED,
    description: AuthenticationResponseMessage.PasswordChanged,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.PasswordChangeError,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: AuthenticationResponseMessage.ServerError,
  })
  @UseGuards(JwtAuthGuard)
  @Post('password')
  public async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() { user: payload }: RequestWithTokenPayload
  ) {
    const updatedUser = await this.authService.changePassword(payload.sub, dto);

    return fillDto(UserRdo, updatedUser.toPOJO());
  }

  @ApiResponse({
    type: LoggedUserRdo,
    status: HttpStatus.OK,
    description: AuthenticationResponseMessage.LoggedSuccess,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.LoggedError,
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  public async login(@Req() { user }: RequestWithUser) {
    const userToken = await this.authService.createUserToken(user);
    return fillDto(LoggedUserRdo, { ...user.toPOJO(), ...userToken });
  }

  @ApiResponse({
    type: UserDetailsRdo,
    status: HttpStatus.OK,
    description: AuthenticationResponseMessage.UserFound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: AuthenticationResponseMessage.UserNotFound,
  })
  @Get(':id')
  public async show(@Param('id', MongoIdValidationPipe) id: string) {
    const existUser = await this.authService.getUser(id);
    return fillDto(UserDetailsRdo, existUser.toPOJO());
  }

  @ApiResponse({
    type: UserDetailsRdo,
    status: HttpStatus.OK,
    description: AuthenticationResponseMessage.UserFound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: AuthenticationResponseMessage.UserNotFound,
  })
  @Get(':id/subscriptions')
  public async getSubscriptions(@Param('id', MongoIdValidationPipe) id: string) {
    const existUser = await this.authService.getUser(id);
    return fillDto(UserSubscriptionsRdo, existUser.toPOJO());
  }

  @ApiResponse({
    type: TokenPairRdo,
    status: HttpStatus.OK,
    description: AuthenticationResponseMessage.RefreshSuccess,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.RefreshError,
  })
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  public async refreshToken(@Req() { user }: RequestWithUser) {
    return this.authService.createUserToken(user);
  }

  @ApiResponse({
    type: TokenPairRdo,
    status: HttpStatus.OK,
    description: AuthenticationResponseMessage.UserFound,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.JwtAuthError,
  })
  @UseGuards(JwtAuthGuard)
  @Post('check')
  public async checkToken(@Req() { user: payload }: RequestWithTokenPayload) {
    return payload;
  }

  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: AuthenticationResponseMessage.SubsciptionSucess,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: AuthenticationResponseMessage.UserNotFound,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.JwtAuthError,
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('toggle-subscribe/:id')
  public async toggleSubscribe(
    @Param('id', MongoIdValidationPipe) id: string,
    @Req() { user }: RequestWithTokenPayload
  ) {
    await this.authService.toggleSubscription(user.sub, id);
  }

  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: AuthenticationResponseMessage.PostsCountSuccess,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: AuthenticationResponseMessage.UserNotFound,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.JwtAuthError,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('incrementPostsCount/:id')
  public async incrementPostsCount(
    @Param('id', MongoIdValidationPipe) id: string
  ) {
    await this.authService.incrementPostsCount(id);
  }

  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: AuthenticationResponseMessage.PostsCountSuccess,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: AuthenticationResponseMessage.UserNotFound,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: AuthenticationResponseMessage.JwtAuthError,
  })
  @Post('decrementPostsCount/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async decrementPostsCount(
    @Param('id', MongoIdValidationPipe) id: string
  ) {
    await this.authService.decrementPostsCount(id);
  }
}
