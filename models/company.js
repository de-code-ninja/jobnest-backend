import mongoose from "mongoose";



const companySchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" ,
        unique: true
    },
    name: String ,
    logoURL : String ,
    about: String ,
    number: String ,
    email: String ,
    location: String 
})

const companyModel = mongoose.model("Company" , companySchema)
export default companyModel