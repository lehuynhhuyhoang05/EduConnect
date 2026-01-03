import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * REAL-TIME POLLS SERVICE
 * =======================
 * Tính năng đặc biệt: Khảo sát/Quiz trực tiếp trong live session
 * Giống như Mentimeter, Kahoot - teacher tạo poll và students vote real-time
 * 
 * Network Concepts:
 * - WebSocket broadcast cho real-time updates
 * - Vote aggregation với eventual consistency
 * - Live statistics streaming
 */

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voters: number[]; // userIds (hidden from participants)
}

export interface Poll {
  id: string;
  sessionId: number;
  question: string;
  type: 'single-choice' | 'multiple-choice' | 'word-cloud' | 'rating' | 'open-ended';
  options: PollOption[];
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  status: 'draft' | 'active' | 'ended';
  showResultsToParticipants: boolean;
  anonymousVoting: boolean;
  allowChangeVote: boolean;
  timeLimit?: number; // seconds
  createdBy: number;
}

export interface PollVote {
  userId: number;
  optionIds: string[];
  text?: string; // for open-ended
  rating?: number; // for rating type
  timestamp: Date;
}

export interface PollResult {
  pollId: string;
  question: string;
  totalVotes: number;
  totalParticipants: number;
  options: {
    id: string;
    text: string;
    count: number;
    percentage: number;
  }[];
  wordCloudData?: { word: string; count: number }[];
  averageRating?: number;
  openEndedResponses?: string[];
}

@Injectable()
export class RealTimePollsService {
  // In-memory storage (có thể migrate sang Redis cho production scale)
  private polls: Map<string, Poll> = new Map();
  private votes: Map<string, PollVote[]> = new Map(); // pollId -> votes
  private sessionPolls: Map<number, string[]> = new Map(); // sessionId -> pollIds

  /**
   * Tạo poll mới
   */
  createPoll(
    sessionId: number,
    createdBy: number,
    data: {
      question: string;
      type: Poll['type'];
      options?: string[];
      showResultsToParticipants?: boolean;
      anonymousVoting?: boolean;
      allowChangeVote?: boolean;
      timeLimit?: number;
    },
  ): Poll {
    const pollId = `poll-${sessionId}-${Date.now()}`;
    
    const options: PollOption[] = (data.options || []).map((text, index) => ({
      id: `opt-${index}`,
      text,
      voteCount: 0,
      voters: [],
    }));

    const poll: Poll = {
      id: pollId,
      sessionId,
      question: data.question,
      type: data.type,
      options,
      createdAt: new Date(),
      status: 'draft',
      showResultsToParticipants: data.showResultsToParticipants ?? true,
      anonymousVoting: data.anonymousVoting ?? false,
      allowChangeVote: data.allowChangeVote ?? false,
      timeLimit: data.timeLimit,
      createdBy,
    };

    this.polls.set(pollId, poll);
    this.votes.set(pollId, []);

    // Track polls per session
    if (!this.sessionPolls.has(sessionId)) {
      this.sessionPolls.set(sessionId, []);
    }
    this.sessionPolls.get(sessionId)!.push(pollId);

    return poll;
  }

  /**
   * Thêm option vào poll (chỉ khi draft)
   */
  addOption(pollId: string, userId: number, optionText: string): Poll {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only creator can modify poll');
    }

    if (poll.status !== 'draft') {
      throw new BadRequestException('Cannot modify active or ended poll');
    }

    poll.options.push({
      id: `opt-${poll.options.length}`,
      text: optionText,
      voteCount: 0,
      voters: [],
    });

