import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
    userID : {
        type: mongoose.Schema.Types.ObjectId ,
        ref: "User" ,
        unique: true
    } ,
    firstName : String ,
    lastName :String ,
    pictureURL : String ,
    about: String ,
    skill : String ,
    degree : String ,
    institute : String ,
    gpa : String ,
    mobileNumber: String ,
    email: String ,
    exJobTitle: String ,
    exCompany : String ,
    workYears : String ,
    languages: String
})

const resumeModel = mongoose.model("Resume" , resumeSchema)
export default resumeModel