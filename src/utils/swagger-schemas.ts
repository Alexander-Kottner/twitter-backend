/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         name:
 *           type: string
 *           description: Nombre completo del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario único
 *         bio:
 *           type: string
 *           nullable: true
 *           description: Biografía del usuario
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           description: URL de la imagen de perfil
 *         isPrivate:
 *           type: boolean
 *           description: Indica si el perfil es privado
 *         followersCount:
 *           type: integer
 *           description: Número de seguidores
 *         followingCount:
 *           type: integer
 *           description: Número de usuarios seguidos
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del usuario
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del post
 *         content:
 *           type: string
 *           description: Contenido del post
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs de las imágenes asociadas al post
 *         authorId:
 *           type: string
 *           description: ID del autor del post
 *         author:
 *           $ref: '#/components/schemas/User'
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: ID del post padre en caso de ser un comentario
 *         likesCount:
 *           type: integer
 *           description: Número de likes
 *         retweetsCount:
 *           type: integer
 *           description: Número de retweets
 *         commentsCount:
 *           type: integer
 *           description: Número de comentarios
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del post
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *
 *     Reaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único de la reacción
 *         type:
 *           type: string
 *           enum: [LIKE, RETWEET]
 *           description: Tipo de reacción (like o retweet)
 *         userId:
 *           type: string
 *           description: ID del usuario que realizó la reacción
 *         postId:
 *           type: string
 *           description: ID del post al que se reaccionó
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación de la reacción
 *
 *     Follow:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único de la relación de seguimiento
 *         followerId:
 *           type: string
 *           description: ID del usuario seguidor
 *         followingId:
 *           type: string
 *           description: ID del usuario seguido
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del seguimiento
 *
 *     ChatRoom:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del chat room
 *         name:
 *           type: string
 *           nullable: true
 *           maxLength: 100
 *           description: Nombre del chat (solo para chats grupales)
 *         type:
 *           type: string
 *           enum: [DM, GROUP]
 *           description: Tipo de chat (DM para mensajes directos, GROUP para grupos)
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatRoomMember'
 *           description: Lista de miembros del chat
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *           nullable: true
 *           description: Último mensaje enviado en el chat
 *         unreadCount:
 *           type: integer
 *           description: Número de mensajes no leídos para el usuario actual
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del chat
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *
 *     ChatRoomMember:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único de la membresía
 *         chatRoomId:
 *           type: string
 *           format: uuid
 *           description: ID del chat room
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID del usuario miembro
 *         user:
 *           $ref: '#/components/schemas/User'
 *           description: Información del usuario miembro
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha en que se unió al chat
 *         lastReadAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha del último mensaje leído
 *
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del mensaje
 *         chatRoomId:
 *           type: string
 *           format: uuid
 *           description: ID del chat room donde se envió el mensaje
 *         authorId:
 *           type: string
 *           format: uuid
 *           description: ID del autor del mensaje
 *         author:
 *           $ref: '#/components/schemas/User'
 *           description: Información del autor del mensaje
 *         content:
 *           type: string
 *           maxLength: 1000
 *           description: Contenido del mensaje (desencriptado)
 *         type:
 *           type: string
 *           enum: [TEXT, IMAGE, FILE]
 *           description: Tipo de mensaje
 *         isEncrypted:
 *           type: boolean
 *           description: Indica si el mensaje está encriptado en la base de datos
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del mensaje
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           $ref: '#/components/schemas/Message'
 *         chatRoom:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               nullable: true
 *             type:
 *               type: string
 *               enum: [DM, GROUP]
 *
 *     CreateDMRequest:
 *       type: object
 *       required:
 *         - targetUserId
 *       properties:
 *         targetUserId:
 *           type: string
 *           format: uuid
 *           description: ID del usuario con quien crear el DM
 *
 *     CreateGroupChatRequest:
 *       type: object
 *       required:
 *         - memberIds
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nombre del grupo (opcional)
 *         memberIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Lista de IDs de usuarios para agregar al grupo
 *
 *     SendMessageRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           description: Contenido del mensaje
 *         type:
 *           type: string
 *           enum: [TEXT, IMAGE, FILE]
 *           default: TEXT
 *           description: Tipo de mensaje
 *
 *     ChatError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: Código de error específico
 *             message:
 *               type: string
 *               description: Mensaje de error
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: Timestamp del error
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Mensaje de error
 *         statusCode:
 *           type: integer
 *           description: Código de estado HTTP
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Token JWT para autenticación
 *
 * tags:
 *   - name: Chat
 *     description: Endpoints para gestión de chats y mensajería en tiempo real
 *   - name: Messages
 *     description: Endpoints para gestión de mensajes
 *   - name: Users
 *     description: Gestión de usuarios
 *   - name: Posts
 *     description: Gestión de posts y contenido
 *   - name: Reactions
 *     description: Gestión de reacciones (likes, retweets)
 *   - name: Followers
 *     description: Gestión de seguimientos entre usuarios
 */