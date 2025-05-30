import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { ChatService } from '../service/chat.service'
import { MessageType } from '../dto/message.dto'
import { RateLimitError, AuthenticationError, AuthorizationError, ServerConfigurationError } from '../dto/errors.dto'
import crypto from 'crypto'

interface AuthenticatedSocket extends Socket {
  userId?: string
  sessionId?: string
  lastActivity?: number
}

interface JoinRoomData {
  chatRoomId: string
}

interface SendMessageData {
  chatRoomId: string
  content: string
  type?: MessageType
  messageId?: string // For deduplication
}

interface TypingData {
  chatRoomId: string
  isTyping: boolean
}

// Enhanced rate limiting with different categories
const rateLimits = new Map<string, { count: number; resetTime: number }>()
const MESSAGE_LIMIT = 10 // messages per minute
const TYPING_LIMIT = 30 // typing events per minute
const ROOM_OPERATION_LIMIT = 20 // join/leave operations per minute
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

// Security tracking
const activeSessions = new Map<string, { userId: string; createdAt: number; lastActivity: number }>()
const processedMessages = new Set<string>() // For message deduplication
const securityEvents = new Map<string, { events: string[]; lastReset: number }>()

export class ChatGateway {
  private io: SocketIOServer
  private chatService: ChatService

  constructor(httpServer: HTTPServer, chatService: ChatService) {
    this.chatService = chatService
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
    this.startSecurityCleanup()
  }

  // SECURITY ENHANCEMENT: Input validation for chat room IDs
  private validateChatRoomId(chatRoomId: string): boolean {
    if (typeof chatRoomId !== 'string') return false
    
    // Check for UUID format (adjust regex based on your ID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(chatRoomId)
  }

  // SECURITY ENHANCEMENT: Content validation and sanitization
  private validateMessageContent(content: string): boolean {
    if (typeof content !== 'string') return false
    if (content.length === 0 || content.length > 2000) return false
    
    // Check for potential XSS or injection attempts
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ]
    
