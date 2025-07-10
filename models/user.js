import mongoose from "mongoose";
import dotenv from "dotenv"


dotenv.config()


mongoose.connect(process.env.MONGO_URI_SERVER).then((res)=>{
    console.log("DB connected");
    
})

const userSchema = new mongoose.Schema({
    name: String,
    email: { type:String , unique: true , required :true} ,
    password: String ,
    role: String ,
    avatar: String ,
    verified: Boolean ,
    uid: String , 
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume"
    },
    appliedJobs: [
        {    
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        }
    ],
    interviews: [
        {    
            type: mongoose.Schema.Types.ObjectId,
            ref: "Interview",
        }
    ],
    rejectedJobs: [
        {    
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        }
    ],
    postedJobs: [
        {    
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        }
    ],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    }

})
const userModel = mongoose.model("User" , userSchema)
export default userModel;
