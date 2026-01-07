import { Injectable } from '@nestjs/common';

/**
 * GRADEBOOK SERVICE
 * ===================
 * Bảng điểm tổng hợp như Google Classroom
 * 
 * Features:
 * - Aggregate grades from all assignments
 * - Weighted categories
 * - Grade statistics
 * - Export gradebook
 * - Grade policies (drop lowest, curve, etc.)
 */

export interface GradeEntry {
  assignmentId: number;
  assignmentTitle: string;
  category?: string;
  weight: number; // Percentage weight (0-100)
  maxScore: number;
  score: number | null; // null = not graded or not submitted
  submissionId?: number;
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: number;
  isExcused: boolean; // Excused from grading
  isLate: boolean;
  latePenalty?: number; // Percentage penalty
  comments?: string;
}

export interface StudentGradebook {
  userId: number;
  userName?: string;
  userEmail?: string;
  entries: Map<number, GradeEntry>; // assignmentId -> GradeEntry
  overallScore: number;
  overallPercentage: number;
  letterGrade: string;
  rank?: number;
}

export interface GradeCategory {
  name: string;
  weight: number; // Percentage (all categories should sum to 100)
  dropLowest: number; // Number of lowest grades to drop
}

export interface GradingPolicy {
  categories: GradeCategory[];
  latePenaltyPerDay: number; // Percentage per day late
  maxLatePenalty: number; // Max percentage penalty
  letterGradeScale: { min: number; grade: string }[];
  passThreshold: number; // Minimum percentage to pass
}

export interface ClassGradebook {
  classId: number;
  policy: GradingPolicy;
  students: Map<number, StudentGradebook>;
  assignments: Map<number, {
    id: number;
    title: string;
    category?: string;
    maxScore: number;
    weight: number;
    dueDate?: Date;
  }>;
  lastUpdated: Date;
}

@Injectable()
export class GradebookService {
  private gradebooks: Map<number, ClassGradebook> = new Map(); // classId -> gradebook

  private defaultPolicy: GradingPolicy = {
    categories: [],
    latePenaltyPerDay: 10, // 10% per day
    maxLatePenalty: 50, // Max 50% penalty
    letterGradeScale: [
      { min: 90, grade: 'A' },
      { min: 85, grade: 'A-' },
      { min: 80, grade: 'B+' },
      { min: 75, grade: 'B' },
      { min: 70, grade: 'B-' },
      { min: 65, grade: 'C+' },
      { min: 60, grade: 'C' },
      { min: 55, grade: 'C-' },
      { min: 50, grade: 'D+' },
      { min: 45, grade: 'D' },
      { min: 40, grade: 'D-' },
      { min: 0, grade: 'F' },
    ],
    passThreshold: 50,
  };

  /**
   * Initialize gradebook for a class
   */
  initGradebook(classId: number, policy?: Partial<GradingPolicy>): ClassGradebook {
    const gradebook: ClassGradebook = {
      classId,
      policy: { ...this.defaultPolicy, ...policy },
      students: new Map(),
      assignments: new Map(),
      lastUpdated: new Date(),
    };
    this.gradebooks.set(classId, gradebook);
    return gradebook;
  }

  /**
   * Get or create gradebook
   */
  getGradebook(classId: number): ClassGradebook {
    let gradebook = this.gradebooks.get(classId);
    if (!gradebook) {
      gradebook = this.initGradebook(classId);
    }
    return gradebook;
  }

  /**
   * Add assignment to gradebook
   */
  addAssignment(
    classId: number,
    assignment: {
      id: number;
      title: string;
      category?: string;
      maxScore: number;
      weight?: number;
      dueDate?: Date;
    },
  ): void {
    const gradebook = this.getGradebook(classId);
    gradebook.assignments.set(assignment.id, {
      id: assignment.id,
      title: assignment.title,
      category: assignment.category,
      maxScore: assignment.maxScore,
      weight: assignment.weight || 100,
      dueDate: assignment.dueDate,
    });
    gradebook.lastUpdated = new Date();
  }

  /**
   * Remove assignment from gradebook
   */
  removeAssignment(classId: number, assignmentId: number): void {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return;

    gradebook.assignments.delete(assignmentId);
    
    // Remove from all students
    gradebook.students.forEach(student => {
      student.entries.delete(assignmentId);
    });

    this.recalculateAll(classId);
  }

  /**
   * Add student to gradebook
   */
  addStudent(classId: number, userId: number, userName?: string, userEmail?: string): void {
    const gradebook = this.getGradebook(classId);
    
    if (!gradebook.students.has(userId)) {
      gradebook.students.set(userId, {
        userId,
        userName,
        userEmail,
        entries: new Map(),
        overallScore: 0,
        overallPercentage: 0,
        letterGrade: 'N/A',
      });
    }
  }

