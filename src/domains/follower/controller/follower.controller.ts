import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express
import 'express-async-errors'

import { db } from '@utils'

import { FollowerRepositoryImpl } from '../repository'
import { FollowerService, FollowerServiceImpl } from '../service'

export const followerRouter = Router()

// Use dependency injection
const service: FollowerService = new FollowerServiceImpl(new FollowerRepositoryImpl(db))

/**
 * @swagger
 * /follower/follow/{userId}:
 *   post:
 *     summary: Seguir a un usuario
 *     description: Comienza a seguir a un usuario específico
 *     tags:
 *       - Seguidores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a seguir
 *     responses:
 *       201:
 *         description: Has comenzado a seguir al usuario correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de confirmación
 *                 follow:
 *                   $ref: '#/components/schemas/Follow'
 *       400:
 *         description: Error en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No puedes seguir a este usuario (perfil privado o ya estás siguiendo)
 *       404:
 *         description: Usuario no encontrado
 */
followerRouter.post('/follow/:userId', async (req: Request, res: Response) => {
  const { userId: currentUserId } = res.locals.context
  const { userId: userToFollowId } = req.params

  const follow = await service.followUser(currentUserId, userToFollowId)

  return res.status(HttpStatus.CREATED).json({
    message: 'Has comenzado a seguir a este usuario',
    follow
  })
})

/**
 * @swagger
 * /follower/unfollow/{userId}:
 *   post:
 *     summary: Dejar de seguir a un usuario
 *     description: Deja de seguir a un usuario que actualmente sigues
 *     tags:
 *       - Seguidores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario que dejarás de seguir
 *     responses:
 *       200:
 *         description: Has dejado de seguir al usuario correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de confirmación
 *       400:
 *         description: Error en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado o no lo estabas siguiendo
 */
followerRouter.post('/unfollow/:userId', async (req: Request, res: Response) => {
  const { userId: currentUserId } = res.locals.context
  const { userId: userToUnfollowId } = req.params

  await service.unfollowUser(currentUserId, userToUnfollowId)

  return res.status(HttpStatus.OK).json({
    message: 'Has dejado de seguir a este usuario'
  })
}) 