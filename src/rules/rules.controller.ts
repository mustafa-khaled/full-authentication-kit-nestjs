import { Body, Controller, Post } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRoleDto } from './dtos/create-role.dto';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  async createRole(@Body() role: CreateRoleDto) {
    return this.rulesService.createRole(role);
  }
}
