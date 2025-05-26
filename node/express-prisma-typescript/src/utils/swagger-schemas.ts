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
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Mensaje de error
 *         statusCode:
 *           type: integer
 *           description: Código de estado HTTP
 */ 