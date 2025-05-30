import { Request, Response, Router, NextFunction } from 'express'
import { body, param, query, validationResult } from 'express-validator'

import { ChatService } from '../service/chat.service'
import { CreateChatRoomDTO, ChatRoomType, MessageType } from '../dto'
import { CreateMessageDTO } from '../dto/message.dto'
import { withAuth } from '@utils'
import { ChatError, ValidationError, AuthorizationError, NotFoundError } from '../dto/errors.dto'

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  next()
}

export class ChatController {
  constructor (private readonly chatService: ChatService) {}

  /**
   * @swagger
   * /chat/rooms:
   *   get:
   *     summary: Obtener todas las salas de chat del usuario
   *     description: Retorna todas las salas de chat donde el usuario es miembro, incluyendo DMs y grupos, con información del último mensaje y contador de no leídos
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de salas de chat del usuario
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ChatRoom'
   *             example:
   *               - id: "550e8400-e29b-41d4-a716-446655440000"
   *                 name: null
   *                 type: "DM"
   *                 members:
   *                   - userId: "550e8400-e29b-41d4-a716-446655440001"
   *                     user:
   *                       id: "550e8400-e29b-41d4-a716-446655440001"
   *                       username: "john_doe"
   *                       name: "John Doe"
   *                       profilePicture: "https://example.com/avatar.jpg"
   *                 lastMessage:
   *                   id: "550e8400-e29b-41d4-a716-446655440002"
   *                   content: "Hola, ¿cómo estás?"
   *                   type: "TEXT"
   *                   createdAt: "2025-05-30T10:30:00Z"
   *                 unreadCount: 2
   *                 createdAt: "2025-05-30T10:00:00Z"
   *               - id: "550e8400-e29b-41d4-a716-446655440003"
   *                 name: "Grupo de trabajo"
   *                 type: "GROUP"
   *                 members:
   *                   - userId: "550e8400-e29b-41d4-a716-446655440004"
   *                   - userId: "550e8400-e29b-41d4-a716-446655440005"
   *                 unreadCount: 0
   *       401:
   *         description: Token de autenticación inválido o faltante
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   */
  getChatRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = res.locals.context.userId
      const chatRooms = await this.chatService.getUserChatRooms(userId)
      res.json(chatRooms)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  /**
   * @swagger
   * /chat/rooms/dm:
   *   post:
   *     summary: Crear o obtener un chat directo (DM)
   *     description: Crea un nuevo chat directo entre dos usuarios o retorna el existente si ya existe. Incluye encriptación automática de mensajes si está configurada.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDMRequest'
   *           example:
   *             targetUserId: "550e8400-e29b-41d4-a716-446655440001"
   *     responses:
   *       200:
   *         description: Chat directo creado o existente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatRoom'
   *             example:
   *               id: "550e8400-e29b-41d4-a716-446655440000"
   *               name: null
   *               type: "DM"
   *               members:
   *                 - userId: "550e8400-e29b-41d4-a716-446655440001"
   *                   user:
   *                     id: "550e8400-e29b-41d4-a716-446655440001"
   *                     username: "john_doe"
   *                     name: "John Doe"
   *               createdAt: "2025-05-30T10:00:00Z"
   *       400:
   *         description: Datos de entrada inválidos o intento de crear DM consigo mismo
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *             examples:
   *               invalidUserId:
   *                 summary: ID de usuario inválido
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Valid target user ID required"
   *               selfDM:
   *                 summary: Intento de DM consigo mismo
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Cannot create DM with yourself"
   *       401:
   *         description: Token de autenticación inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       404:
   *         description: Usuario objetivo no encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   */
  createOrGetDM = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.body
      const userId = res.locals.context.userId

      if (userId === targetUserId) {
        throw new ValidationError('Cannot create DM with yourself')
      }

