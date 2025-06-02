import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express
import 'express-async-errors'

import { db } from '@utils'

import { PostRepositoryImpl } from '../repository'
import { PostService, PostServiceImpl } from '../service'

export const commentRouter = Router()

// Use dependency injection with the same service as post
const service: PostService = new PostServiceImpl(new PostRepositoryImpl(db))

/**
 * @swagger
 * /comment/{post_id}:
 *   get:
 *     summary: Obtener comentarios por post
 *     description: Devuelve todos los comentarios de un post específico con paginación basada en cursores y ordenados por reacciones
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
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
 *         description: Lista paginada de comentarios del post ordenados por reacciones
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
commentRouter.get('/:post_id', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { post_id } = req.params
  const { limit, before, after } = req.query as Record<string, string>

  const comments = await service.getCommentsByPostIdPaginated(
    userId, 
    post_id, 
    { 
      limit: limit ? Number(limit) : undefined, 
      before, 
      after
    }
  )

  return res.status(HttpStatus.OK).json(comments)
})