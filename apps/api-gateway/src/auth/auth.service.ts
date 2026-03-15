import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private uploadDir: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.uploadDir = this.config.get('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user?.passwordHash && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return { access_token: this.jwtService.sign({ sub: user.id, email: user.email }) };
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    const hash = await bcrypt.hash(password, 10);
    return this.usersService.create({ email, passwordHash: hash, firstName, lastName });
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const { passwordHash, ...rest } = user as any;
    const roleNames = (rest.userRoles ?? []).map((ur: { role: { name: string } }) => ur.role?.name).filter(Boolean);
    return { ...rest, isFounder: roleNames.includes('Founder') };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; userStatus?: string }) {
    await this.usersService.update(userId, data);
    return this.getProfile(userId);
  }

  getAvatarPath(avatarUrl: string): string {
    return path.join(this.uploadDir, 'avatars', path.basename(avatarUrl));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId) as any;
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid current password');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Password updated' };
  }

  async getProfileStats(userId: string) {
    const [myLeads, myCandidates, myTasks] = await Promise.all([
      this.prisma.lead.count({ where: { assignedManagerId: userId } }),
      this.prisma.candidate.count({ where: { managerId: userId } }),
      this.prisma.taskAssignment.count({ where: { userId } }),
    ]);
    return { myLeads, myCandidates, myTasks };
  }

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${userId}${ext}`;
    const dir = path.join(this.uploadDir, 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    const avatarUrl = filename;
    await this.usersService.update(userId, { avatarUrl });
    return this.getProfile(userId);
  }
}