      const chatRoom = await this.chatService.findOrCreateDMChatRoom(userId, targetUserId)
      res.json(chatRoom)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  /**
   * @swagger
   * /chat/rooms/group:
   *   post:
   *     summary: Crear un chat grupal
   *     description: Crea un nuevo chat grupal con los miembros especificados. El creador se incluye automáticamente como miembro.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateGroupChatRequest'
   *           example:
   *             name: "Equipo de desarrollo"
   *             memberIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
   *     responses:
   *       201:
   *         description: Chat grupal creado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatRoom'
   *             example:
   *               id: "550e8400-e29b-41d4-a716-446655440003"
   *               name: "Equipo de desarrollo"
   *               type: "GROUP"
   *               members:
   *                 - userId: "550e8400-e29b-41d4-a716-446655440000"
   *                   user:
   *                     id: "550e8400-e29b-41d4-a716-446655440000"
   *                     username: "creator_user"
   *                     name: "Creator User"
   *                 - userId: "550e8400-e29b-41d4-a716-446655440001"
   *                   user:
   *                     id: "550e8400-e29b-41d4-a716-446655440001"
   *                     username: "member_one"
   *                     name: "Member One"
   *               createdAt: "2025-05-30T10:00:00Z"
   *       400:
   *         description: Datos de entrada inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *             examples:
   *               invalidMemberIds:
   *                 summary: IDs de miembros inválidos
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Each member ID must be a valid UUID"
   *               emptyMemberList:
   *                 summary: Lista de miembros vacía
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Member IDs must be an array"
   *       401:
   *         description: Token de autenticación inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   */
  createGroupChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, memberIds } = req.body
      const userId = res.locals.context.userId

      const createData = new CreateChatRoomDTO({
        name,
        type: ChatRoomType.GROUP,
        memberIds: [...memberIds, userId] // Ensure creator is included
      })

      const chatRoom = await this.chatService.createChatRoom(createData, userId)
      res.json(chatRoom)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  /**
   * @swagger
   * /chat/rooms/{chatRoomId}:
   *   get:
   *     summary: Obtener detalles de una sala de chat
   *     description: Retorna los detalles y miembros de una sala de chat específica. Solo accesible para miembros del chat.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: chatRoomId
   *         required: true
   *         description: ID único de la sala de chat
   *         schema:
   *           type: string
   *           format: uuid
   *         example: "550e8400-e29b-41d4-a716-446655440000"
   *     responses:
   *       200:
   *         description: Detalles de la sala de chat
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 members:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ChatRoomMember'
   *             example:
   *               members:
   *                 - id: "550e8400-e29b-41d4-a716-446655440010"
   *                   userId: "550e8400-e29b-41d4-a716-446655440001"
   *                   user:
   *                     id: "550e8400-e29b-41d4-a716-446655440001"
   *                     username: "john_doe"
   *                     name: "John Doe"
   *                     profilePicture: "https://example.com/avatar1.jpg"
   *                   joinedAt: "2025-05-30T10:00:00Z"
   *                   lastReadAt: "2025-05-30T11:30:00Z"
   *       400:
   *         description: ID de sala de chat inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       401:
   *         description: Token de autenticación inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       403:
   *         description: No es miembro de esta sala de chat
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *             example:
   *               error:
   *                 code: "ACCESS_DENIED"
   *                 message: "Not a member of this chat room"
   *                 timestamp: "2025-05-30T12:00:00Z"
   *       404:
   *         description: Sala de chat no encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   */
  getChatRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params
      const userId = res.locals.context.userId

      // Validate membership through service
      const isValid = await this.chatService.validateChatRoomMembership(chatRoomId, userId)
      if (!isValid) {
        throw new AuthorizationError('Not a member of this chat room')
      }

      // CRITICAL FIX: Pass userId to getChatRoomMembers
      const members = await this.chatService.getChatRoomMembers(chatRoomId, userId)
      res.json({ members })
    } catch (error) {
      this.handleError(error, res)
    }
  }

  /**
   * @swagger
   * /chat/rooms/{chatRoomId}/messages:
   *   get:
   *     summary: Obtener mensajes de una sala de chat
   *     description: Retorna los mensajes de una sala de chat con paginación. Los mensajes se desencriptan automáticamente si están encriptados. Actualiza automáticamente el timestamp de última lectura.
   *     tags: [Messages]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: chatRoomId
   *         required: true
   *         description: ID único de la sala de chat
   *         schema:
   *           type: string
   *           format: uuid
   *         example: "550e8400-e29b-41d4-a716-446655440000"
   *       - in: query
   *         name: limit
   *         description: Número máximo de mensajes a retornar (1-100)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         example: 20
   *       - in: query
   *         name: cursor
   *         description: ID del último mensaje para paginación
   *         schema:
   *           type: string
   *           format: uuid
   *         example: "550e8400-e29b-41d4-a716-446655440010"
   *     responses:
   *       200:
   *         description: Lista de mensajes de la sala de chat
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Message'
   *             example:
   *               - id: "550e8400-e29b-41d4-a716-446655440010"
   *                 chatRoomId: "550e8400-e29b-41d4-a716-446655440000"
   *                 authorId: "550e8400-e29b-41d4-a716-446655440001"
   *                 author:
   *                   id: "550e8400-e29b-41d4-a716-446655440001"
   *                   username: "john_doe"
   *                   name: "John Doe"
   *                   profilePicture: "https://example.com/avatar.jpg"
   *                 content: "¡Hola a todos!"
   *                 type: "TEXT"
   *                 isEncrypted: true
   *                 createdAt: "2025-05-30T10:30:00Z"
   *                 updatedAt: "2025-05-30T10:30:00Z"
   *               - id: "550e8400-e29b-41d4-a716-446655440011"
   *                 chatRoomId: "550e8400-e29b-41d4-a716-446655440000"
   *                 authorId: "550e8400-e29b-41d4-a716-446655440002"
   *                 author:
   *                   id: "550e8400-e29b-41d4-a716-446655440002"
   *                   username: "jane_smith"
   *                   name: "Jane Smith"
   *                 content: "¿Cómo están?"
   *                 type: "TEXT"
   *                 isEncrypted: true
   *                 createdAt: "2025-05-30T10:32:00Z"
   *       400:
   *         description: Parámetros de consulta inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       401:
   *         description: Token de autenticación inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       403:
   *         description: No es miembro de esta sala de chat
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       404:
   *         description: Sala de chat no encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *   post:
   *     summary: Enviar un mensaje
   *     description: Envía un nuevo mensaje a una sala de chat (alternativa REST a Socket.IO). El mensaje se encripta automáticamente si la encriptación está habilitada. Para mensajería en tiempo real, usar Socket.IO.
   *     tags: [Messages]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: chatRoomId
   *         required: true
   *         description: ID único de la sala de chat
   *         schema:
   *           type: string
   *           format: uuid
   *         example: "550e8400-e29b-41d4-a716-446655440000"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SendMessageRequest'
   *           example:
   *             content: "¡Hola! Este es un mensaje de prueba."
   *             type: "TEXT"
   *     responses:
   *       201:
   *         description: Mensaje enviado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *             example:
   *               message:
   *                 id: "550e8400-e29b-41d4-a716-446655440012"
   *                 chatRoomId: "550e8400-e29b-41d4-a716-446655440000"
   *                 authorId: "550e8400-e29b-41d4-a716-446655440001"
   *                 author:
   *                   id: "550e8400-e29b-41d4-a716-446655440001"
   *                   username: "john_doe"
   *                   name: "John Doe"
   *                 content: "¡Hola! Este es un mensaje de prueba."
   *                 type: "TEXT"
   *                 isEncrypted: true
   *                 createdAt: "2025-05-30T12:00:00Z"
   *               chatRoom:
   *                 id: "550e8400-e29b-41d4-a716-446655440000"
   *                 name: null
   *                 type: "DM"
   *       400:
   *         description: Datos de mensaje inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *             examples:
   *               emptyContent:
   *                 summary: Contenido vacío
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Content must be 1-1000 characters"
   *               tooLong:
   *                 summary: Contenido demasiado largo
   *                 value:
   *                   error:
   *                     code: "VALIDATION_ERROR"
   *                     message: "Content must be 1-1000 characters"
   *       401:
   *         description: Token de autenticación inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       403:
   *         description: No autorizado para enviar mensajes en esta sala
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   *       404:
   *         description: Sala de chat no encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatError'
   */
  getChatRoomMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params
      const { limit = 50, cursor } = req.query
      const userId = res.locals.context.userId

      const messages = await this.chatService.getChatRoomMessages(
        chatRoomId,
        userId,
        parseInt(limit as string),
        cursor as string
      )
      res.json(messages)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // Send message (REST endpoint - real-time handled by Socket.IO)
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatRoomId } = req.params
      const { content, type = MessageType.TEXT } = req.body
      const userId = res.locals.context.userId

      const createData = new CreateMessageDTO({
        chatRoomId,
        authorId: userId,
        content,
        type
      })

      const messageResponse = await this.chatService.sendMessage(createData)
      res.json(messageResponse)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // STRUCTURED ERROR HANDLING: Centralized error handler
  private handleError(error: unknown, res: Response): void {
    console.error('Chat controller error:', error)

    if (error instanceof ChatError) {
      // Handle custom chat errors with proper status codes
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      })
    } else if (error instanceof Error) {
      // Handle generic errors with sanitized messages
      const sanitizedMessage = this.sanitizeErrorMessage(error.message)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: sanitizedMessage,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      // Handle unknown errors
      res.status(500).json({
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  // SECURITY FIX: Sanitize error messages to prevent information disclosure
  private sanitizeErrorMessage(message: string): string {
    const sensitivePatterns = [
      /database\s+error/i,
      /connection\s+failed/i,
      /prisma/i,
      /postgresql/i,
      /sql/i,
      /internal\s+server/i
    ]

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'A server error occurred. Please try again later.'
      }
    }

    return message
  }

  static routes (chatService: ChatService): Router {
    const router = Router()
    const controller = new ChatController(chatService)

    // All chat routes require authentication
    router.use(withAuth)

    // Get user's chat rooms
    router.get('/rooms', controller.getChatRooms)

    // Create or get DM
    router.post('/rooms/dm', [
      body('targetUserId').isUUID().withMessage('Valid target user ID required')
    ], validate, controller.createOrGetDM)

    // Create group chat
    router.post('/rooms/group', [
      body('name').optional().isString().withMessage('Name must be a string'),
      body('memberIds').isArray().withMessage('Member IDs must be an array'),
      body('memberIds.*').isUUID().withMessage('Each member ID must be a valid UUID')
    ], validate, controller.createGroupChat)

    // Get chat room details
    router.get('/rooms/:chatRoomId', [
      param('chatRoomId').isUUID().withMessage('Valid chat room ID required')
    ], validate, controller.getChatRoom)

    // Get chat room messages
    router.get('/rooms/:chatRoomId/messages', [
      param('chatRoomId').isUUID().withMessage('Valid chat room ID required'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('cursor').optional().isUUID().withMessage('Cursor must be a valid UUID')
    ], validate, controller.getChatRoomMessages)

    // Send message (REST fallback)
    router.post('/rooms/:chatRoomId/messages', [
      param('chatRoomId').isUUID().withMessage('Valid chat room ID required'),
      body('content').isString().isLength({ min: 1, max: 1000 }).withMessage('Content must be 1-1000 characters'),
      body('type').optional().isIn(['TEXT', 'IMAGE', 'FILE']).withMessage('Invalid message type')
    ], validate, controller.sendMessage)

    return router
  }
}