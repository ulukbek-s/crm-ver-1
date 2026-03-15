import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { VisaModule } from './visa/visa.module';
import { EducationModule } from './education/education.module';
import { FinanceModule } from './finance/finance.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { WorkersModule } from './workers/workers.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';
import { CommunicationsController } from './communications/communications.controller';

// Load .env from monorepo root (when cwd is apps/api-gateway, ../../.env is root)
const rootEnv = path.resolve(process.cwd(), '../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [rootEnv, path.resolve(process.cwd(), '.env')].filter((p) => p),
    }),
    PrismaModule,
    WorkersModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    SearchModule,
    CrmModule,
    RecruitmentModule,
    VisaModule,
    EducationModule,
    FinanceModule,
    AnalyticsModule,
    TasksModule,
    AdminModule,
  ],
  controllers: [CommunicationsController],
})
export class AppModule {}
