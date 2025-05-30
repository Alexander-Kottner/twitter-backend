import { ChatRoomRepository } from '../repository/chat-room.repository'
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository'
import { MessageRepository } from '../repository/message.repository'
import { FollowerRepository } from '@domains/follower/repository/follower.repository'
import { CreateChatRoomDTO, ChatRoomDTO, ChatRoomSummaryDTO, UpdateChatRoomDTO, ChatRoomType } from '../dto/chat-room.dto'
import { ValidationError, AuthorizationError } from '../dto/errors.dto'

// Circuit breaker for external service calls
interface CircuitBreakerState {
  failureCount: number
  lastFailureTime: number
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

export class ChatRoomService {
  private followerServiceCircuitBreaker: CircuitBreakerState = {
    failureCount: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  }
  private readonly circuitBreakerTimeout = 60000 // 1 minute
  private readonly failureThreshold = 5

  constructor (
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly chatRoomMemberRepository: ChatRoomMemberRepository,
    private readonly messageRepository: MessageRepository,
    private readonly followerRepository: FollowerRepository
  ) {}

  async createChatRoom (data: CreateChatRoomDTO, requesterId: string): Promise<ChatRoomDTO> {
    // Validate that requester is in the member list
    if (!data.memberIds.includes(requesterId)) {
      throw new ValidationError('Requester must be included in the chat room members')
    }

    // For DM chats, ensure exactly 2 members
    if (data.type === ChatRoomType.DM && data.memberIds.length !== 2) {
      throw new ValidationError('DM chats must have exactly 2 members')
    }

    // PERFORMANCE FIX: Optimized mutual follow validation for groups
    await this.validateMutualFollowsForGroupOptimized(data.memberIds)

    // TRANSACTION FIX: Use database transaction for group chat creation
    return await this.chatRoomRepository.createWithTransaction(data)
  }

  async getChatRoom (id: string, userId: string): Promise<ChatRoomDTO | null> {
    await this.validateMembership(id, userId)
    return await this.chatRoomRepository.findById(id)
  }

  async getUserChatRooms (userId: string): Promise<ChatRoomSummaryDTO[]> {
    const chatRooms = await this.chatRoomRepository.findByMemberId(userId)
    const summaries: ChatRoomSummaryDTO[] = []

    for (const room of chatRooms) {
      const memberCount = await this.chatRoomMemberRepository.getMemberCount(room.id)
      const lastMessage = await this.messageRepository.getLastMessageForChatRoom(room.id)
      const unreadCount = await this.chatRoomRepository.getUnreadCountForUser(room.id, userId)

      summaries.push(new ChatRoomSummaryDTO({
        id: room.id,
        name: room.name,
        type: room.type,
        memberCount,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          authorName: lastMessage.authorId // Will be populated with actual author name in real implementation
        } : undefined,
        unreadCount
      }))
    }

    return summaries
  }

  async findOrCreateDMChatRoom (user1Id: string, user2Id: string): Promise<ChatRoomDTO> {
    // Validate mutual follow relationship
    await this.validateMutualFollow(user1Id, user2Id)

    // RACE CONDITION FIX: Use database transaction for atomic DM creation
    return await this.chatRoomRepository.findOrCreateDMTransaction(user1Id, user2Id)
  }

  async updateChatRoom (id: string, data: UpdateChatRoomDTO, userId: string): Promise<ChatRoomDTO> {
    await this.validateMembership(id, userId)
    return await this.chatRoomRepository.update(id, data)
  }

  async deleteChatRoom (id: string, userId: string): Promise<void> {
    await this.validateMembership(id, userId)
    await this.chatRoomRepository.delete(id)
  }

  // CRITICAL FIX: Add missing unread count method
  async getUnreadCountForUser (chatRoomId: string, userId: string): Promise<number> {
    return await this.chatRoomRepository.getUnreadCountForUser(chatRoomId, userId)
  }

  private async validateMembership (chatRoomId: string, userId: string): Promise<void> {
    const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId)
    if (!isMember) {
      throw new AuthorizationError('User is not a member of this chat room')
    }
  }

  // CIRCUIT BREAKER FIX: Add resilience to follower service calls
  private async validateMutualFollow (user1Id: string, user2Id: string): Promise<void> {
    try {
      if (this.isCircuitBreakerOpen()) {
        throw new Error('Follower service temporarily unavailable')
      }

      const user1FollowsUser2 = await this.followerRepository.isFollowing(user1Id, user2Id)
      const user2FollowsUser1 = await this.followerRepository.isFollowing(user2Id, user1Id)

      if (!user1FollowsUser2 || !user2FollowsUser1) {
        throw new AuthorizationError('Users must follow each other to chat')
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker()
    } catch (error) {
      this.recordFailure()
      
      // If circuit breaker is open, allow chat but log the issue
      if (this.isCircuitBreakerOpen()) {
        console.warn(`Follower service unavailable, allowing chat between ${user1Id} and ${user2Id}`)
        return // Graceful degradation
      }
      
      throw error
    }
  }

  // PERFORMANCE FIX: Optimized group validation using batch queries
  private async validateMutualFollowsForGroupOptimized (memberIds: string[]): Promise<void> {
    try {
      if (this.isCircuitBreakerOpen()) {
        console.warn('Follower service unavailable, skipping mutual follow validation')
        return // Graceful degradation
      }

      // Batch query all follow relationships at once
      const followChecks: Promise<boolean>[] = []
      const pairs: [string, string][] = []

      for (let i = 0; i < memberIds.length; i++) {
        for (let j = i + 1; j < memberIds.length; j++) {
          pairs.push([memberIds[i], memberIds[j]])
          // Check both directions for mutual follows
          followChecks.push(this.followerRepository.isFollowing(memberIds[i], memberIds[j]))
          followChecks.push(this.followerRepository.isFollowing(memberIds[j], memberIds[i]))
        }
      }

      const results = await Promise.all(followChecks)
      
      // Validate results in pairs (mutual follows)
      for (let i = 0; i < results.length; i += 2) {
        const user1FollowsUser2 = results[i]
        const user2FollowsUser1 = results[i + 1]
        
        if (!user1FollowsUser2 || !user2FollowsUser1) {
          const [user1Id, user2Id] = pairs[Math.floor(i / 2)]
          throw new AuthorizationError(`Users ${user1Id} and ${user2Id} must follow each other to be in the same group`)
        }
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker()
    } catch (error) {
      this.recordFailure()
      
      // If circuit breaker is open, allow group creation but log the issue
      if (this.isCircuitBreakerOpen()) {
        console.warn('Follower service unavailable, allowing group creation without mutual follow validation')
        return // Graceful degradation
      }
      
      throw error
    }
  }

  // Circuit breaker helper methods
  private isCircuitBreakerOpen(): boolean {
    if (this.followerServiceCircuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.followerServiceCircuitBreaker.lastFailureTime
      if (timeSinceLastFailure > this.circuitBreakerTimeout) {
        this.followerServiceCircuitBreaker.state = 'HALF_OPEN'
        return false
      }
      return true
    }
    return false
  }

  private recordFailure(): void {
    this.followerServiceCircuitBreaker.failureCount++
    this.followerServiceCircuitBreaker.lastFailureTime = Date.now()
    
    if (this.followerServiceCircuitBreaker.failureCount >= this.failureThreshold) {
      this.followerServiceCircuitBreaker.state = 'OPEN'
      console.warn('Circuit breaker opened for follower service')
    }
  }

  private resetCircuitBreaker(): void {
    this.followerServiceCircuitBreaker.failureCount = 0
    this.followerServiceCircuitBreaker.state = 'CLOSED'
  }
}