  /**
   * Record grade
   */
  recordGrade(
    classId: number,
    assignmentId: number,
    userId: number,
    grade: {
      score: number;
      submissionId?: number;
      submittedAt?: Date;
      gradedBy?: number;
      isLate?: boolean;
      comments?: string;
    },
  ): { success: boolean; entry?: GradeEntry; error?: string } {
    const gradebook = this.getGradebook(classId);
    const assignment = gradebook.assignments.get(assignmentId);

    if (!assignment) {
      return { success: false, error: 'Bài tập không tồn tại trong bảng điểm' };
    }

    // Get or create student
    if (!gradebook.students.has(userId)) {
      this.addStudent(classId, userId);
    }
    const student = gradebook.students.get(userId)!;

    // Calculate late penalty
    let latePenalty = 0;
    if (grade.isLate && assignment.dueDate && grade.submittedAt) {
      const daysLate = Math.ceil(
        (grade.submittedAt.getTime() - assignment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLate > 0) {
        latePenalty = Math.min(
          daysLate * gradebook.policy.latePenaltyPerDay,
          gradebook.policy.maxLatePenalty
        );
      }
    }

    const entry: GradeEntry = {
      assignmentId,
      assignmentTitle: assignment.title,
      category: assignment.category,
      weight: assignment.weight,
      maxScore: assignment.maxScore,
      score: grade.score,
      submissionId: grade.submissionId,
      submittedAt: grade.submittedAt,
      gradedAt: new Date(),
      gradedBy: grade.gradedBy,
      isExcused: false,
      isLate: grade.isLate || false,
      latePenalty,
      comments: grade.comments,
    };

    student.entries.set(assignmentId, entry);
    this.recalculateStudent(classId, userId);

    return { success: true, entry };
  }

  /**
   * Excuse student from assignment
   */
  excuseStudent(classId: number, assignmentId: number, userId: number): boolean {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return false;

    const student = gradebook.students.get(userId);
    if (!student) return false;

    const entry = student.entries.get(assignmentId);
    if (entry) {
      entry.isExcused = true;
    } else {
      const assignment = gradebook.assignments.get(assignmentId);
      if (!assignment) return false;

      student.entries.set(assignmentId, {
        assignmentId,
        assignmentTitle: assignment.title,
        category: assignment.category,
        weight: assignment.weight,
        maxScore: assignment.maxScore,
        score: null,
        isExcused: true,
        isLate: false,
      });
    }

    this.recalculateStudent(classId, userId);
    return true;
  }

  /**
   * Recalculate student's overall grade
   */
  recalculateStudent(classId: number, userId: number): void {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return;

    const student = gradebook.students.get(userId);
    if (!student) return;

    const policy = gradebook.policy;
    
    // Group by category
    const byCategory: Map<string, GradeEntry[]> = new Map();
    byCategory.set('_uncategorized', []);

    student.entries.forEach(entry => {
      if (entry.isExcused || entry.score === null) return;
      
      const cat = entry.category || '_uncategorized';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(entry);
    });

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Calculate by category with drop lowest
    policy.categories.forEach(cat => {
      const entries = byCategory.get(cat.name) || [];
      if (entries.length === 0) return;

      // Sort by percentage and drop lowest
      const sortedEntries = entries
        .map(e => ({
          entry: e,
          percentage: ((e.score! * (1 - (e.latePenalty || 0) / 100)) / e.maxScore) * 100,
        }))
        .sort((a, b) => a.percentage - b.percentage);

      // Drop lowest
      const afterDrop = sortedEntries.slice(cat.dropLowest);
      
      if (afterDrop.length > 0) {
        const avgPercentage = afterDrop.reduce((sum, e) => sum + e.percentage, 0) / afterDrop.length;
        totalWeightedScore += avgPercentage * cat.weight;
        totalWeight += cat.weight;
      }
    });

    // Handle uncategorized
    const uncategorized = byCategory.get('_uncategorized') || [];
    if (uncategorized.length > 0) {
      const remainingWeight = 100 - policy.categories.reduce((sum, c) => sum + c.weight, 0);
      if (remainingWeight > 0) {
        const avgPercentage = uncategorized.reduce((sum, e) => {
          const adjusted = (e.score! * (1 - (e.latePenalty || 0) / 100)) / e.maxScore * 100;
          return sum + adjusted;
        }, 0) / uncategorized.length;
        
        totalWeightedScore += avgPercentage * remainingWeight;
        totalWeight += remainingWeight;
      }
    }

    // Calculate overall
    student.overallPercentage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    student.overallScore = student.overallPercentage;
    student.letterGrade = this.getLetterGrade(student.overallPercentage, policy);

    gradebook.lastUpdated = new Date();
  }

  /**
   * Recalculate all students
   */
  recalculateAll(classId: number): void {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return;

    gradebook.students.forEach((_, userId) => {
      this.recalculateStudent(classId, userId);
    });

    // Update ranks
    this.updateRanks(classId);
  }

  /**
   * Update student ranks
   */
  private updateRanks(classId: number): void {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return;

    const sorted = Array.from(gradebook.students.values())
      .sort((a, b) => b.overallPercentage - a.overallPercentage);

    sorted.forEach((student, index) => {
      student.rank = index + 1;
    });
  }

  /**
   * Get letter grade from percentage
   */
  private getLetterGrade(percentage: number, policy: GradingPolicy): string {
    for (const scale of policy.letterGradeScale) {
      if (percentage >= scale.min) {
        return scale.grade;
      }
    }
    return 'F';
  }

  /**
   * Get student gradebook
   */
  getStudentGradebook(classId: number, userId: number): StudentGradebook | null {
    return this.gradebooks.get(classId)?.students.get(userId) || null;
  }

  /**
   * Get all students' grades
   */
  getAllStudentGrades(classId: number): StudentGradebook[] {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return [];

    return Array.from(gradebook.students.values())
      .sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }

  /**
   * Get assignment grades
   */
  getAssignmentGrades(classId: number, assignmentId: number): Array<{
    userId: number;
    userName?: string;
    grade: GradeEntry | null;
  }> {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return [];

    return Array.from(gradebook.students.values()).map(student => ({
      userId: student.userId,
      userName: student.userName,
      grade: student.entries.get(assignmentId) || null,
    }));
  }

  /**
   * Get class statistics
   */
  getClassStatistics(classId: number): {
    totalStudents: number;
    passing: number;
    failing: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    medianScore: number;
    gradeDistribution: Record<string, number>;
  } {
    const students = this.getAllStudentGrades(classId);
    
    if (students.length === 0) {
      return {
        totalStudents: 0,
        passing: 0,
        failing: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        medianScore: 0,
        gradeDistribution: {},
      };
    }

    const gradebook = this.gradebooks.get(classId)!;
    const scores = students.map(s => s.overallPercentage).sort((a, b) => a - b);
    
    const gradeDistribution: Record<string, number> = {};
    students.forEach(s => {
      gradeDistribution[s.letterGrade] = (gradeDistribution[s.letterGrade] || 0) + 1;
    });

    return {
      totalStudents: students.length,
      passing: students.filter(s => s.overallPercentage >= gradebook.policy.passThreshold).length,
      failing: students.filter(s => s.overallPercentage < gradebook.policy.passThreshold).length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: scores[scores.length - 1],
      lowestScore: scores[0],
      medianScore: scores[Math.floor(scores.length / 2)],
      gradeDistribution,
    };
  }

  /**
   * Get assignment statistics
   */
  getAssignmentStatistics(classId: number, assignmentId: number): {
    submitted: number;
    graded: number;
    notSubmitted: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    averagePercentage: number;
  } {
    const grades = this.getAssignmentGrades(classId, assignmentId);
    const assignment = this.gradebooks.get(classId)?.assignments.get(assignmentId);
    
    if (!assignment || grades.length === 0) {
      return {
        submitted: 0,
        graded: 0,
        notSubmitted: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averagePercentage: 0,
      };
    }

    const submitted = grades.filter(g => g.grade?.submissionId);
    const graded = grades.filter(g => g.grade?.score !== null && g.grade?.score !== undefined);
    const scores = graded.map(g => g.grade!.score!);

    return {
      submitted: submitted.length,
      graded: graded.length,
      notSubmitted: grades.length - submitted.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      averagePercentage: scores.length > 0 
        ? (scores.reduce((a, b) => a + b, 0) / scores.length / assignment.maxScore) * 100 
        : 0,
    };
  }

  /**
   * Update grading policy
   */
  updatePolicy(classId: number, policy: Partial<GradingPolicy>): GradingPolicy {
    const gradebook = this.getGradebook(classId);
    gradebook.policy = { ...gradebook.policy, ...policy };
    this.recalculateAll(classId);
    return gradebook.policy;
  }

  /**
   * Export gradebook as CSV data
   */
  exportGradebook(classId: number): string {
    const gradebook = this.gradebooks.get(classId);
    if (!gradebook) return '';

    const assignments = Array.from(gradebook.assignments.values());
    const students = this.getAllStudentGrades(classId);

    // Header
    const headers = ['Rank', 'Name', 'Email', ...assignments.map(a => a.title), 'Overall %', 'Grade'];
    const rows: string[][] = [headers];

    // Data rows
    students.forEach(student => {
      const row: string[] = [
        String(student.rank || '-'),
        student.userName || '',
        student.userEmail || '',
      ];

      assignments.forEach(assignment => {
        const entry = student.entries.get(assignment.id);
        if (entry?.score !== null && entry?.score !== undefined) {
          row.push(String(entry.score));
        } else if (entry?.isExcused) {
          row.push('EX');
        } else {
          row.push('-');
        }
      });

      row.push(student.overallPercentage.toFixed(2));
      row.push(student.letterGrade);
      rows.push(row);
    });

    return rows.map(row => row.join(',')).join('\n');
  }
}
