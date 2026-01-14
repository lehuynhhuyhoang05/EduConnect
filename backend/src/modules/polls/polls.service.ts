    import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poll, PollResponse, PollStatus, PollType } from './entities/poll.entity';
import { CreatePollDto, SubmitResponseDto } from './dto';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class PollsService {
  constructor(
    @InjectRepository(Poll)
    private pollRepository: Repository<Poll>,
    @InjectRepository(PollResponse)
    private responseRepository: Repository<PollResponse>,
  ) {}

  /**
   * Create a new poll/quiz
   */
  async create(createPollDto: CreatePollDto, user: User): Promise<Poll> {
    // Validate options for choice questions
    if ([PollType.MULTIPLE_CHOICE, PollType.SINGLE_CHOICE].includes(createPollDto.type)) {
      if (!createPollDto.options || createPollDto.options.length < 2) {
        throw new BadRequestException('Choice questions require at least 2 options');
      }
    }

    // Validate correct answers for quiz mode
    if (createPollDto.isQuiz && createPollDto.type !== PollType.SHORT_ANSWER) {
      if (!createPollDto.correctAnswers || createPollDto.correctAnswers.length === 0) {
        throw new BadRequestException('Quiz mode requires correct answers');
      }
    }

    const poll = this.pollRepository.create({
      ...createPollDto,
      createdById: user.id,
    });

    return this.pollRepository.save(poll);
  }

  /**
   * Get poll by ID with responses count
   */
  async findOne(id: number): Promise<Poll & { responseCount: number; results?: any }> {
    const poll = await this.pollRepository.findOne({
      where: { id },
      relations: ['createdBy', 'responses'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const responseCount = poll.responses?.length || 0;
    const results = this.calculateResults(poll);

    return { ...poll, responseCount, results };
  }

  /**
   * Get polls for a class or session
   */
  async findByClassOrSession(classId?: number, sessionId?: number): Promise<Poll[]> {
    const where: any = {};
    if (classId) where.classId = classId;
    if (sessionId) where.sessionId = sessionId;

    return this.pollRepository.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Start a poll (make it active)
   */
  async startPoll(id: number, userId: number): Promise<Poll> {
    const poll = await this.pollRepository.findOne({ where: { id } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.createdById !== userId) {
      throw new ForbiddenException('Only poll creator can start the poll');
    }

    if (poll.status !== PollStatus.DRAFT) {
      throw new BadRequestException('Poll is already started or closed');
    }

    poll.status = PollStatus.ACTIVE;
    poll.startedAt = new Date();

    return this.pollRepository.save(poll);
  }

  /**
   * Close a poll
   */
  async closePoll(id: number, userId: number): Promise<Poll> {
    const poll = await this.pollRepository.findOne({ where: { id } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.createdById !== userId) {
      throw new ForbiddenException('Only poll creator can close the poll');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    poll.status = PollStatus.CLOSED;
    poll.closedAt = new Date();

    return this.pollRepository.save(poll);
  }

  /**
   * Submit a response to a poll
   */
  async submitResponse(dto: SubmitResponseDto, user: User): Promise<PollResponse> {
    const poll = await this.pollRepository.findOne({ where: { id: dto.pollId } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    // Check if user already responded
    const existingResponse = await this.responseRepository.findOne({
      where: { pollId: dto.pollId, userId: user.id },
    });

    if (existingResponse) {
      throw new BadRequestException('You have already responded to this poll');
    }

    // Validate response based on poll type
    this.validateResponse(poll, dto);

    // Calculate if correct (for quiz mode)
    let isCorrect = false;
    let points = 0;

    if (poll.isQuiz && poll.correctAnswers) {
      if (poll.type === PollType.SHORT_ANSWER) {
        // For short answer, manual grading needed
        isCorrect = false;
      } else {
        // For choice questions, check if answers match
        isCorrect = this.checkCorrectAnswer(poll.correctAnswers, dto.selectedOptions || []);
        points = isCorrect ? 1 : 0;
      }
    }

    const response = this.responseRepository.create({
      pollId: dto.pollId,
      userId: user.id,
      selectedOptions: dto.selectedOptions,
      textAnswer: dto.textAnswer,
      isCorrect,
      points,
      answeredAt: new Date(),
    });

    return this.responseRepository.save(response);
  }

  /**
   * Get live results for a poll
   */
  async getLiveResults(pollId: number): Promise<{
    poll: Poll;
    totalResponses: number;
    results: any;
    leaderboard?: any[];
  }> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: ['responses', 'responses.user'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const totalResponses = poll.responses?.length || 0;
    const results = this.calculateResults(poll);

    // Leaderboard for quiz mode
    let leaderboard = undefined;
    if (poll.isQuiz && !poll.anonymous) {
      leaderboard = poll.responses
        .filter((r) => r.isCorrect)
        .sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime())
        .slice(0, 10)
        .map((r, index) => ({
          rank: index + 1,
          userId: r.userId,
          userName: r.user?.fullName || 'Anonymous',
          points: r.points,
          answeredAt: r.answeredAt,
        }));
    }

    return { poll, totalResponses, results, leaderboard };
  }

  /**
   * Calculate poll results
   */
  private calculateResults(poll: Poll): any {
    if (!poll.responses || poll.responses.length === 0) {
      return null;
    }

    if (poll.type === PollType.SHORT_ANSWER) {
      return poll.responses.map((r) => ({
        answer: r.textAnswer,
        userId: poll.anonymous ? null : r.userId,
      }));
    }

    // For choice questions, count votes per option
    const optionCounts: number[] = new Array(poll.options?.length || 0).fill(0);
    
    poll.responses.forEach((response) => {
      response.selectedOptions?.forEach((optionIndex) => {
        if (optionIndex >= 0 && optionIndex < optionCounts.length) {
          optionCounts[optionIndex]++;
        }
      });
    });

    return poll.options?.map((option, index) => ({
      option,
      count: optionCounts[index],
      percentage: poll.responses.length > 0 
        ? Math.round((optionCounts[index] / poll.responses.length) * 100) 
        : 0,
      isCorrect: poll.isQuiz && poll.correctAnswers?.includes(index),
    }));
  }

  /**
   * Validate response based on poll type
   */
  private validateResponse(poll: Poll, dto: SubmitResponseDto): void {
    switch (poll.type) {
      case PollType.SINGLE_CHOICE:
        if (!dto.selectedOptions || dto.selectedOptions.length !== 1) {
          throw new BadRequestException('Single choice requires exactly one answer');
        }
        break;
      case PollType.MULTIPLE_CHOICE:
        if (!dto.selectedOptions || dto.selectedOptions.length === 0) {
          throw new BadRequestException('Multiple choice requires at least one answer');
        }
        break;
      case PollType.TRUE_FALSE:
        if (!dto.selectedOptions || dto.selectedOptions.length !== 1) {
          throw new BadRequestException('True/False requires exactly one answer');
        }
        break;
      case PollType.SHORT_ANSWER:
        if (!dto.textAnswer || dto.textAnswer.trim() === '') {
          throw new BadRequestException('Short answer requires text answer');
        }
        break;
    }
  }

  /**
   * Check if answer is correct
   */
  private checkCorrectAnswer(correctAnswers: number[], selectedOptions: number[]): boolean {
    if (correctAnswers.length !== selectedOptions.length) {
      return false;
    }
    return correctAnswers.every((a) => selectedOptions.includes(a));
  }

  /**
   * Delete a poll
   */
  async delete(id: number, userId: number): Promise<void> {
    const poll = await this.pollRepository.findOne({ where: { id } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.createdById !== userId) {
      throw new ForbiddenException('Only poll creator can delete the poll');
    }

    await this.pollRepository.delete(id);
  }

  /**
   * Check if user has responded to poll
   */
  async hasResponded(pollId: number, userId: number): Promise<boolean> {
    const response = await this.responseRepository.findOne({
      where: { pollId, userId },
    });
    return !!response;
  }

  /**
   * Get user's response for a poll
   */
  async getUserResponse(pollId: number, userId: number): Promise<PollResponse | null> {
    return this.responseRepository.findOne({
      where: { pollId, userId },
    });
  }
}
