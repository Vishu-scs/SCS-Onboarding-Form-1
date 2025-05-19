import express from 'express'
import cors from 'cors'
import user from './routes/user.route.js'

const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/onb',user)

export {app}