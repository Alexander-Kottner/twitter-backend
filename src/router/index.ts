import { Router } from 'express'
import { withAuth } from '@utils'
import { db } from '@utils'

import { userRouter } from '@domains/user'
import { postRouter, commentRouter } from '@domains/post'
import { authRouter } from '@domains/auth'
import { healthRouter } from '@domains/health'
import { followerRouter } from '@domains/follower'
import { reactionRouter } from '@domains/reaction'

// Chat imports
import { ChatController } from '@domains/chat/controller/chat.controller'
import { ChatService } from '@domains/chat/service/chat.service'
import { ChatRoomService } from '@domains/chat/service/chat-room.service'
import { ChatRoomMemberService } from '@domains/chat/service/chat-room-member.service'
import { MessageService } from '@domains/chat/service/message.service'
import { ChatRoomRepositoryImpl } from '@domains/chat/repository/chat-room.repository.impl'
import { ChatRoomMemberRepositoryImpl } from '@domains/chat/repository/chat-room-member.repository.impl'
import { MessageRepositoryImpl } from '@domains/chat/repository/message.repository.impl'
import { FollowerRepositoryImpl } from '@domains/follower/repository/follower.repository.impl'

// Initialize chat dependencies
const chatRoomRepository = new ChatRoomRepositoryImpl(db)
const chatRoomMemberRepository = new ChatRoomMemberRepositoryImpl(db)
const messageRepository = new MessageRepositoryImpl(db)
const followerRepository = new FollowerRepositoryImpl(db)

const chatRoomService = new ChatRoomService(chatRoomRepository, chatRoomMemberRepository, messageRepository, followerRepository)
const chatRoomMemberService = new ChatRoomMemberService(chatRoomMemberRepository, chatRoomRepository)
const messageService = new MessageService(messageRepository, chatRoomMemberRepository)
const chatService = new ChatService(chatRoomService, chatRoomMemberService, messageService, followerRepository)

export const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/user', withAuth, userRouter)
router.use('/post', withAuth, postRouter)
router.use('/comment', withAuth, commentRouter)
router.use('/follower', withAuth, followerRouter)
router.use('/reaction', withAuth, reactionRouter)
router.use('/chat', ChatController.routes(chatService))
