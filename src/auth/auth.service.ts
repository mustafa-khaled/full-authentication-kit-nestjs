import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { RefreshToken } from './schemas/refresh-token.schema';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { nanoid } from 'nanoid';
import { ResetToken } from './schemas/reset-token.schema';
import { MailService } from 'src/services/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from 'src/rules/schemas/role.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
    @InjectModel(ResetToken.name)
    private resetTokenModel: Model<ResetToken>,
    @InjectModel(Role.name)
    private roleModel: Model<Role>,

    private jwtService: JwtService,
    private mailService: MailService,
  ) {}
  async register(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
    });
    return this.generateUserToken(user._id.toString());
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.generateUserToken(user._id.toString());
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const token = await this.refreshTokenModel.findOne({
      token: refreshToken,
      expiryDate: { $gt: new Date() },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateUserToken(token.userId.toString());
  }

  async changePassword(changePasswordDto: ChangePasswordDto, userId: string) {
    const { password, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId).select('+password');
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async forgetPassword(forgetPasswordDto: ForgetPasswordDto) {
    const { email } = forgetPasswordDto;

    const user = await this.userModel.findOne({ email });
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    if (user) {
      const resetToken = nanoid(64);
      await this.resetTokenModel.create({
        token: resetToken,
        userId: user._id,
        expiryDate,
      });
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    }

    return { message: 'Check your email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;

    const resetTokenDoc = await this.resetTokenModel.findOneAndDelete({
      token: resetToken,
      expiryDate: { $gt: new Date() },
    });
    if (!resetTokenDoc) {
      throw new BadRequestException('Invalid Link');
    }

    const user = await this.userModel.findById(resetTokenDoc.userId);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async getUserPermission(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const role = await this.roleModel.findById(user.roleId);
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    return role.permissions;
  }

  private async generateUserToken(userId: string) {
    const accessToken = this.jwtService.sign({ userId });
    const refreshToken = nanoid(64);

    await this.storeRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    return this.refreshTokenModel.updateOne(
      { userId },
      {
        $set: { expiryDate, token },
      },
      { upsert: true },
    );
  }
}
