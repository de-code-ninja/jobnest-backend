import mongoose from "mongoose"

const interviewSchema = new mongoose.Schema({
    applicant: {
        type:mongoose.Schema.Types.ObjectId   ,
        ref: "User"
    } ,
    job: {
        type:mongoose.Schema.Types.ObjectId   ,
        ref: "Job"
    },
    jobTitle : String ,
    notes: String ,
    location:String ,
    date: String ,
    time: String,
    status: String
})

const interviewModel = mongoose.model("Interview" , interviewSchema)
export default interviewModel