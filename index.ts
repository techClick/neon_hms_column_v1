import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { clients } from './routes/clients'
import { auth } from './routes/auth'
import { qtAuth } from './routes/qtAuth'
import { rooms } from './routes/rooms'
import { settings } from './routes/settings'
import { transactions } from './routes/transactions'
import { webhook } from './routes/webhook'
import { logs } from './routes/logs'
import { master } from './routes/master'
import { insights } from './routes/insights'
import http from 'http'
import { photo } from './routes/photo'
import { cOOp } from './routes/cOOp'
import { cronJobs } from './routes/cronJobs'
import { allowCors, createDBs } from './routes/globals/globalWares'
import { startSockets } from './routes/globals/socket'
import { cert } from './routes/certification'
import { insightEmail } from './routes/insightemail'

const app = express()
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ extended: true, limit: '30mb' }))
dotenv.config()
process.env.TZ = 'Africa/Lagos'

const corsOptions = {
  origin: [
    `https://www.${process.env.CLIENT_URL.split('https://')[1] || ''}`,
    process.env.CLIENT_URL,
    'https://www.lodgefirst.com',
    'https://lodgefirst.com',
    'https://www.lodgerbee.com',
    'https://lodgerbee.com',
    process.env.ENVIRONMENT === 'development' ? process.env.MOBILE_URL : ''
  ],
  methods: 'GET,PUT,POST,PATCH,DELETE'
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.all('*', allowCors)
app.all('*', createDBs);

[clients, auth, qtAuth, rooms, settings, transactions, webhook, logs, master, cOOp, insights, photo, cert,
  insightEmail].map((endPoint) => app.use('/', endPoint))

const server = http.createServer(app)

startSockets(server)
cronJobs.runCronJobs()

const port = process.env.PORT || 8200

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.get('/', (req, res) => {
  res.status(200).json(({ ree: `TS_NODE_3215 https://www.${process.env.CLIENT_URL.split('https://')[1]}` }))
})

export { server }
