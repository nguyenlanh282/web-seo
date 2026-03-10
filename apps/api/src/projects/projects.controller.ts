import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PlanGuard } from '../common/guards/plan.guard'
import { PlanCheck } from '../common/decorators/plan-check.decorator'

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @PlanCheck('project')
  @UseGuards(JwtAuthGuard, PlanGuard)
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(id, req.user.id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user.id)
  }
}