    return poll;
  }

  /**
   * Bắt đầu poll (cho phép voting)
   */
  startPoll(pollId: string, userId: number): Poll {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only creator can start poll');
    }

    poll.status = 'active';
    poll.startedAt = new Date();

    // Tự động kết thúc nếu có time limit
    if (poll.timeLimit) {
      setTimeout(() => {
        this.endPoll(pollId, userId);
      }, poll.timeLimit * 1000);
    }

    return poll;
  }

  /**
   * Kết thúc poll
   */
  endPoll(pollId: string, userId: number): Poll {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only creator can end poll');
    }

    poll.status = 'ended';
    poll.endedAt = new Date();

    return poll;
  }

  /**
   * Vote cho poll
   */
  vote(
    pollId: string,
    userId: number,
    data: { optionIds?: string[]; text?: string; rating?: number },
  ): { success: boolean; poll: Poll } {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.status !== 'active') {
      throw new BadRequestException('Poll is not active');
    }

    const votes = this.votes.get(pollId)!;
    const existingVoteIndex = votes.findIndex(v => v.userId === userId);

    if (existingVoteIndex !== -1) {
      if (!poll.allowChangeVote) {
        throw new BadRequestException('Cannot change vote');
      }
      // Xóa vote cũ
      const oldVote = votes[existingVoteIndex];
      oldVote.optionIds.forEach(optId => {
        const option = poll.options.find(o => o.id === optId);
        if (option) {
          option.voteCount--;
          option.voters = option.voters.filter(id => id !== userId);
        }
      });
      votes.splice(existingVoteIndex, 1);
    }

    // Validate vote theo type
    if (poll.type === 'single-choice' && (data.optionIds?.length || 0) > 1) {
      throw new BadRequestException('Single choice poll allows only one option');
    }

    // Thêm vote mới
    const newVote: PollVote = {
      userId,
      optionIds: data.optionIds || [],
      text: data.text,
      rating: data.rating,
      timestamp: new Date(),
    };
    votes.push(newVote);

    // Update option counts
    data.optionIds?.forEach(optId => {
      const option = poll.options.find(o => o.id === optId);
      if (option) {
        option.voteCount++;
        option.voters.push(userId);
      }
    });

    return { success: true, poll };
  }

  /**
   * Lấy kết quả poll
   */
  getResults(pollId: string, requestUserId: number): PollResult {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    // Kiểm tra quyền xem kết quả
    const isCreator = poll.createdBy === requestUserId;
    if (!isCreator && !poll.showResultsToParticipants && poll.status !== 'ended') {
      throw new ForbiddenException('Results are hidden until poll ends');
    }

    const votes = this.votes.get(pollId)!;
    const totalVotes = votes.length;
    const uniqueVoters = new Set(votes.map(v => v.userId)).size;

    const result: PollResult = {
      pollId,
      question: poll.question,
      totalVotes,
      totalParticipants: uniqueVoters,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        count: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
    };

    // Thêm data đặc biệt theo type
    if (poll.type === 'word-cloud') {
      result.wordCloudData = this.generateWordCloud(votes);
    }

    if (poll.type === 'rating') {
      const ratings = votes.filter(v => v.rating !== undefined).map(v => v.rating!);
      result.averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;
    }

    if (poll.type === 'open-ended') {
      result.openEndedResponses = votes
        .filter(v => v.text)
        .map(v => poll.anonymousVoting ? v.text! : v.text!);
    }

    return result;
  }

  /**
   * Lấy tất cả polls của session
   */
  getSessionPolls(sessionId: number): Poll[] {
    const pollIds = this.sessionPolls.get(sessionId) || [];
    return pollIds.map(id => this.polls.get(id)!).filter(Boolean);
  }

  /**
   * Lấy poll để hiển thị cho participant (hide voter info)
   */
  getPollForParticipant(pollId: string, userId: number): {
    poll: Omit<Poll, 'options'> & { options: { id: string; text: string; count?: number }[] };
    hasVoted: boolean;
    myVote?: string[];
  } {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    const votes = this.votes.get(pollId)!;
    const myVote = votes.find(v => v.userId === userId);

    // Hide counts nếu chưa cho phép xem results
    const showCounts = poll.showResultsToParticipants || poll.status === 'ended';

    return {
      poll: {
        ...poll,
        options: poll.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          count: showCounts ? opt.voteCount : undefined,
        })),
      },
      hasVoted: !!myVote,
      myVote: myVote?.optionIds,
    };
  }

  /**
   * Generate word cloud từ responses
   */
  private generateWordCloud(votes: PollVote[]): { word: string; count: number }[] {
    const wordCounts = new Map<string, number>();

    votes.forEach(vote => {
      if (vote.text) {
        const words = vote.text.toLowerCase().split(/\s+/);
        words.forEach(word => {
          const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
          if (cleaned.length > 2) { // Ignore short words
            wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
          }
        });
      }
    });

    return Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 words
  }

  /**
   * Xóa poll
   */
  deletePoll(pollId: string, userId: number): { success: boolean } {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only creator can delete poll');
    }

    this.polls.delete(pollId);
    this.votes.delete(pollId);

    // Remove from session list
    const sessionPollIds = this.sessionPolls.get(poll.sessionId);
    if (sessionPollIds) {
      const index = sessionPollIds.indexOf(pollId);
      if (index !== -1) sessionPollIds.splice(index, 1);
    }

    return { success: true };
  }

  /**
   * Quick poll - tạo và bắt đầu ngay
   */
  quickPoll(
    sessionId: number,
    createdBy: number,
    question: string,
    options: string[],
    timeLimitSeconds?: number,
  ): Poll {
    const poll = this.createPoll(sessionId, createdBy, {
      question,
      type: 'single-choice',
      options,
      showResultsToParticipants: true,
      timeLimit: timeLimitSeconds,
    });

    return this.startPoll(poll.id, createdBy);
  }

  /**
   * Lấy live statistics (cho host dashboard)
   */
  getLiveStats(pollId: string): {
    totalVotes: number;
    votesPerSecond: number;
    lastVoteAt: Date | null;
    participationRate: number;
    optionBreakdown: { id: string; percentage: number }[];
  } | null {
    const poll = this.polls.get(pollId);
    const votes = this.votes.get(pollId);
    if (!poll || !votes) return null;

    const totalVotes = votes.length;
    const lastVote = votes[votes.length - 1];
    
    // Calculate votes per second (last 10 seconds)
    const now = Date.now();
    const recentVotes = votes.filter(v => now - v.timestamp.getTime() < 10000);
    const votesPerSecond = recentVotes.length / 10;

    return {
      totalVotes,
      votesPerSecond: Math.round(votesPerSecond * 100) / 100,
      lastVoteAt: lastVote?.timestamp || null,
      participationRate: 0, // Would need total session participants
      optionBreakdown: poll.options.map(opt => ({
        id: opt.id,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
    };
  }

  /**
   * Export poll results
   */
  exportResults(pollId: string, userId: number): {
    poll: Poll;
    results: PollResult;
    rawVotes: PollVote[];
    exportedAt: Date;
  } {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new BadRequestException('Poll not found');
    }

    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only creator can export results');
    }

    return {
      poll,
      results: this.getResults(pollId, userId),
      rawVotes: poll.anonymousVoting 
        ? this.votes.get(pollId)!.map(v => ({ ...v, userId: 0 })) // Anonymize
        : this.votes.get(pollId)!,
      exportedAt: new Date(),
    };
  }
}
