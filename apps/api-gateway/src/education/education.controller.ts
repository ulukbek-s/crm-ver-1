import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EducationService } from './education.service';
import { Roles } from '../common/guards/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('education')
@UseGuards(AuthGuard('jwt'))
export class EducationController {
  constructor(private educationService: EducationService) {}

  @Get('courses')
  getCourses() {
    return this.educationService.getCourses();
  }

  @Post('courses')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  createCourse(
    @Body()
    body: {
      name: string;
      language?: string;
      level?: string;
      durationWeeks?: number;
      price?: number;
      description?: string;
      requiredForProgram?: string;
    },
  ) {
    return this.educationService.createCourse(body);
  }

  @Patch('courses/:id')
  @Roles('Founder', 'Manager')
  updateCourse(@Param('id') id: string, @Body() body: any) {
    return this.educationService.updateCourse(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('students/:id')
  @Roles('Founder', 'Manager')
  updateStudent(@Param('id') id: string, @Body() body: any) {
    return this.educationService.updateStudent(id, body);
  }

  @Get('groups')
  getGroups(@Query('courseId') courseId?: string) {
    return this.educationService.getGroups(courseId);
  }

  @Patch('groups/:id')
  @Roles('Founder', 'Manager')
  updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      courseId?: string;
      teacherId?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) {
    return this.educationService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  @Roles('Founder', 'Manager')
  deleteGroup(@Param('id') id: string) {
    return this.educationService.deleteGroup(id);
  }

  @Post('groups')
  @Roles('Founder', 'Manager')
  createGroup(
    @Body()
    body: {
      name: string;
      courseId: string;
      teacherId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.educationService.createGroup(body);
  }

  @Get('students')
  getStudents() {
    return this.educationService.getStudents();
  }

  @Get('teachers')
  getTeachers() {
    return this.educationService.getTeachers();
  }

  @Get('course-payments')
  getCoursePayments() {
    return this.educationService.getCoursePayments();
  }

  @Post('teachers')
  @Roles('Founder', 'Manager')
  createTeacher(@Body() body: any) {
    return this.educationService.createTeacher(body);
  }

  @Patch('teachers/:id')
  @Roles('Founder', 'Manager')
  updateTeacher(@Param('id') id: string, @Body() body: any) {
    return this.educationService.updateTeacher(id, body);
  }

  @Delete('teachers/:id')
  @Roles('Founder', 'Manager')
  deleteTeacher(@Param('id') id: string) {
    return this.educationService.deleteTeacher(id);
  }

  @Get('stats')
  getStats() {
    return this.educationService.getStats();
  }

  @Get('my-groups')
  @Roles('Teacher', 'Founder', 'Manager')
  getMyGroups(@CurrentUser() user: JwtUser) {
    return this.educationService.getGroupsForTeacher(user.id);
  }

  @Get('groups/:id/lessons')
  @Roles('Teacher', 'Founder', 'Manager')
  getLessonsForGroup(@Param('id') id: string) {
    return this.educationService.getLessonsForGroup(id);
  }

  @Get('exams')
  getExams() {
    return this.educationService.getExams();
  }

  @Post('exams')
  @Roles('Founder', 'Manager', 'Teacher')
  createExam(@Body() body: any) {
    return this.educationService.createExam(body);
  }

  @Patch('exams/:id')
  @Roles('Founder', 'Manager', 'Teacher')
  updateExam(@Param('id') id: string, @Body() body: any) {
    return this.educationService.updateExam(id, body);
  }

  @Delete('exams/:id')
  @Roles('Founder', 'Manager', 'Teacher')
  deleteExam(@Param('id') id: string) {
    return this.educationService.deleteExam(id);
  }

  @Get('certificates')
  getCertificates() {
    return this.educationService.getCertificates();
  }

  @Post('certificates')
  @Roles('Founder', 'Manager', 'Teacher')
  createCertificate(@Body() body: any) {
    return this.educationService.createCertificate(body);
  }

  @Patch('certificates/:id')
  @Roles('Founder', 'Manager', 'Teacher')
  updateCertificate(@Param('id') id: string, @Body() body: any) {
    return this.educationService.updateCertificate(id, body);
  }

  @Delete('certificates/:id')
  @Roles('Founder', 'Manager', 'Teacher')
  deleteCertificate(@Param('id') id: string) {
    return this.educationService.deleteCertificate(id);
  }

  @Get('progress/by-candidate')
  getCandidateProgress(
    @Query('candidateId') candidateId: string,
  ) {
    return this.educationService.getCandidateProgress(candidateId);
  }

  @Patch('lessons/:id/attendance')
  @Roles('Teacher', 'Founder', 'Manager')
  setAttendance(
    @Param('id') lessonId: string,
    @Body() body: { groupId: string; items: { studentId: string; status: string }[] },
  ) {
    return this.educationService.setLessonAttendance(lessonId, body.groupId, body.items ?? []);
  }

  @Post('enroll')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  enrollCandidate(
    @Body() body: { candidateId: string; courseId: string; groupId: string },
  ) {
    return this.educationService.enrollCandidateToGroup(
      body.candidateId,
      body.courseId,
      body.groupId,
    );
  }
}
