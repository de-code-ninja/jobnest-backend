import express from "express";
import cors from "cors";
import userModel from "./models/user.js";
import transporter from "./utils/mailer.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { getAuth } from "./utils/firebaseAdmin.js";
import resumeModel from "./models/resume.js";
import companyModel from "./models/company.js";
import multer from "multer";
import path from "path";
import jobModel from "./models/job.js";
import interviewModel from "./models/interview.js";
import cloudinary from "./clouadinary.js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("hello world");
});
const pendingusers = new Map();

app.get("/api/user", isLoggedIn, async (req, res) => {
  try {
    const foundUser = await userModel
      .findById(req.user.id)
      .populate("resume")
      .populate("company")
      .populate("postedJobs")
      .populate("appliedJobs")
      .populate("interviews");
    console.log(foundUser);
    if (!foundUser) return res.status(404).ison({ message: "User not found" });
    res.status(200).json({ user: foundUser });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});
app.get("/api/jobs/all", async (req, res) => {
  try {
    const jobs = await jobModel.find();
    console.log(jobs);

    if (!jobs) return res.status(404).ison({ message: "jobs not found" });
    res.status(200).json({ jobs: jobs });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});
app.get("/api/job/apply/:jobid", isLoggedIn, async (req, res) => {
  // console.log("apply job");

  const jobID = req.params.jobid;
  try {
    const foundUser = await userModel.findById(req.user.id);
    if (!foundUser) return res.status(404).json({ message: "User not found" });

    const job = await jobModel.findById(jobID);
    console.log(job);

    if (!job) return res.status(404).ison({ message: "jobs not found" });

    job.applicants.push(foundUser._id);
    await job.save();
    foundUser.appliedJobs.push(job._id);
    foundUser.save();
    res.status(200).json({ message: "successfully applied" });
  } catch (error) {
    res.status(401).json({ message: "server error" });
  }
});
app.post("/api/auth/google-login/:role", async (req, res) => {
  const idToken = req.body.token;
  const role = req.params.role;
  const decoded = await getAuth().verifyIdToken(idToken);

  const { name, picture, email, email_verified, uid } = decoded;

  const user = await userModel.findOne({ email });
  if (user) {
    console.log("user exists");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.status(200).cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "None", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    }).json({ message: "logged in successfully.", user });
  } else {
    const newUser = await userModel.create({
      name,
      email,
      avatar: picture,
      role,
      verified: email_verified,
      uid,
    });
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
    return res.status(201).cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "None", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    }).json({ message: "registered successfully.", user: newUser });
  }
});
app.post(
  "/api/resume/edit",
  isLoggedIn,
  upload.single("cvPic"),
  async (req, res) => {
    const {
      firstName,
      lastName,
      about,
      degree,
      institute,
      gpa,
      number,
      skill,
      email,
      jobTitle,
      company,
      workYears,
      languages,
    } = req.body;
    console.log(req.file);
    console.log(req.body);

    try {
      const foundUser = await userModel.findById(req.user.id);
      if (!foundUser)
        return res.status(404).ison({ message: "User not found" });
      let fullURL;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "JobNest",
        });
        fullURL = result.secure_url;
        fs.unlinkSync(req.file.path);
      }
      let pictureURL = req.file ? fullURL : "/profile-pic.jpg";
      const oldResume = await resumeModel.findOne({ userID: foundUser._id });
      if (oldResume) {
        console.log("found old resume");

        oldResume.firstName = firstName || oldResume.firstName;
        oldResume.lastName = lastName || oldResume.lastName;
        oldResume.skill = skill || oldResume.skill;
        oldResume.about = about || oldResume.about;
        oldResume.degree = degree || oldResume.degree;
        oldResume.institute = institute || oldResume.institute;
        oldResume.gpa = gpa || oldResume.gpa;
        oldResume.mobileNumber = number || oldResume.mobileNumber;
        oldResume.email = email || oldResume.email;
        oldResume.exJobTitle = jobTitle || oldResume.exJobTitle;
        oldResume.exCompany = company || oldResume.exCompany;
        oldResume.workYears = workYears || oldResume.workYears;
        oldResume.languages = languages || oldResume.languages;
        if (req.file) oldResume.pictureURL = pictureURL;
        oldResume.save();
        foundUser.resume = oldResume._id;
        foundUser.save();
      } else {
        const resume = await resumeModel.create({
          userID: foundUser._id,
          firstName,
          lastName,
          pictureURL,
          about,
          skill,
          degree,
          institute,
          gpa,
          mobileNumber: number,
          email,
          exJobTitle: jobTitle,
          exCompany: company,
          workYears,
          languages,
        });

        foundUser.resume = resume._id;
        foundUser.save();
      }
      console.log("user updated");
      const updatedUser = await userModel
        .findById(req.user.id)
        .populate("resume");
      res
        .status(201)
        .json({ message: "resume created successfully", user: updatedUser });
    } catch (error) {
      return res.status(500).json({ error: "Error creating user." });
    }
  }
);
app.post(
  "/api/employer/profile/avatar",
  isLoggedIn,
  upload.single("avatar"),
  async (req, res) => {
    try {
      console.log("uploading");
      console.log(req.file);

      const foundUser = await userModel.findById(req.user.id);
      if (!foundUser)
        return res.status(404).json({ message: "User not found" });

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "JobNest",
      });
      console.log(result);

      let fileURL = req.file ? result.secure_url : "/profile-pic.jpg";
      fs.unlinkSync(req.file.path);
      foundUser.avatar = fileURL;
      await foundUser.save();
      res
        .status(201)
        .json({ message: "resume created successfully", user: foundUser });
    } catch (error) {
      return res.status(500).json({ error: "Error creating user." });
    }
  }
);
app.post(
  "/api/company/edit",
  isLoggedIn,
  upload.single("logo"),
  async (req, res) => {
    const { name, about, number, email, location } = req.body;
    console.log(req.file);

    try {
      const foundUser = await userModel.findById(req.user.id);
      if (!foundUser)
        return res.status(404).json({ message: "User not found" });
      let fullURL;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "JobNest",
        });
        fullURL = result.secure_url;
        fs.unlinkSync(req.file.path);
      }
      let logoURL = req.file ? fullURL : "/profile-pic.jpg";

      const oldCompany = await companyModel.findOne({ userID: foundUser._id });
      if (oldCompany) {
        console.log("found old company ");

        oldCompany.name = name || oldCompany.name;
        oldCompany.about = about || oldCompany.about;
        oldCompany.number = number || oldCompany.number;
        oldCompany.email = email || oldCompany.email;
        oldCompany.location = location || oldCompany.location;
        if (req.file) oldCompany.logoURL = logoURL;

        await oldCompany.save();
      } else {
        const company = await companyModel.create({
          userID: foundUser._id,
          name,
          logoURL,
          about,
          number,
          email,
          location,
        });

        foundUser.company = company._id;
        await foundUser.save();
      }
      console.log("user updated");
      const updatedUser = await userModel
        .findById(req.user.id)
        .populate("company");
      console.log(updatedUser);
      res
        .status(201)
        .json({ message: "resume created successfully", user: updatedUser });
    } catch (error) {
      return res.status(500).json({ error: "Error creating user." });
    }
  }
);
app.post("/api/job/post", isLoggedIn, async (req, res) => {
  const {
    title,
    company,
    description,
    education,
    experience,
    age,
    salary,
    incentiveOne,
    incentiveTwo,
    location,
  } = req.body;
  console.log(req.body);

  try {
    const foundUser = await userModel.findById(req.user.id).populate("company");
    console.log(foundUser);

    if (!foundUser) return res.status(404).json({ message: "User not found" });

  
    const job = await jobModel.create({
      employerID: foundUser._id,
      title,
      company,
      description,
      verifiedCompany: foundUser.company.name === company,
      education,
      experience,
      age,
      salary,
      incentiveOne,
      incentiveTwo,
      location,
    });

    foundUser.postedJobs.push(job._id);
    await foundUser.save();

    console.log("user updated");
    
    res
      .status(201)
      .json({ message: "resume created successfully", user: foundUser });
  } catch (error) {
    return res.status(500).json({ error: "Error creating user." });
  }
});
app.post("/api/job/preview", async (req, res) => {
  const { jobID } = req.body;
  try {
    const job = await jobModel.findById(jobID).populate("applicants");
    console.log(job);

    if (!job) return res.status(404).json({ message: "job not found" });

    res.status(201).json({ message: "job found successfully", job: job });
  } catch (error) {
    return res.status(500).json({ error: "Error creating user." });
  }
});
app.post(
  "/api/interview/invite",
  isLoggedIn,
  upload.none(),
  async (req, res) => {
    const { notes, location, date, time, jobID, applicantID } = req.body;
    console.log(req.body);

    try {
      const foundUser = await userModel.findById(req.user.id);
      if (!foundUser)
        return res.status(404).json({ message: "User not found" });

      const job = await jobModel.findById(jobID).populate("applicants");
      if (!job) return res.status(404).json({ message: "job not found" });

      const applicant = await userModel.findById(applicantID);
      if (!applicant)
        return res.status(404).json({ message: "User not found" });

      const interviewInvite = await interviewModel.create({
        jobTitle: job.title,
        notes,
        location,
        date,
        time,
        job: jobID,
        applicant: applicantID,
        status: "Active",
      });
      job.interviewInvitations.push(applicantID);
      await job.save();
      applicant.interviews.push(interviewInvite._id);
      await applicant.save();

      res.status(201).json({ message: "interview sent successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Error creating user." });
    }
  }
);
app.post("/api/job/reject", isLoggedIn, async (req, res) => {
  const { jobID, applicantID } = req.body;
  console.log(req.body);

  try {
    const foundUser = await userModel.findById(req.user.id);
    if (!foundUser) return res.status(404).json({ message: "User not found" });

    const job = await jobModel.findById(jobID);
    if (!job) return res.status(404).json({ message: "job not found" });

    const applicant = await userModel.findById(applicantID);
    if (!applicant) return res.status(404).json({ message: "User not found" });

    const interview = await interviewModel.findOne({
      job: job._id,
      applicant: applicantID,
    });
    // if (!interview) return res.status(404).json({ message: "interview not found" });

    job.rejections.push(applicantID);
    await job.save();
    applicant.rejectedJobs.push(job._id);
    await applicant.save();
    if (interview) {
      interview.status = "Rejected";
      await interview.save();
    }
    console.log(interview);

    res.status(201).json({ message: "rejected successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Error creating user." });
  }
});
app.post("/api/resume/preview", async (req, res) => {
  const { resumeID } = req.body;
  try {
    const resume = await resumeModel.findById(resumeID);
    console.log(resume);

    if (!resume) return res.status(404).json({ message: "resume not found" });

    res.status(201).json({ message: "job found successfully", resume: resume });
  } catch (error) {
    return res.status(500).json({ error: "Error creating user." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    const user = await userModel
      .findOne({ email })
      .populate("resume")
      .populate("company")
      .populate("postedJobs")
      .populate("appliedJobs")
      .populate("interviews");
    if (!user) return res.status(404).json({ message: "user not found" });

    if (!user.password)
      return res.status(401).json({ message: "incorrect password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "incorrect password" });

    console.log("user exists");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.status(200).cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "None", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    }).json({ message: "logged in successfully.", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/register/:role", async (req, res) => {
  console.log(req.params.role);
  console.log(req.body);
  try {
    const role = req.params.role;
    const { name, email, password } = req.body;

    const user = await userModel.findOne({ email });
    // console.log("email already exists");

    if (user) return res.status(400).json({ message: "email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role,
      verified: false,
      avatar: "https://res.cloudinary.com/dxpbvp4bj/image/upload/v1752061974/profile_default_kociqs.jpg"
    });
    console.log(newUser);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
    return res.status(201).cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "None", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    })
      .json({ message: "Registered successfully", user: newUser });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Error creating user." });
  }
});
app.post("/send-code", async (req, res) => {
  const email = req.body.email;
  console.log("sending code to ", email);
  try {
    const foundUser = await userModel.findOne({ email });
    if (!foundUser) return res.status(404).json({ message: "User not found" });
    console.log(foundUser);
    const code = Math.floor(Math.random() * 1000000);
    pendingusers.set(email, { code, expireAt: Date.now() + 5 * 60 * 1000 });
    await sendVerificationCode(email, code);
    console.log("code sent ", code);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "server user." });
  }
});

app.post("/verify/email", async (req, res) => {
  const { email, code } = req.body;
  console.log(code);

  try {
    const foundUser = await userModel.findOne({ email });
    console.log(foundUser);
    if (!foundUser) return res.status(404).ison({ message: "User not found" });
    const pending = pendingusers.get(email);
    if (!pending)
      return res.status(400).json({ error: "No pending registration found." });
    if (Date.now() > pending.expiresAt)
      return res.status(400).json({ error: "Code expired." });
    if (parseInt(code) !== pending.code) {
      return res.status(401).json({ error: "Invalid code." });
    }
    foundUser.verified = true;
    foundUser.save();
    return res.json({ success: true, user: foundUser });
  } catch (error) {
    return res.status(500).json({ error: "Error founding user." });
  }
});
app.post("/password/change", async (req, res) => {
  const { email, password } = req.body;
  console.log(email);

  try {
    const foundUser = await userModel.findOne({ email });
    console.log(foundUser);
    if (!foundUser) return res.status(404).ison({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);

    foundUser.password = hashedPassword;
    await foundUser.save();
    console.log("password was changed");

    return res.status(201).json({ success: true, user: foundUser });
  } catch (error) {
    return res.status(500).json({ error: "Error founding user." });
  }
});

app.get("/logout", isLoggedIn, (req, res) => {
  res.clearCookie("token").json({ message: "logged out" });
});

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: '"JobNest" <ik571572@gmail.com>',
    to: email,
    subject: "JobNest Verification code",
    html: `<p>Your verification code is: <b>${code}</b></p>`,
  };
  await transporter.sendMail(mailOptions);
};

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
app.listen(process.env.PORT, () => {
  console.log("server started at " + process.env.PORT);
});
