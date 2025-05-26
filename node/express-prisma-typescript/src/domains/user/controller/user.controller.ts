import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express, don't forget import it in your new controllers
import 'express-async-errors'

import { db, BodyValidation } from '@utils'

import { UserRepositoryImpl } from '../repository'
import { UserService, UserServiceImpl } from '../service'
import { UpdatePrivacyInputDTO, UpdateProfilePictureDTO } from '../dto'
import { FollowerRepositoryImpl } from '@domains/follower/repository'

export const userRouter = Router()

// Use dependency injection
const service: UserService = new UserServiceImpl(new UserRepositoryImpl(db), new FollowerRepositoryImpl(db))

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Obtener recomendaciones de usuarios
 *     description: Devuelve una lista de usuarios recomendados para seguir
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número máximo de usuarios a devolver
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Número de usuarios a saltar (paginación)
 *     responses:
 *       200:
 *         description: Lista de usuarios recomendados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
userRouter.get('/', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { limit, skip } = req.query as Record<string, string>

  const users = await service.getUserRecommendations(userId, { limit: Number(limit), skip: Number(skip) })

  return res.status(HttpStatus.OK).json(users)
})

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Obtener perfil propio
 *     description: Devuelve los datos del perfil del usuario autenticado
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
userRouter.get('/me', async (req: Request, res: Response) => {
  const { userId } = res.locals.context

  const user = await service.getUser(userId, userId)

  return res.status(HttpStatus.OK).json(user)
})

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Obtener perfil de usuario
 *     description: Devuelve los datos del perfil de un usuario específico
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Datos del perfil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
userRouter.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { userId: otherUserId } = req.params

  const user = await service.getUser(otherUserId, userId)

  return res.status(HttpStatus.OK).json(user)
})

/**
 * @swagger
 * /user:
 *   delete:
 *     summary: Eliminar cuenta
 *     description: Elimina la cuenta del usuario autenticado
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada correctamente
 *       401:
 *         description: No autorizado
 */
userRouter.delete('/', async (req: Request, res: Response) => {
  const { userId } = res.locals.context

  await service.deleteUser(userId)

  return res.status(HttpStatus.OK)
})

/**
 * @swagger
 * /user/privacy:
 *   patch:
 *     summary: Actualizar privacidad
 *     description: Actualiza la configuración de privacidad del perfil
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPrivate
 *             properties:
 *               isPrivate:
 *                 type: boolean
 *                 description: Indica si el perfil es privado
 *     responses:
 *       200:
 *         description: Privacidad actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
userRouter.patch('/privacy', BodyValidation(UpdatePrivacyInputDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { isPrivate } = req.body

  const user = await service.updatePrivacy(userId, isPrivate)

  return res.status(HttpStatus.OK).json(user)
})

/**
 * @swagger
 * /user/profile-picture/upload-url:
 *   get:
 *     summary: Obtener URL para subir imagen de perfil
 *     description: Genera una URL firmada para subir una imagen de perfil a S3
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fileExt
 *         required: true
 *         schema:
 *           type: string
 *         description: Extensión del archivo (jpg, png, etc.)
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
 *         description: Falta la extensión del archivo
 *       401:
 *         description: No autorizado
 */
userRouter.get('/profile-picture/upload-url', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { fileExt } = req.query as { fileExt: string }

  if (!fileExt) {
    return res.status(HttpStatus.BAD_REQUEST).json({ message: 'File extension is required' })
  }

  const { uploadUrl, key } = await service.generateProfilePictureUploadUrl(userId, fileExt)

  return res.status(HttpStatus.OK).json({ uploadUrl, key })
})

/**
 * @swagger
 * /user/profile-picture:
 *   patch:
 *     summary: Actualizar imagen de perfil
 *     description: Actualiza la URL de la imagen de perfil después de subirla a S3
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profilePicture
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 description: URL de la imagen de perfil
 *     responses:
 *       200:
 *         description: Imagen de perfil actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
userRouter.patch('/profile-picture', BodyValidation(UpdateProfilePictureDTO), async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { profilePicture } = req.body

  const user = await service.updateProfilePicture(userId, profilePicture)

  return res.status(HttpStatus.OK).json(user)
})

/**
 * @swagger
 * /user/by_username/{username}:
 *   get:
 *     summary: Buscar usuarios por nombre de usuario
 *     description: Busca usuarios cuyo nombre de usuario contenga el texto especificado
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto a buscar en nombres de usuario
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número máximo de usuarios a devolver
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Número de usuarios a saltar (paginación)
 *     responses:
 *       200:
 *         description: Lista de usuarios encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
userRouter.get('/by_username/:username', async (req: Request, res: Response) => {
  const { userId } = res.locals.context
  const { username } = req.params
  const { limit, skip } = req.query as Record<string, string>

  const users = await service.getUsersByUsername(
    username,
    {
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined
    },
    userId
  )

  return res.status(HttpStatus.OK).json(users)
})
