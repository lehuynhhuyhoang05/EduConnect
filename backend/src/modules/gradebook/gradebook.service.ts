import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GradeItem, GradeEntry, GradeCategory } from './entities/grade.entity';
import { CreateGradeItemDto, UpdateGradeEntryDto, BulkUpdateGradesDto } from './dto';
import { User } from '@modules/users/entities/user.entity';
import { ClassMember, ClassRole } from '@modules/classes/entities/class-member.entity';

@Injectable()
export class GradebookService {
  constructor(
    @InjectRepository(GradeItem)
    private gradeItemRepository: Repository<GradeItem>,
    @InjectRepository(GradeEntry)
    private gradeEntryRepository: Repository<GradeEntry>,
    @InjectRepository(ClassMember)
    private classMemberRepository: Repository<ClassMember>,
  ) {}

  /**
   * Create a grade item (column in gradebook)
   */
  async createGradeItem(dto: CreateGradeItemDto): Promise<GradeItem> {
    const gradeItem = this.gradeItemRepository.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return this.gradeItemRepository.save(gradeItem);
  }

  /**
   * Get all grade items for a class
   */
  async getGradeItemsByClass(classId: number): Promise<GradeItem[]> {
    return this.gradeItemRepository.find({
      where: { classId },
      order: { category: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get complete gradebook for a class (Teacher view)
   */
  async getGradebook(classId: number): Promise<{
    gradeItems: GradeItem[];
    students: any[];
    summary: any;
  }> {
    // Get all grade items
    const gradeItems = await this.getGradeItemsByClass(classId);

    // Get all students in class
    const members = await this.classMemberRepository.find({
      where: { classId, role: ClassRole.STUDENT },
      relations: ['user'],
    });

    // Get all grade entries
    const entries = await this.gradeEntryRepository.find({
      where: { gradeItemId: In(gradeItems.map((gi) => gi.id)) },
    });

    // Build student grades map
    const students = members.map((member) => {
      const studentGrades: Record<number, GradeEntry | null> = {};
      let totalScore = 0;
      let totalWeight = 0;
      let totalMaxScore = 0;

      gradeItems.forEach((item) => {
        const entry = entries.find(
          (e) => e.gradeItemId === item.id && e.studentId === member.userId,
        );
        studentGrades[item.id] = entry || null;

        if (entry && entry.score !== null && !entry.isExcused) {
          totalScore += (entry.score / Number(item.maxScore)) * Number(item.weight);
          totalWeight += Number(item.weight);
          totalMaxScore += Number(item.maxScore);
        }
      });

      const finalGrade = totalWeight > 0 ? (totalScore / totalWeight) * 100 : null;

      return {
        id: member.userId,
        fullName: member.user.fullName,
        email: member.user.email,
        grades: studentGrades,
        finalGrade: finalGrade ? Math.round(finalGrade * 100) / 100 : null,
        letterGrade: finalGrade ? this.getLetterGrade(finalGrade) : null,
      };
    });

    // Calculate class summary
    const summary = this.calculateClassSummary(gradeItems, entries, students);

    return { gradeItems, students, summary };
  }

  /**
   * Get student's own grades (Student view)
   */
  async getStudentGrades(classId: number, studentId: number): Promise<{
    gradeItems: GradeItem[];
    grades: Record<number, GradeEntry | null>;
    finalGrade: number | null;
    letterGrade: string | null;
  }> {
    const gradeItems = await this.gradeItemRepository.find({
      where: { classId, isPublished: true },
      order: { category: 'ASC', createdAt: 'ASC' },
    });

    const entries = await this.gradeEntryRepository.find({
      where: {
        gradeItemId: In(gradeItems.map((gi) => gi.id)),
        studentId,
      },
    });

    const grades: Record<number, GradeEntry | null> = {};
    let totalScore = 0;
    let totalWeight = 0;

    gradeItems.forEach((item) => {
      const entry = entries.find((e) => e.gradeItemId === item.id);
      grades[item.id] = entry || null;

      if (entry && entry.score !== null && !entry.isExcused) {
        totalScore += (entry.score / Number(item.maxScore)) * Number(item.weight);
        totalWeight += Number(item.weight);
      }
    });

    const finalGrade = totalWeight > 0 ? (totalScore / totalWeight) * 100 : null;

    return {
      gradeItems,
      grades,
      finalGrade: finalGrade ? Math.round(finalGrade * 100) / 100 : null,
      letterGrade: finalGrade ? this.getLetterGrade(finalGrade) : null,
    };
  }

  /**
   * Update a single grade entry
   */
  async updateGradeEntry(
    gradeItemId: number,
    studentId: number,
    dto: UpdateGradeEntryDto,
    gradedById: number,
  ): Promise<GradeEntry> {
    let entry = await this.gradeEntryRepository.findOne({
      where: { gradeItemId, studentId },
    });

    if (!entry) {
      entry = this.gradeEntryRepository.create({
        gradeItemId,
        studentId,
      });
    }

    entry.score = dto.score;
    entry.feedback = dto.feedback || entry.feedback;
    entry.isExcused = dto.isExcused ?? entry.isExcused;
    entry.gradedById = gradedById;
    entry.gradedAt = new Date();

    return this.gradeEntryRepository.save(entry);
  }

  /**
   * Bulk update grades for a grade item
   */
  async bulkUpdateGrades(dto: BulkUpdateGradesDto, gradedById: number): Promise<GradeEntry[]> {
    const results: GradeEntry[] = [];

    for (const grade of dto.grades) {
      const entry = await this.updateGradeEntry(
        dto.gradeItemId,
        grade.studentId,
        {
          score: grade.score,
          feedback: grade.feedback,
          isExcused: grade.isExcused,
        },
        gradedById,
      );
      results.push(entry);
    }

    return results;
  }

  /**
   * Delete a grade item
   */
  async deleteGradeItem(id: number): Promise<void> {
    const item = await this.gradeItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Grade item not found');
    }
    await this.gradeItemRepository.delete(id);
  }

  /**
   * Get grade statistics for a class
   */
  async getClassStatistics(classId: number): Promise<{
    averageGrade: number;
    highestGrade: number;
    lowestGrade: number;
    gradeDistribution: Record<string, number>;
    categoryAverages: Record<string, number>;
  }> {
    const gradebook = await this.getGradebook(classId);
    const finalGrades = gradebook.students
      .map((s) => s.finalGrade)
      .filter((g) => g !== null) as number[];

    if (finalGrades.length === 0) {
      return {
        averageGrade: 0,
        highestGrade: 0,
        lowestGrade: 0,
        gradeDistribution: {},
        categoryAverages: {},
      };
    }

    const gradeDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    finalGrades.forEach((grade) => {
      const letter = this.getLetterGrade(grade);
      gradeDistribution[letter]++;
    });

    return {
      averageGrade: Math.round((finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length) * 100) / 100,
      highestGrade: Math.max(...finalGrades),
      lowestGrade: Math.min(...finalGrades),
      gradeDistribution,
      categoryAverages: gradebook.summary.categoryAverages,
    };
  }

  /**
   * Export gradebook to CSV format
   */
  async exportGradebook(classId: number): Promise<string> {
    const gradebook = await this.getGradebook(classId);
    
    // Build CSV header
    const headers = ['Student Name', 'Email'];
    gradebook.gradeItems.forEach((item) => {
      headers.push(`${item.name} (${item.maxScore})`);
    });
    headers.push('Final Grade', 'Letter Grade');

    // Build CSV rows
    const rows = gradebook.students.map((student) => {
      const row = [student.fullName, student.email];
      gradebook.gradeItems.forEach((item) => {
        const grade = student.grades[item.id];
        row.push(grade?.score?.toString() || '');
      });
      row.push(student.finalGrade?.toString() || '');
      row.push(student.letterGrade || '');
      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Calculate letter grade from percentage
   */
  private getLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate class summary statistics
   */
  private calculateClassSummary(
    gradeItems: GradeItem[],
    entries: GradeEntry[],
    students: any[],
  ): any {
    const categoryAverages: Record<string, number> = {};
    const categoryWeights: Record<string, number> = {};

    // Calculate averages per category
    Object.values(GradeCategory).forEach((category) => {
      const categoryItems = gradeItems.filter((gi) => gi.category === category);
      if (categoryItems.length === 0) return;

      let totalScore = 0;
      let totalCount = 0;

      categoryItems.forEach((item) => {
        const itemEntries = entries.filter((e) => e.gradeItemId === item.id && e.score !== null);
        itemEntries.forEach((entry) => {
          totalScore += (entry.score / Number(item.maxScore)) * 100;
          totalCount++;
        });
      });

      if (totalCount > 0) {
        categoryAverages[category] = Math.round((totalScore / totalCount) * 100) / 100;
      }
    });

    const finalGrades = students
      .map((s) => s.finalGrade)
      .filter((g) => g !== null) as number[];

    return {
      totalStudents: students.length,
      gradedStudents: finalGrades.length,
      classAverage: finalGrades.length > 0
        ? Math.round((finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length) * 100) / 100
        : null,
      categoryAverages,
    };
  }
}
