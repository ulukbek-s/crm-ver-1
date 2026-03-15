import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  async getCourses() {
    return this.prisma.course.findMany({
      include: {
        _count: { select: { groups: true } },
        groups: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    candidate: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCourse(data: {
    name: string;
    language?: string;
    level?: string;
    durationWeeks?: number;
    price?: number;
    description?: string;
    requiredForProgram?: string;
  }) {
    return this.prisma.course.create({
      data: {
        name: data.name,
        language: data.language || null,
        level: data.level || null,
        duration: data.durationWeeks ?? null,
        price: data.price ?? null,
        description: data.description || null,
        requiredForProgram: data.requiredForProgram || null,
      },
    });
  }

  async updateCourse(
    id: string,
    data: {
      name?: string;
      language?: string | null;
      level?: string | null;
      durationWeeks?: number | null;
      price?: number | null;
      description?: string | null;
      requiredForProgram?: string | null;
    },
  ) {
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.durationWeeks !== undefined && { duration: data.durationWeeks }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.requiredForProgram !== undefined && {
          requiredForProgram: data.requiredForProgram,
        }),
      },
    });
  }

  async deleteCourse(id: string) {
    // simple delete; in реальном проекте можно добавить проверки зависимостей
    return this.prisma.course.delete({
      where: { id },
    });
  }

  async getGroups(courseId?: string) {
    return this.prisma.studentGroup.findMany({
      where: courseId ? { courseId } : undefined,
      include: { course: true, students: { include: { student: { include: { candidate: true } } } }, teacher: true },
    });
  }

  async updateGroup(
    id: string,
    data: {
      name?: string;
      courseId?: string;
      teacherId?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) {
    return this.prisma.studentGroup.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.teacherId !== undefined && { teacherId: data.teacherId || null }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
      },
    });
  }

  async deleteGroup(id: string) {
    return this.prisma.studentGroup.delete({
      where: { id },
    });
  }

  async createGroup(data: {
    name: string;
    courseId: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.studentGroup.create({
      data: {
        name: data.name,
        courseId: data.courseId,
        teacherId: data.teacherId || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async getStudents() {
    return this.prisma.student.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            candidateCode: true,
            country: { select: { name: true } },
            payments: {
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
              },
            },
          },
        },
        groups: {
          include: {
            group: {
              include: {
                course: true,
                teacher: true,
              },
            },
          },
        },
        certificates: true,
        progress: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async getTeachers() {
    return this.prisma.teacher.findMany({
      include: {
        groups: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCoursePayments() {
    return this.prisma.payment.findMany({
      where: {
        candidate: {
          student: {
            isNot: null,
          },
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            candidateCode: true,
          },
        },
        receiptDocument: { select: { id: true, fileName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTeacher(data: { name: string; email?: string; userId?: string }) {
    return this.prisma.teacher.create({
      data: {
        name: data.name,
        email: data.email || null,
        userId: data.userId || null,
      },
    });
  }

  async updateTeacher(
    id: string,
    data: { name?: string; email?: string | null; userId?: string | null },
  ) {
    return this.prisma.teacher.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.userId !== undefined && { userId: data.userId }),
      },
    });
  }

  async deleteTeacher(id: string) {
    // не удаляем, если есть группы
    const groupsCount = await this.prisma.studentGroup.count({
      where: { teacherId: id },
    });
    if (groupsCount > 0) {
      throw new Error('Нельзя удалить преподавателя с активными группами');
    }
    return this.prisma.teacher.delete({ where: { id } });
  }

  async getExams() {
    return this.prisma.exam.findMany({
      orderBy: [{ courseId: 'asc' }, { name: 'asc' }],
    });
  }

  async createExam(data: {
    name: string;
    type?: string;
    courseId?: string;
    groupId?: string;
    date?: string;
    maxScore?: number;
  }) {
    return this.prisma.exam.create({
      data: {
        name: data.name,
        type: data.type || null,
        courseId: data.courseId || null,
        groupId: data.groupId || null,
        date: data.date ? new Date(data.date) : null,
        maxScore: data.maxScore ?? null,
      },
    });
  }

  async updateExam(
    id: string,
    data: {
      name?: string;
      type?: string | null;
      courseId?: string | null;
      groupId?: string | null;
      date?: string | null;
      maxScore?: number | null;
    },
  ) {
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.date !== undefined && {
          date: data.date ? new Date(data.date) : null,
        }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
      },
    });
  }

  async deleteExam(id: string) {
    return this.prisma.exam.delete({ where: { id } });
  }

  async getCertificates() {
    return this.prisma.certificate.findMany({
      include: {
        student: {
          include: {
            candidate: {
              select: { id: true, firstName: true, lastName: true, candidateCode: true },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async createCertificate(data: {
    studentId: string;
    courseId?: string;
    level: string;
    issuedAt?: string;
  }) {
    // создаём запись сертификата в БД
    const certificate = await this.prisma.certificate.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId || null,
        level: data.level,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
      },
    });

    // находим связанные сущности
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
      include: {
        candidate: true,
      },
    });
    const course = data.courseId
      ? await this.prisma.course.findUnique({ where: { id: data.courseId } })
      : null;

    if (student?.candidate) {
      // генерируем простой PDF сертификат и сохраняем как документ кандидата
      const uploadRoot = path.join(process.cwd(), 'uploads');
      const candidateId = student.candidateId;
      const dir = path.join(uploadRoot, 'candidates', candidateId, 'certificate');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const fileName = `certificate-${certificate.id}.pdf`;
      const storageKey = path.join('candidates', candidateId, 'certificate', fileName).replace(
        /\\/g,
        '/',
      );
      const fullPath = path.join(uploadRoot, 'candidates', candidateId, 'certificate', fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(fullPath);
      doc.pipe(stream);

      doc.fontSize(20).text('Certificate of Completion', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(
          `This certifies that ${student.candidate.firstName ?? ''} ${
            student.candidate.lastName ?? ''
          }`,
          { align: 'center' },
        );
      doc.moveDown();
      doc
        .fontSize(12)
        .text(
          `has successfully completed the course ${
            course?.name ?? 'Language course'
          } at level ${data.level}.`,
          { align: 'center' },
        );
      doc.moveDown();
      doc.text(
        `Issued on: ${(certificate.issuedAt ?? new Date()).toLocaleDateString?.() ?? new Date().toISOString().substring(0, 10)}`,
        { align: 'center' },
      );

      doc.end();

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      const document = await this.prisma.document.create({
        data: {
          type: 'certificate',
          fileName,
          mimeType: 'application/pdf',
          storageKey,
          size: fs.statSync(fullPath).size,
          status: 'uploaded',
        },
      });

      await this.prisma.candidateDocument.create({
        data: {
          candidateId,
          documentId: document.id,
          type: 'certificate',
        },
      });

      await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          documentId: document.id,
        },
      });
    }

    return certificate;
  }

  async updateCertificate(
    id: string,
    data: { level?: string; issuedAt?: string },
  ) {
    return this.prisma.certificate.update({
      where: { id },
      data: {
        ...(data.level !== undefined && { level: data.level }),
        ...(data.issuedAt
          ? {
              issuedAt: new Date(data.issuedAt),
            }
          : {}),
      },
    });
  }

  async deleteCertificate(id: string) {
    return this.prisma.certificate.delete({ where: { id } });
  }

  async getStats() {
    const [totalStudents, completedStudents, failedStudents, payments] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'completed' } }),
      this.prisma.student.count({ where: { status: 'failed' } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'completed',
          candidate: {
            student: {
              isNot: null,
            },
          },
        },
      }),
    ]);

    return {
      totalStudents,
      completedStudents,
      failedStudents,
      totalRevenue: payments._sum.amount ?? 0,
    };
  }

  async getGroupsForTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (!teacher) {
      return [];
    }
    return this.prisma.studentGroup.findMany({
      where: { teacherId: teacher.id },
      include: {
        course: true,
        students: {
          include: {
            student: {
              include: {
                candidate: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async getLessonsForGroup(groupId: string) {
    const group = await this.prisma.studentGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) return [];

    return this.prisma.lesson.findMany({
      where: {
        module: {
          courseId: group.courseId,
        },
      },
      include: {
        attendance: {
          include: {
            student: {
              include: {
                candidate: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async setLessonAttendance(
    lessonId: string,
    groupId: string,
    items: { studentId: string; status: string }[],
  ) {
    const group = await this.prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        students: true,
      },
    });
    if (!group) {
      throw new Error('Group not found');
    }

    const allowedStudentIds = new Set(group.students.map((s) => s.studentId));

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!allowedStudentIds.has(item.studentId)) continue;
        await tx.lessonAttendance.upsert({
          where: {
            lessonId_studentId: {
              lessonId,
              studentId: item.studentId,
            },
          },
          update: {
            status: item.status,
            present: item.status === 'present',
          },
          create: {
            lessonId,
            studentId: item.studentId,
            status: item.status,
            present: item.status === 'present',
          },
        });
      }
    });
  }

  async updateStudent(
    id: string,
    data: {
      status?: string;
    },
  ) {
    return this.prisma.student.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  /**
   * Enroll candidate to a course and group:
   * - creates Student if missing
   * - links Student to StudentGroup
   */
  async enrollCandidateToGroup(candidateId: string, courseId: string, groupId: string) {
    const [candidate, course, group] = await Promise.all([
      this.prisma.candidate.findUnique({ where: { id: candidateId } }),
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.studentGroup.findUnique({ where: { id: groupId } }),
    ]);

    if (!candidate) {
      throw new Error('Candidate not found');
    }
    if (!course) {
      throw new Error('Course not found');
    }
    if (!group || group.courseId !== courseId) {
      throw new Error('Group not found for this course');
    }

    const student = await this.prisma.student.upsert({
      where: { candidateId },
      update: { status: 'studying' },
      create: {
        candidateId,
        status: 'enrolled',
      },
    });

    const existingLink = await this.prisma.studentGroupStudent.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId: student.id,
        },
      },
    });

    if (!existingLink) {
      await this.prisma.studentGroupStudent.create({
        data: {
          groupId,
          studentId: student.id,
        },
      });
    }

    return this.prisma.student.findUnique({
      where: { id: student.id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            candidateCode: true,
          },
        },
        groups: {
          include: {
            group: {
              include: { course: true, teacher: true },
            },
          },
        },
      },
    });
  }

  /**
   * Progress for a candidate in their main course, based on attendance.
   * Calculation:
   * - take first group of the student
   * - count all lessons in that course
   * - count attendance records for this student in lessons of that course
   * - progress = present / total * 100
   */
  async getCandidateProgress(candidateId: string) {
    const student = await this.prisma.student.findUnique({
      where: { candidateId },
      include: {
        groups: {
          include: {
            group: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!student || !student.groups.length) {
      return {
        hasStudent: false,
        progressPercent: 0,
        courseName: null,
        courseLevel: null,
        status: null,
      };
    }

    const mainGroup = student.groups[0].group;
    const courseId = mainGroup.courseId;

    if (!courseId) {
      return {
        hasStudent: true,
        progressPercent: 0,
        courseName: null,
        courseLevel: null,
        status: student.status,
      };
    }

    const [totalLessons, attendedLessons] = await Promise.all([
      this.prisma.lesson.count({
        where: {
          module: {
            courseId,
          },
        },
      }),
      this.prisma.lessonAttendance.count({
        where: {
          studentId: student.id,
          status: 'present',
          lesson: {
            module: {
              courseId,
            },
          },
        },
      }),
    ]);

    const progressPercent =
      totalLessons > 0 ? Math.round((attendedLessons / totalLessons) * 100) : 0;

    return {
      hasStudent: true,
      progressPercent,
      courseName: mainGroup.course?.name ?? null,
      courseLevel: mainGroup.course?.level ?? null,
      status: student.status,
    };
  }
}