    return !suspiciousPatterns.some(pattern => pattern.test(content))
  }

  // SECURITY ENHANCEMENT: Session validation
  private validateSession(socket: AuthenticatedSocket): boolean {
    if (!socket.sessionId || !socket.userId) return false
    
    const session = activeSessions.get(socket.sessionId)
    if (!session) return false
    
    const now = Date.now()
    if (now - session.createdAt > SESSION_TIMEOUT) {
      activeSessions.delete(socket.sessionId)
      return false
    }
    
    // Update last activity
    session.lastActivity = now
    socket.lastActivity = now
    
    return session.userId === socket.userId
  }

  // SECURITY ENHANCEMENT: Rate limiting with category support
  private checkRateLimit(userId: string, category: string, limit: number): boolean {
    const key = `${category}:${userId}`
    const currentTime = Date.now()
    const resetTime = currentTime + 60 * 1000

    if (!rateLimits.has(key)) {
      rateLimits.set(key, { count: 0, resetTime })
    }

    const userLimit = rateLimits.get(key)!

    if (currentTime > userLimit.resetTime) {
      userLimit.count = 0
      userLimit.resetTime = resetTime
    }

    if (userLimit.count >= limit) {
      this.logSecurityEvent(userId, `Rate limit exceeded for ${category}`)
      return false
    }

    userLimit.count++
    return true
  }

  // SECURITY ENHANCEMENT: Security event logging
  private logSecurityEvent(userId: string, event: string): void {
    const key = `security:${userId}`
    const currentTime = Date.now()
    
    if (!securityEvents.has(key)) {
      securityEvents.set(key, { events: [], lastReset: currentTime })
    }

    const userEvents = securityEvents.get(key)!
    
    // Reset events every hour
    if (currentTime - userEvents.lastReset > 60 * 60 * 1000) {
      userEvents.events = []
      userEvents.lastReset = currentTime
    }

    userEvents.events.push(`${new Date().toISOString()}: ${event}`)
    
    // Log to console for monitoring
    console.warn(`Security Event - User ${userId}: ${event}`)
    
    // If too many security events, consider additional actions
    if (userEvents.events.length > 10) {
      console.error(`Multiple security events detected for user ${userId}`)
    }
  }

  // SECURITY ENHANCEMENT: Membership revalidation
  private async revalidateMembership(chatRoomId: string, userId: string): Promise<boolean> {
    try {
      return await this.chatService.validateChatRoomMembership(chatRoomId, userId)
    } catch (error) {
      this.logSecurityEvent(userId, `Membership validation failed for room ${chatRoomId}`)
      return false
    }
  }

  private setupMiddleware(): void {
    // Enhanced authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
        
        if (!token) {
          return next(new AuthenticationError('Authentication token required'))
        }

        const jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set')
          return next(new ServerConfigurationError('Server configuration error'))
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: string; iat?: number }
        const authenticatedSocket = socket as AuthenticatedSocket
        
        // SECURITY ENHANCEMENT: Generate session ID and track sessions
        const sessionId = crypto.randomBytes(32).toString('hex')
        authenticatedSocket.userId = decoded.userId
        authenticatedSocket.sessionId = sessionId
        authenticatedSocket.lastActivity = Date.now()
        
        // Store session
        activeSessions.set(sessionId, {
          userId: decoded.userId,
          createdAt: Date.now(),
          lastActivity: Date.now()
        })
        
        next()
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return next(new AuthenticationError('Invalid authentication token'))
        }
        return next(new AuthenticationError('Authentication failed'))
      }
    })
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket
      const userId = authenticatedSocket.userId
      
      if (!userId || !this.validateSession(authenticatedSocket)) {
        socket.disconnect(true)
        return
      }

      console.log(`User ${userId} connected to chat with session ${authenticatedSocket.sessionId}`)

      // Join user to their personal room for notifications
      socket.join(`user:${userId}`)

      // SECURITY ENHANCEMENT: Validate all incoming events
      socket.use((packet, next) => {
        if (!this.validateSession(authenticatedSocket)) {
          socket.disconnect(true)
          return next(new AuthenticationError('Session expired'))
        }
        next()
      })

      // Handle joining a chat room
      socket.on('join_room', async (data: JoinRoomData) => {
        try {
          await this.handleJoinRoom(authenticatedSocket, data)
        } catch (error) {
          this.emitStructuredError(socket, error, 'join_room_error')
        }
      })

      // Handle leaving a chat room
      socket.on('leave_room', async (data: JoinRoomData) => {
        try {
          await this.handleLeaveRoom(authenticatedSocket, data)
        } catch (error) {
          this.emitStructuredError(socket, error, 'leave_room_error')
        }
      })

      // Handle sending a message
      socket.on('send_message', async (data: SendMessageData) => {
        try {
          await this.handleSendMessage(authenticatedSocket, data)
        } catch (error) {
          this.emitStructuredError(socket, error, 'send_message_error')
        }
      })

      // Handle typing indicators
      socket.on('typing', async (data: TypingData) => {
        try {
          await this.handleTyping(authenticatedSocket, data)
        } catch (error) {
          this.emitStructuredError(socket, error, 'typing_error')
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from chat`)
        if (authenticatedSocket.sessionId) {
          activeSessions.delete(authenticatedSocket.sessionId)
        }
      })
    })
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomData): Promise<void> {
    const { chatRoomId } = data
    const userId = socket.userId!

    // SECURITY ENHANCEMENT: Input validation
    if (!this.validateChatRoomId(chatRoomId)) {
      this.logSecurityEvent(userId, `Invalid chat room ID format: ${chatRoomId}`)
      throw new AuthorizationError('Invalid chat room identifier')
    }

    // SECURITY ENHANCEMENT: Rate limiting for room operations
    if (!this.checkRateLimit(userId, 'room_operations', ROOM_OPERATION_LIMIT)) {
      throw new RateLimitError('Too many room operations. Please wait before trying again.')
    }

    // SECURITY ENHANCEMENT: Enhanced membership validation
    const canJoin = await this.revalidateMembership(chatRoomId, userId)
    if (!canJoin) {
      this.logSecurityEvent(userId, `Unauthorized join attempt for room: ${chatRoomId}`)
      throw new AuthorizationError('You are not a member of this chat room')
    }

    // Join the Socket.IO room
    socket.join(`room:${chatRoomId}`)
    
    // ENHANCEMENT: Mark all messages as read when joining a room
    try {
      await this.chatService.updateLastRead(chatRoomId, userId)
      
      // Also send the current unread count (should be 0) to update client UI
      this.io.to(`user:${userId}`).emit('unread_count_updated', {
        chatRoomId,
        unreadCount: 0
      })
    } catch (error) {
      console.error(`Failed to update last read timestamp for user ${userId} in room ${chatRoomId}:`, error)
      // Non-critical error, don't throw
    }
    
    // SECURITY ENHANCEMENT: Don't broadcast user IDs, use minimal info
    socket.to(`room:${chatRoomId}`).emit('user_joined', {
      chatRoomId,
      timestamp: new Date().toISOString()
    })

    // Send confirmation to user
    socket.emit('joined_room', { chatRoomId })
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket, data: JoinRoomData): Promise<void> {
    const { chatRoomId } = data
    const userId = socket.userId!

    // SECURITY ENHANCEMENT: Input validation
    if (!this.validateChatRoomId(chatRoomId)) {
      this.logSecurityEvent(userId, `Invalid chat room ID format: ${chatRoomId}`)
      throw new AuthorizationError('Invalid chat room identifier')
    }

    // SECURITY ENHANCEMENT: Rate limiting
    if (!this.checkRateLimit(userId, 'room_operations', ROOM_OPERATION_LIMIT)) {
      throw new RateLimitError('Too many room operations. Please wait before trying again.')
    }

    // SECURITY ENHANCEMENT: Verify user was actually in the room
    const rooms = Array.from(socket.rooms)
    if (!rooms.includes(`room:${chatRoomId}`)) {
      this.logSecurityEvent(userId, `Leave attempt for non-joined room: ${chatRoomId}`)
      throw new AuthorizationError('You are not in this chat room')
    }

    // Leave the Socket.IO room
    socket.leave(`room:${chatRoomId}`)
    
    // SECURITY ENHANCEMENT: Minimal broadcast information
    socket.to(`room:${chatRoomId}`).emit('user_left', {
      chatRoomId,
      timestamp: new Date().toISOString()
    })

    // Send confirmation to user
    socket.emit('left_room', { chatRoomId })
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: SendMessageData): Promise<void> {
    const { chatRoomId, content, type = MessageType.TEXT, messageId } = data
    const userId = socket.userId!

    // SECURITY ENHANCEMENT: Comprehensive input validation
    if (!this.validateChatRoomId(chatRoomId)) {
      this.logSecurityEvent(userId, `Invalid chat room ID in message: ${chatRoomId}`)
      throw new AuthorizationError('Invalid chat room identifier')
    }

    if (!this.validateMessageContent(content)) {
      this.logSecurityEvent(userId, 'Invalid message content detected')
      throw new AuthorizationError('Invalid message content')
    }

    // SECURITY ENHANCEMENT: Message deduplication
    if (messageId) {
      const dedupKey = `${userId}:${messageId}`
      if (processedMessages.has(dedupKey)) {
        return // Silently ignore duplicate messages
      }
      processedMessages.add(dedupKey)
      
      // Clean up old message IDs (keep last 1000 per user)
      if (processedMessages.size > 10000) {
        const entries = Array.from(processedMessages)
        entries.slice(0, 5000).forEach(id => processedMessages.delete(id))
      }
    }

    // SECURITY ENHANCEMENT: Rate limiting for messages
    if (!this.checkRateLimit(userId, 'messages', MESSAGE_LIMIT)) {
      throw new RateLimitError('Message rate limit exceeded. Please wait before sending more messages.')
    }

    // SECURITY ENHANCEMENT: Verify membership before sending message
    const canSend = await this.revalidateMembership(chatRoomId, userId)
    if (!canSend) {
      this.logSecurityEvent(userId, `Unauthorized message attempt for room: ${chatRoomId}`)
      throw new AuthorizationError('You are not authorized to send messages to this chat room')
    }

    // Create message through service (includes all validations)
    const messageResponse = await this.chatService.sendMessage({
      chatRoomId,
      authorId: userId,
      content,
      type
    })

    // Broadcast message to all room members
    this.io.to(`room:${chatRoomId}`).emit('new_message', {
      message: messageResponse.message,
      chatRoom: messageResponse.chatRoom
    })

    // Get users who are currently active in the room using our improved helper method
    const activeUserIds = await this.getUsersActiveInRoom(chatRoomId)
    
    // For active users, update their last read timestamp automatically
    for (const activeUserId of activeUserIds) {
      if (activeUserId !== userId) { // Skip the sender as their last read is already updated
        try {
          await this.chatService.updateLastRead(chatRoomId, activeUserId)
        } catch (error) {
          console.error(`Failed to update last read for active user ${activeUserId}:`, error)
        }
      }
    }

    // SECURITY ENHANCEMENT: Revalidate membership before sending unread counts
    const roomMembers = await this.chatService.getChatRoomMembers(chatRoomId)
    for (const member of roomMembers) {
      // Only send unread counts to users who:
      // 1. Are not the message sender AND
      // 2. Are not currently active in the room
      if (member.userId !== userId && !activeUserIds.has(member.userId)) {
        // Double-check membership before sending notification
        const isStillMember = await this.revalidateMembership(chatRoomId, member.userId)
        if (isStillMember) {
          this.io.to(`user:${member.userId}`).emit('unread_count_updated', {
            chatRoomId,
            unreadCount: await this.chatService.getUnreadCount(chatRoomId, member.userId)
          })
        }
      }
    }
  }

  private async handleTyping(socket: AuthenticatedSocket, data: TypingData): Promise<void> {
    const { chatRoomId, isTyping } = data
    const userId = socket.userId!

    // SECURITY ENHANCEMENT: Input validation
    if (!this.validateChatRoomId(chatRoomId)) {
      this.logSecurityEvent(userId, `Invalid chat room ID in typing: ${chatRoomId}`)
      throw new AuthorizationError('Invalid chat room identifier')
    }

    // SECURITY ENHANCEMENT: Rate limiting for typing events
    if (!this.checkRateLimit(userId, 'typing', TYPING_LIMIT)) {
      throw new RateLimitError('Typing rate limit exceeded')
    }

    // SECURITY ENHANCEMENT: Revalidate membership
    const canType = await this.revalidateMembership(chatRoomId, userId)
    if (!canType) {
      this.logSecurityEvent(userId, `Unauthorized typing attempt for room: ${chatRoomId}`)
      throw new AuthorizationError('You are not a member of this chat room')
    }

    // Broadcast typing status to other room members (not to sender)
    socket.to(`room:${chatRoomId}`).emit('typing_status', {
      chatRoomId,
      isTyping,
      timestamp: new Date().toISOString()
    })
  }

  // SECURITY ENHANCEMENT: Cleanup routine for security data
  private startSecurityCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      
      // Clean up expired sessions
      for (const [sessionId, session] of activeSessions.entries()) {
        if (now - session.createdAt > SESSION_TIMEOUT) {
          activeSessions.delete(sessionId)
        }
      }
      
      // Clean up old rate limit entries
      for (const [key, limit] of rateLimits.entries()) {
        if (now > limit.resetTime + 60000) { // 1 minute after reset
          rateLimits.delete(key)
        }
      }
      
      // Clean up old security events
      for (const [key, events] of securityEvents.entries()) {
        if (now - events.lastReset > 24 * 60 * 60 * 1000) { // 24 hours
          securityEvents.delete(key)
        }
      }
    }, 5 * 60 * 1000) // Run every 5 minutes
  }

  // Enhanced error handling with security logging
  private emitStructuredError(socket: Socket, error: unknown, eventType: string): void {
    const authenticatedSocket = socket as AuthenticatedSocket
    const userId = authenticatedSocket.userId || 'unknown'
    
    console.error(`Socket error (${eventType}) for user ${userId}:`, error)

    if (error instanceof RateLimitError || error instanceof AuthenticationError || error instanceof AuthorizationError) {
      this.logSecurityEvent(userId, `${eventType}: ${error.message}`)
      
      socket.emit('error', {
        type: eventType,
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      })
    } else if (error instanceof Error) {
      socket.emit('error', {
        type: eventType,
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        timestamp: new Date().toISOString()
      })
    } else {
      socket.emit('error', {
        type: eventType,
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Public notification method (unchanged but validated)
  public sendNotification(userId: string, notification: any): void {
    // Validate that this is a secure operation
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId provided to sendNotification')
      return
    }
    
    this.io.to(`user:${userId}`).emit('notification', notification)
  }

  // Public room size method (unchanged)
  public async getRoomSize(chatRoomId: string): Promise<number> {
    if (!this.validateChatRoomId(chatRoomId)) {
      return 0
    }
    
    const room = this.io.sockets.adapter.rooms.get(`room:${chatRoomId}`)
    return room ? room.size : 0
  }

  // SECURITY ENHANCEMENT: Get security statistics for monitoring
  public getSecurityStats(): {
    activeSessions: number;
    rateLimitedUsers: number;
    securityEvents: number;
  } {
    return {
      activeSessions: activeSessions.size,
      rateLimitedUsers: rateLimits.size,
      securityEvents: securityEvents.size
    }
  }

  // SECURITY ENHANCEMENT: Force disconnect user (for admin use)
  public forceDisconnectUser(userId: string, reason: string): void {
    this.logSecurityEvent(userId, `Force disconnect: ${reason}`)
    
    // Find and disconnect all sockets for this user
    this.io.to(`user:${userId}`).disconnectSockets(true)
    
    // Clean up their sessions
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.userId === userId) {
        activeSessions.delete(sessionId)
      }
    }
  }

  // Helper method to check if a user is currently active in a room
  private async getUsersActiveInRoom(roomId: string): Promise<Set<string>> {
    const roomName = `room:${roomId}`
    const activeUserIds = new Set<string>()
    
    try {
      const socketsInRoom = await this.io.in(roomName).fetchSockets()
      
      for (const socket of socketsInRoom) {
        // Accessing handshake data which contains authentication information
        const userId = socket.handshake?.auth?.userId || 
                       (socket.data && socket.data.userId) ||
                       socket.handshake?.query?.userId;
                       
        if (userId && typeof userId === 'string') {
          activeUserIds.add(userId)
        } else {
          // Try to find the userId from our activeSessions map
          const authenticatedSocket = socket as any
          if (authenticatedSocket.sessionId) {
            const session = activeSessions.get(authenticatedSocket.sessionId)
            if (session && session.userId) {
              activeUserIds.add(session.userId)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error getting active users in room ${roomId}:`, error)
    }
    
    return activeUserIds
  }
}