import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
import 'express-async-errors'

import { db, BodyValidation } from '@utils'

import { ReactionRepositoryImpl } from '../repository'
import { ReactionService, ReactionServiceImpl } from '../service'
import { CreateReactionDTO, ReactionType } from '../dto'

export const reactionRouter = Router()

// Use dependency injection
const service: ReactionService = new ReactionServiceImpl(new ReactionRepositoryImpl(db))

/**
 * @swagger
 * /reaction/{post_id}:
 *   post:
 *     summary: Crear una reacción
 *     description: Crea una reacción (like o retweet) en un post específico
 *     tags:
 *       - Reacciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post al que reaccionar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [LIKE, RETWEET]
 *                 description: Tipo de reacción
 *     responses:
 *       201:
 *         description: Reacción creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reaction'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Post no encontrado
 *       409:
 *         description: Ya existe una reacción de este tipo en este post
 */
reactionRouter.post('/:post_id', BodyValidation(CreateReactionDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { post_id } = req.params
  const { type } = req.body

  // Convert post_id from route param to required postId for request body validation
  req.body.postId = post_id

  const reaction = await service.createReaction(userId, post_id, type)

  return res.status(HttpStatus.CREATED).json(reaction)
})

/**
 * @swagger
 * /reaction/{post_id}:
 *   delete:
 *     summary: Eliminar una reacción
 *     description: Elimina una reacción (like o retweet) de un post específico
 *     tags:
 *       - Reacciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post del cual eliminar la reacción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [LIKE, RETWEET]
 *                 description: Tipo de reacción a eliminar
 *     responses:
 *       200:
 *         description: Reacción eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de confirmación
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Reacción no encontrada
 */
reactionRouter.delete('/:post_id', BodyValidation(CreateReactionDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { post_id } = req.params
  const { type } = req.body
  
  // Convert post_id from route param to required postId for request body validation
  req.body.postId = post_id

  await service.deleteReaction(userId, post_id, type)

  return res.status(HttpStatus.OK).send({ message: `Reaction removed from post ${post_id}` })
})

/**
 * @swagger
 * /reaction/{post_id}:
 *   get:
 *     summary: Obtener conteo de reacciones
 *     description: Devuelve el conteo de likes y retweets de un post específico
 *     tags:
 *       - Reacciones
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post del cual obtener el conteo de reacciones
 *     responses:
 *       200:
 *         description: Conteo de reacciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 likes:
 *                   type: integer
 *                   description: Número de likes
 *                 retweets:
 *                   type: integer
 *                   description: Número de retweets
 *       404:
 *         description: Post no encontrado
 */
reactionRouter.get('/:post_id', async (req: Request, res: Response) => {
  const { post_id } = req.params

  const counts = await service.getReactionCountsForPost(post_id)

  return res.status(HttpStatus.OK).json(counts)
})

/**
 * @swagger
 * /reaction/{post_id}/status:
 *   get:
 *     summary: Verificar estado de reacción
 *     description: Verifica si el usuario actual ha reaccionado a un post específico
 *     tags:
 *       - Reacciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post a verificar
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LIKE, RETWEET]
 *         description: Tipo de reacción a verificar
 *     responses:
 *       200:
 *         description: Estado de la reacción
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasReacted:
 *                   type: boolean
 *                   description: Indica si el usuario ha reaccionado al post
 *       400:
 *         description: Tipo de reacción inválido
 *       401:
 *         description: No autorizado
 */
reactionRouter.get('/:post_id/status', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { post_id } = req.params
  const { type } = req.query as { type: ReactionType }

  if (!type || !Object.values(ReactionType).includes(type)) {
    return res.status(HttpStatus.BAD_REQUEST).json({ 
      message: 'Invalid reaction type. Must be LIKE or RETWEET' 
    })
  }

  const hasReacted = await service.hasUserReacted(userId, post_id, type)

  return res.status(HttpStatus.OK).json({ hasReacted })
})

/**
 * @swagger
 * /reaction/user/{user_id}/likes:
 *   get:
 *     summary: Obtener likes de un usuario
 *     description: Devuelve todos los posts que un usuario ha marcado como "me gusta"
 *     tags:
 *       - Reacciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario del cual obtener los likes
 *     responses:
 *       200:
 *         description: Lista de posts con like
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 */
reactionRouter.get('/user/:user_id/likes', async (req: Request, res: Response) => {
  const { user_id } = req.params

  const likes = await service.getUserReactions(user_id, ReactionType.LIKE)

  return res.status(HttpStatus.OK).json(likes)
})

/**
 * @swagger
 * /reaction/user/{user_id}/retweets:
 *   get:
 *     summary: Obtener retweets de un usuario
 *     description: Devuelve todos los posts que un usuario ha retweeteado
 *     tags:
 *       - Reacciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario del cual obtener los retweets
 *     responses:
 *       200:
 *         description: Lista de posts retweeteados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: No autorizado
 */
reactionRouter.get('/user/:user_id/retweets', async (req: Request, res: Response) => {
  const { user_id } = req.params

  const retweets = await service.getUserReactions(user_id, ReactionType.RETWEET)

  return res.status(HttpStatus.OK).json(retweets)
}) 