import express from 'express'
import cors from 'cors'
import user from './routes/user.route.js'
import form from './routes/form.route.js'


const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/onb',user)
app.use('/api/v1/onb',form)


export {app}