import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';
import { CreateRoleDto } from './dtos/create-role.dto';

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async createRole(role: CreateRoleDto) {
    const isRoleExist = await this.roleModel.findOne({ name: role.name });
    if (isRoleExist) {
      throw new BadRequestException('Role already exists');
    }

    return this.roleModel.create(role);
  }

  async getRoleById(id: string) {
    const isRoleExist = await this.roleModel.findById(id);
    if (!isRoleExist) {
      throw new BadRequestException('Role not found');
    }

    return isRoleExist;
  }

  async updateRole(id: string, role: CreateRoleDto) {
    const isRoleExist = await this.roleModel.findById(id);
    if (!isRoleExist) {
      throw new BadRequestException('Role not found');
    }

    return this.roleModel.findByIdAndUpdate(id, role, { new: true });
  }

  async deleteRole(id: string) {
    const isRoleExist = await this.roleModel.findById(id);
    if (!isRoleExist) {
      throw new BadRequestException('Role not found');
    }

    return this.roleModel.findByIdAndDelete(id);
  }
}
