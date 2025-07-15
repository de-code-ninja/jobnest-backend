import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    employerID: {
        type:mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    title: String ,
    company: String ,
    verifiedCompany: Boolean ,
    description: String ,
    education: String ,
    experience: String ,
    age: String ,
    salary: String ,
    incentiveOne : String ,
    incentiveTwo: String ,
    location: String,
    applicants : [
        {
            type:mongoose.Schema.Types.ObjectId ,
            ref: "User" 
        }
    ],
    interviewInvitations : [
        {
            type:mongoose.Schema.Types.ObjectId ,
            ref: "User" 
        }
    ],
    rejections : [
        {
            type:mongoose.Schema.Types.ObjectId ,
            ref: "User" 
        }
    ],
})

const jobModel = mongoose.model("Job" , jobSchema)

export default jobModel
