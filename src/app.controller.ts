import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { AuthenticationGuard } from './guards/authentication.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Resource } from './rules/enums/resource.enum';
import { Action } from './rules/enums/action.enum';
import { AuthorizationGuard } from './guards/authorization.guard';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('/products')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Permissions([
    { resource: Resource.PRODUCTS, actions: [Action.READ, Action.CREATE] },
    { resource: Resource.SETTINGS, actions: [Action.READ] },
  ])
  @Get()
  someProtectedRoute(@Req() req: Request) {
    return { message: 'Hello there', userId: req.userId as string };
  }
}
