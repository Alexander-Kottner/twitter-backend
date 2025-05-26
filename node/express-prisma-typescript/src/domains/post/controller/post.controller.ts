import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express, don't forget import it in your new controllers
import 'express-async-errors'

import { db, BodyValidation } from '@utils'

import { PostRepositoryImpl } from '../repository'
import { PostService, PostServiceImpl } from '../service'
import { CreatePostInputDTO, UpdatePostImagesDTO } from '../dto'

export const postRouter = Router()

// Use dependency injection
const service: PostService = new PostServiceImpl(new PostRepositoryImpl(db))

/**
 * @swagger
 * /post:
 *   get:
 *     summary: Obtener posts recientes
 *     description: Devuelve los posts más recientes con paginación basada en cursores
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número máximo de posts a devolver
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Cursor para paginación (ID del post antes del cual obtener resultados)
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *         description: Cursor para paginación (ID del post después del cual obtener resultados)
 *     responses:
 *       200:
 *         description: Lista de posts recientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 */
postRouter.get('/', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { limit, before, after } = req.query as Record<string, string>

  const posts = await service.getLatestPosts(userId, { limit: Number(limit), before, after })

  return res.status(HttpStatus.OK).json(posts)
})

/**
 * @swagger
 * /post/{postId}:
 *   get:
 *     summary: Obtener un post específico
 *     description: Devuelve los detalles de un post específico por su ID
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post a obtener
 *     responses:
 *       200:
 *         description: Detalles del post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 */
postRouter.get('/:postId', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params

  const post = await service.getPost(userId, postId)

  return res.status(HttpStatus.OK).json(post)
})

/**
 * @swagger
 * /post/by_user/{userId}:
 *   get:
 *     summary: Obtener posts de un usuario
 *     description: Devuelve todos los posts publicados por un usuario específico
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario autor de los posts
 *     responses:
 *       200:
 *         description: Lista de posts del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 */
postRouter.get('/by_user/:userId', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { userId: authorId } = req.params

  const posts = await service.getPostsByAuthor(userId, authorId)

  return res.status(HttpStatus.OK).json(posts)
})

/**
 * @swagger
 * /post:
 *   post:
 *     summary: Crear un nuevo post
 *     description: Publica un nuevo post en la plataforma
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenido textual del post
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs de las imágenes del post
 *     responses:
 *       201:
 *         description: Post creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
postRouter.post('/', BodyValidation(CreatePostInputDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const data = req.body

  const post = await service.createPost(userId, data)

  return res.status(HttpStatus.CREATED).json(post)
})

/**
 * @swagger
 * /post/{postId}:
 *   delete:
 *     summary: Eliminar un post
 *     description: Elimina un post específico (solo el autor puede eliminar sus propios posts)
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post a eliminar
 *     responses:
 *       200:
 *         description: Post eliminado correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - No eres el autor del post
 *       404:
 *         description: Post no encontrado
 */
postRouter.delete('/:postId', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params

  await service.deletePost(userId, postId)

  return res.status(HttpStatus.OK).send(`Deleted post ${postId}`)
})

/**
 * @swagger
 * /post/{postId}/comments:
 *   get:
 *     summary: Obtener comentarios de un post
 *     description: Devuelve todos los comentarios asociados a un post específico
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post del cual obtener comentarios
 *     responses:
 *       200:
 *         description: Lista de comentarios del post
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 */
postRouter.get('/:postId/comments', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params

  const comments = await service.getCommentsByPostId(userId, postId)

  return res.status(HttpStatus.OK).json(comments)
})

