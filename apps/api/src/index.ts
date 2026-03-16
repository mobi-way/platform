import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import { verifyToken } from '@mobi-way/supabase/middleware'
import type { VerifiedUser } from '@mobi-way/supabase/middleware'
import type {
  Room,
  SystemUpdatePayload,
  TripOptionsRequestPayload,
  TripOptionsResponsePayload,
  TripRequestPayload,
} from './types'

// Extend Socket to carry authenticated user data
interface AuthenticatedSocket extends Socket {
  user?: VerifiedUser
}

const app = express()

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://192.168.3.8:5173',
      'http://192.168.3.8:5174',
      'http://192.168.3.8:5175',
    ],
    methods: ['GET', 'POST'],
  }),
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
      'http://192.168.3.8:5173', 'http://192.168.3.8:5174', 'http://192.168.3.8:5175',
      'null',
    ],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

// ── Auth middleware ──────────────────────────────────────────────────────────
io.use(async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth?.token as string | undefined

  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    const user = await verifyToken(token)
    socket.user = user
    next()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    next(new Error(message))
  }
})

// ── Connection handler ──────────────────────────────────────────────────────
io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.user!
  const room: Room = user.role as Room

  // Auto-join room based on role
  socket.join(room)
  console.log(`[connect] ${socket.id} as ${user.role} (${user.email}) → room "${room}"`)

  // admin → passenger + driver
  socket.on('system_update', (payload: SystemUpdatePayload) => {
    socket.to('passenger').emit('system_update', payload)
    socket.to('driver').emit('system_update', payload)
  })

  // passenger → admin (request trip options)
  socket.on('trip_options_request', (payload: Omit<TripOptionsRequestPayload, 'requesterId'>) => {
    const enriched: TripOptionsRequestPayload = { ...payload, requesterId: socket.id }
    socket.to('admin').emit('trip_options_request', enriched)
  })

  // admin → specific passenger (send options back)
  socket.on('trip_options_response', (payload: TripOptionsResponsePayload) => {
    const { requesterId, ...rest } = payload
    io.to(requesterId).emit('trip_options_response', rest)
  })

  // passenger → admin (confirm booking)
  socket.on('trip_request', (payload: TripRequestPayload) => {
    console.log(`[trip_request] bus ${payload.busId} from ${user.email}`)
    socket.to('admin').emit('trip_request', payload)
  })

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} (${user.email}) — ${reason}`)
  })
})

const PORT = parseInt(process.env.PORT ?? '3001', 10)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Socket.io server running on http://0.0.0.0:${PORT}`)
  console.log(`[API] Auth-protected rooms: admin | passenger | driver`)
})
