import 'reflect-metadata'
import express from 'express'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import { Constants, NodeEnv } from '@utils'
import { Logger } from '@utils/logger'
import { router } from '@router'
import { ErrorHandling } from '@utils/errors'
import { setupSwagger } from '@utils/swagger'

const app = express()

// Set up request logger
if (Constants.NODE_ENV === NodeEnv.DEV) {
  app.use(morgan('tiny')) // Log requests only in development environments
}

// Set up request parsers
app.use(express.json()) // Parses application/json payloads request bodies
app.use(express.urlencoded({ extended: false })) // Parse application/x-www-form-urlencoded request bodies
app.use(cookieParser()) // Parse cookies

// Set up CORS
app.use(
  cors({
    origin: Constants.CORS_WHITELIST
  })
)

// Set up Swagger documentation
setupSwagger(app)

app.use('/api', router)

app.use(ErrorHandling)

app.listen(Constants.PORT, () => {
  Logger.info(`Server listening on port ${Constants.PORT}`)
  Logger.info(`API Documentation available at http://localhost:${Constants.PORT}/api-docs`)
})
