import express from 'express'
import {app} from './app.js'
import { connectDB } from "./db/db.js";
import "dotenv/config"

const PORT = process.env.PORT
connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server is runnning at PORT: ${PORT}`)
    })
})
.catch((err)=>{
    console.log(" connection failed",err);
})