/**
 * @swagger
 * /post/{postId}/comments/paginated:
 *   get:
 *     summary: Obtener comentarios de un post con paginación
 *     description: Devuelve comentarios de un post específico con paginación basada en cursores
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post del cual obtener comentarios
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número máximo de comentarios a devolver
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Cursor para paginación (ID del comentario antes del cual obtener resultados)
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *         description: Cursor para paginación (ID del comentario después del cual obtener resultados)
 *     responses:
 *       200:
 *         description: Lista paginada de comentarios del post
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 */
postRouter.get('/:postId/comments/paginated', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params
  const { limit, before, after } = req.query as Record<string, string>

  const comments = await service.getCommentsByPostIdPaginated(
    userId, 
    postId, 
    { 
      limit: limit ? Number(limit) : undefined, 
      before, 
      after
    }
  )

  return res.status(HttpStatus.OK).json(comments)
})

/**
 * @swagger
 * /post/{postId}/with_comments:
 *   get:
 *     summary: Obtener post con sus comentarios
 *     description: Devuelve un post específico junto con todos sus comentarios
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post a obtener con sus comentarios
 *     responses:
 *       200:
 *         description: Post con comentarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 */
postRouter.get('/:postId/with_comments', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params

  const postWithComments = await service.getPostsWithComments(userId, postId)

  return res.status(HttpStatus.OK).json(postWithComments)
})

/**
 * @swagger
 * /post/{postId}/comments:
 *   post:
 *     summary: Crear un comentario en un post
 *     description: Publica un nuevo comentario en un post específico
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post en el que comentar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenido textual del comentario
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs de las imágenes del comentario
 *     responses:
 *       201:
 *         description: Comentario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 */
postRouter.post('/:postId/comments', BodyValidation(CreatePostInputDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params
  const data = req.body

  const comment = await service.createComment(userId, postId, data)

  return res.status(HttpStatus.CREATED).json(comment)
})

/**
 * @swagger
 * /post/user/{userId}/comments:
 *   get:
 *     summary: Obtener comentarios de un usuario
 *     description: Devuelve todos los comentarios realizados por un usuario específico
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario del cual obtener comentarios
 *     responses:
 *       200:
 *         description: Lista de comentarios del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 */
postRouter.get('/user/:userId/comments', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { userId: targetUserId } = req.params

  const comments = await service.getCommentsByUserId(userId, targetUserId)

  return res.status(HttpStatus.OK).json(comments)
})

/**
 * @swagger
 * /post/{postId}/image-upload-url:
 *   get:
 *     summary: Obtener URL para subir imagen de post
 *     description: Genera una URL firmada para subir una imagen asociada a un post específico
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post al que asociar la imagen
 *       - in: query
 *         name: fileExt
 *         required: true
 *         schema:
 *           type: string
 *         description: Extensión del archivo (jpg, png, etc.)
 *       - in: query
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: Índice de la imagen en el array de imágenes del post
 *     responses:
 *       200:
 *         description: URL generada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl:
 *                   type: string
 *                   description: URL firmada para subir la imagen
 *                 key:
 *                   type: string
 *                   description: Clave del objeto en S3
 *       400:
 *         description: Faltan parámetros requeridos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres el autor del post
 */
postRouter.get('/:postId/image-upload-url', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params
  const { fileExt, index } = req.query as { fileExt: string, index: string }

  if (!fileExt || !index) {
    return res.status(HttpStatus.BAD_REQUEST).json({ message: 'File extension and index are required' })
  }

  const { uploadUrl, key } = await service.generatePostImageUploadUrl(userId, postId, fileExt, Number(index))

  return res.status(HttpStatus.OK).json({ uploadUrl, key })
})

/**
 * @swagger
 * /post/{postId}/images:
 *   patch:
 *     summary: Actualizar imágenes de un post
 *     description: Actualiza las URLs de las imágenes asociadas a un post después de subirlas a S3
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post cuyas imágenes se actualizarán
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Nuevas URLs de las imágenes del post
 *     responses:
 *       200:
 *         description: Imágenes actualizadas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres el autor del post
 *       404:
 *         description: Post no encontrado
 */
postRouter.patch('/:postId/images', BodyValidation(UpdatePostImagesDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { postId } = req.params
  const { images } = req.body

  const post = await service.updatePostImages(userId, postId, images)

  return res.status(HttpStatus.OK).json(post)
})
