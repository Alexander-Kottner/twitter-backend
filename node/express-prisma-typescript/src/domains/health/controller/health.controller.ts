import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express, don't forget import it in your new controllers
import 'express-async-errors'

export const healthRouter = Router()

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     description: Endpoint para comprobar que el servidor está funcionando correctamente
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 */
healthRouter.get('/', (req: Request, res: Response) => {
  return res.status(HttpStatus.OK).send()
})
