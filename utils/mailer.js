import nodemailer from 'nodemailer'
import dotenv from "dotenv"
dotenv.config()
const transporter = nodemailer.createTransport({
    service: "gmail" ,
    auth:{
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS
    }
})

export default transporter