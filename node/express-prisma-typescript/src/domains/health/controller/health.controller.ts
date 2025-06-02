import { Request, Response, Router } from 'express'
import HttpStatus from 'http-status'
// express-async-errors is a module that handles async errors in express, don't forget import it in your new controllers
import 'express-async-errors'
import { db } from '@utils/database'

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
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`

    // Return a more detailed response for debugging
    return res.status(HttpStatus.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      database: 'connected',
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: process.env.NODE_ENV === 'production' ? undefined : error,
    })
  }
})
