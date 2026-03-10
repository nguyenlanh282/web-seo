import { Module } from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { ProjectsController } from './projects.controller'
import { UsersModule } from '../users/users.module'
import { PlanGuard } from '../common/guards/plan.guard'

@Module({
  imports: [UsersModule],
  providers: [ProjectsService, PlanGuard],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
