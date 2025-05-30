import { MessageRepository } from '../repository/message.repository'
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository'
import { CreateMessageDTO, MessageDTO, MessageResponseDTO, GetMessagesDTO } from '../dto/message.dto'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import crypto from 'crypto'

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_DERIVATION_ITERATIONS = 100000
const IV_LENGTH = 16
const TAG_LENGTH = 16

export class MessageService {
  constructor (
    private readonly messageRepository: MessageRepository,
    private readonly chatRoomMemberRepository: ChatRoomMemberRepository
  ) {
    // Validate encryption key is configured
    if (!process.env.MESSAGE_ENCRYPTION_KEY) {
      console.warn('MESSAGE_ENCRYPTION_KEY not configured - messages will not be encrypted')
    }
  }

  // ENCRYPTION: Encrypt message content
  private encryptMessage(content: string, chatRoomId: string): { encryptedContent: string; iv: string; tag: string } {
    if (!process.env.MESSAGE_ENCRYPTION_KEY) {
      throw new Error('Message encryption not configured')
    }

    try {
      // Derive room-specific encryption key
      const key = this.deriveRoomKey(chatRoomId)
      
      // Generate random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH)
      
      // Create cipher with correct method for GCM
      const cipher = crypto.createCipher('aes-256-gcm', key)
      cipher.setAAD(Buffer.from(chatRoomId)) // Additional authenticated data
      
      // Encrypt content
      let encrypted = cipher.update(content, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Get authentication tag
      const tag = cipher.getAuthTag()
      
      return {
        encryptedContent: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      console.error('Message encryption failed:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  // ENCRYPTION: Decrypt message content
  private decryptMessage(encryptedContent: string, iv: string, tag: string, chatRoomId: string): string {
    if (!process.env.MESSAGE_ENCRYPTION_KEY) {
      throw new Error('Message encryption not configured')
    }

    try {
      // Derive room-specific encryption key
      const key = this.deriveRoomKey(chatRoomId)
      
      // Create decipher with correct method for GCM
      const decipher = crypto.createDecipher('aes-256-gcm', key)
      decipher.setAAD(Buffer.from(chatRoomId)) // Additional authenticated data
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      // Decrypt content
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Message decryption failed:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  // ENCRYPTION: Derive chat room specific encryption key
  private deriveRoomKey(chatRoomId: string): Buffer {
    const masterKey = process.env.MESSAGE_ENCRYPTION_KEY!
    const salt = Buffer.from(chatRoomId + 'chat_encryption_salt')
    
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      KEY_DERIVATION_ITERATIONS,
      32, // 256 bits for AES-256
      'sha256'
    )
  }

  // ENCRYPTION: Check if message should be encrypted
  private shouldEncryptMessage(): boolean {
    return Boolean(process.env.MESSAGE_ENCRYPTION_KEY)
  }

  async createMessage (data: CreateMessageDTO): Promise<MessageResponseDTO> {
    // Validate that the author is a member of the chat room
    await this.validateMembership(data.chatRoomId, data.authorId)

    // SECURITY: Sanitize message content to prevent XSS
    const sanitizedContent = this.sanitizeContent(data.content)
    
    let finalData = {
      ...data,
      content: sanitizedContent
    }

    // ENCRYPTION: Encrypt message if encryption is enabled
    if (this.shouldEncryptMessage()) {
      const { encryptedContent, iv, tag } = this.encryptMessage(sanitizedContent, data.chatRoomId)
      finalData = {
        ...finalData,
        content: encryptedContent,
        iv,
        tag,
        isEncrypted: true
      }
    }
    
    const message = await this.messageRepository.create(finalData)

    // ENCRYPTION: Decrypt message for response if it was encrypted
    if (message.isEncrypted && message.iv && message.tag) {
      message.content = this.decryptMessage(message.content, message.iv, message.tag, data.chatRoomId)
    }

    // Update author's last read timestamp
    await this.chatRoomMemberRepository.updateLastRead({
      chatRoomId: data.chatRoomId,
      userId: data.authorId,
      lastReadAt: new Date()
    })

    // Return message with chat room info for Socket.IO broadcasting
    return new MessageResponseDTO({
      message,
      chatRoom: {
        id: data.chatRoomId,
        name: undefined, // Will be populated from actual chat room data
        type: 'DM' // Will be populated from actual chat room data
      }
    })
  }

  async getMessage (id: string, userId: string): Promise<MessageDTO | null> {
    const message = await this.messageRepository.findById(id)
    if (!message) return null

    // Validate that the user is a member of the chat room
    await this.validateMembership(message.chatRoomId, userId)

    // ENCRYPTION: Decrypt message if it's encrypted
    if (message.isEncrypted && message.iv && message.tag) {
      try {
        message.content = this.decryptMessage(message.content, message.iv, message.tag, message.chatRoomId)
      } catch (error) {
        console.error('Failed to decrypt message for user:', userId, error)
        message.content = '[Message could not be decrypted]'
      }
    }

    return message
  }

  async getChatRoomMessages (data: GetMessagesDTO, userId: string): Promise<MessageDTO[]> {
    // Validate that the user is a member of the chat room
    await this.validateMembership(data.chatRoomId, userId)

    // Update user's last read timestamp
    await this.chatRoomMemberRepository.updateLastRead({
      chatRoomId: data.chatRoomId,
      userId,
      lastReadAt: new Date()
    })

    const messages = await this.messageRepository.findByChatRoomId(
      data.chatRoomId,
      data.limit,
      data.cursor
    )

    // ENCRYPTION: Decrypt all encrypted messages
    return messages.map(message => {
      if (message.isEncrypted && message.iv && message.tag) {
        try {
          message.content = this.decryptMessage(message.content, message.iv, message.tag, data.chatRoomId)
        } catch (error) {
          console.error('Failed to decrypt message:', message.id, error)
          message.content = '[Message could not be decrypted]'
        }
      }
      return message
    })
  }

  async updateMessage (id: string, content: string, userId: string): Promise<MessageDTO> {
    const message = await this.messageRepository.findById(id)
    if (!message) {
      throw new Error('Message not found')
    }

    // Validate that the user is the author of the message
    await this.validateMessageAuthor(id, userId)

    // SECURITY: Sanitize updated content
    const sanitizedContent = this.sanitizeContent(content)

    let updateData: any = { content: sanitizedContent }

    // ENCRYPTION: Encrypt updated content if encryption is enabled
    if (this.shouldEncryptMessage()) {
      const { encryptedContent, iv, tag } = this.encryptMessage(sanitizedContent, message.chatRoomId)
      updateData = {
        content: encryptedContent,
        iv,
        tag,
        isEncrypted: true
      }
    }

    const updatedMessage = await this.messageRepository.update(id, updateData)

    // ENCRYPTION: Decrypt for response if encrypted
    if (updatedMessage.isEncrypted && updatedMessage.iv && updatedMessage.tag) {
      updatedMessage.content = this.decryptMessage(
        updatedMessage.content, 
        updatedMessage.iv, 
        updatedMessage.tag, 
        updatedMessage.chatRoomId
      )
    }

    return updatedMessage
  }

  // SECURITY FIX: Content sanitization method
  private sanitizeContent(content: string): string {
    // Configure DOMPurify to allow only safe HTML tags and attributes
    const cleanContent = purify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      FORCE_BODY: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true
    })

    // Additional validation for message length
    if (cleanContent.length > 1000) {
      throw new Error('Message content exceeds maximum length')
    }

    if (cleanContent.trim().length === 0) {
      throw new Error('Message content cannot be empty')
    }

    return cleanContent
  }

  private async validateMembership (chatRoomId: string, userId: string): Promise<void> {
    const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId)
    if (!isMember) {
      throw new Error('User is not a member of this chat room')
    }
  }

  private async validateMessageAuthor (messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findById(messageId)
    if (!message || message.authorId !== userId) {
      throw new Error('User is not the author of this message')
    }
  }
}