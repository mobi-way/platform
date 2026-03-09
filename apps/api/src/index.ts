import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import type {
  Room,
  SystemUpdatePayload,
  TripOptionsRequestPayload,
  TripOptionsResponsePayload,
  TripRequestPayload,
} from './types'

const app = express()

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
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
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'null'],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket: Socket) => {
  console.log(`[connect] ${socket.id}`)

  socket.on('join_room', (room: Room) => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id)
    rooms.forEach((r) => socket.leave(r))
    socket.join(room)
    console.log(`[room] ${socket.id} joined "${room}"`)
  })

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
    console.log(`[trip_request] bus ${payload.busId} from ${socket.id}`)
    socket.to('admin').emit('trip_request', payload)
  })

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} — ${reason}`)
  })
})

const PORT = parseInt(process.env.PORT ?? '3001', 10)

httpServer.listen(PORT, () => {
  console.log(`[API] Socket.io server running on http://localhost:${PORT}`)
  console.log(`[API] Rooms: admin | passenger | driver`)
})
