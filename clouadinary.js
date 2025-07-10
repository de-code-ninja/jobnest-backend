import {v2 as cloudinary} from "cloudinary"
import dotenv from "dotenv"
dotenv.config()

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD  ,
    api_key : CLOUDINARY_API_KEY,
    api_secret: LOUDINARY_API_SECRET
})

export default cloudinary