import 'reflect-metadata'
import express from 'express'
import { createServer } from 'http'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import { Constants, NodeEnv } from '@utils'
import { Logger } from '@utils/logger'
import { router } from '@router'
import { ErrorHandling } from '@utils/errors'
import { setupSwagger } from '@utils/swagger'
import { PrismaClient } from '@prisma/client'

// Chat imports
import { ChatGateway } from '@domains/chat/gateway/chat.gateway'
import { ChatService } from '@domains/chat/service/chat.service'
import { ChatRoomService } from '@domains/chat/service/chat-room.service'
import { ChatRoomMemberService } from '@domains/chat/service/chat-room-member.service'
import { MessageService } from '@domains/chat/service/message.service'
import { ChatRoomRepositoryImpl } from '@domains/chat/repository/chat-room.repository.impl'
import { ChatRoomMemberRepositoryImpl } from '@domains/chat/repository/chat-room-member.repository.impl'
import { MessageRepositoryImpl } from '@domains/chat/repository/message.repository.impl'
import { FollowerRepositoryImpl } from '@domains/follower/repository/follower.repository.impl'

const app = express()
const httpServer = createServer(app)

// Initialize Prisma client
const db = new PrismaClient()

// Initialize chat repositories
const chatRoomRepository = new ChatRoomRepositoryImpl(db)
const chatRoomMemberRepository = new ChatRoomMemberRepositoryImpl(db)
const messageRepository = new MessageRepositoryImpl(db)
const followerRepository = new FollowerRepositoryImpl(db)

// Initialize chat services
const chatRoomService = new ChatRoomService(chatRoomRepository, chatRoomMemberRepository, messageRepository, followerRepository)
const chatRoomMemberService = new ChatRoomMemberService(chatRoomMemberRepository, chatRoomRepository)
const messageService = new MessageService(messageRepository, chatRoomMemberRepository)
const chatService = new ChatService(chatRoomService, chatRoomMemberService, messageService, followerRepository)

// Initialize Socket.IO chat gateway
const chatGateway = new ChatGateway(httpServer, chatService)

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

// Use HTTP server instead of app for Socket.IO
httpServer.listen(Constants.PORT, () => {
  Logger.info(`Server listening on port ${Constants.PORT}`)
  Logger.info(`API Documentation available at http://localhost:${Constants.PORT}/api-docs`)
  Logger.info(`Socket.IO chat server enabled`)
})
