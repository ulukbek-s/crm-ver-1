import { Body, Controller, Get, Patch, Post, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.firstName, dto.lastName);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Get('me/stats')
  @UseGuards(AuthGuard('jwt'))
  async getProfileStats(@CurrentUser() user: JwtUser) {
    return this.authService.getProfileStats(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, { ...dto, userStatus: dto.userStatus });
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file');
    return this.authService.uploadAvatar(user.id, file);
  }

  @Get('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  async getAvatar(@CurrentUser() user: JwtUser, @Res() res: Response) {
    const profile = await this.authService.getProfile(user.id) as any;
    if (!profile?.avatarUrl) return res.status(404).end();
    const filePath = this.authService.getAvatarPath(profile.avatarUrl);
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) return res.status(404).end();
    res.setHeader('Content-Type', 'image/jpeg');
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
  }
}
