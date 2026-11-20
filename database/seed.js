import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./connection.js";
import Auth from "../models/auth.model.js";
import Profile from "../models/profile.model.js";
import Startup from "../models/startup.model.js";
import Post from "../models/post.model.js";

/**
 * Database seeding script for development and demonstration.
 * Creates verified sample builders, startup pages, and milestone posts.
 */

async function seedDatabase() {
  try {
    await connectDB();
    console.log("Seeding database with initial dummy data...");

    // Clean existing seed records
    const sampleEmails = [
      "arjun.sharma@college.edu",
      "sneha.patel@college.edu",
      "rohit.verma@college.edu",
    ];

    const existingUsers = await Auth.find({ email: { $in: sampleEmails } });
    const userIds = existingUsers.map((u) => u._id);

    await Startup.deleteMany({ ownerId: { $in: userIds } });
    await Profile.deleteMany({ userId: { $in: userIds } });
    await Post.deleteMany({ StartupName: { $in: ["CampusCart", "PulseAI"] } });
    await Auth.deleteMany({ email: { $in: sampleEmails } });

    // 1. Create Auth accounts
    const arjunAuth = await Auth.create({
      email: "arjun.sharma@college.edu",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      role: "USER",
    });

    const snehaAuth = await Auth.create({
      email: "sneha.patel@college.edu",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      role: "USER",
    });

    const rohitAuth = await Auth.create({
      email: "rohit.verma@college.edu",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      role: "USER",
    });

    // 2. Create Builder Profiles
    const arjunProfile = new Profile({
      userId: arjunAuth._id,
      fullName: "Arjun Sharma",
      college: "Engineering College",
      year: "3rd Year",
      branch: "Computer Science",
      bio: "Building CampusCart to streamline campus exchanges. Focused on marketplace mechanics and Node.js architectures.",
      role: "FOUNDER",
      skills: ["Node.js", "Express", "System Design", "MongoDB"],
      interests: ["Marketplaces", "FinTech", "E-Commerce"],
      lookingFor: ["Co-founder", "Teammates"],
      availabilityStatus: "Looking for co-founder",
      weeklyHoursAvailable: 20,
      socialLinks: {
        github: "https://github.com/arjun-sharma-dev",
        linkedin: "https://linkedin.com/in/arjun-sharma-demo",
        portfolio: "https://arjunsharma.dev",
      },
      pastWork: [
        {
          title: "Campus Cart Prototype",
          url: "https://github.com/arjun-sharma-dev/campus-cart",
          linkType: "GitHub",
          description: "Full stack prototype with authentication and catalog management.",
        },
      ],
      founderDetails: {
        startupName: "CampusCart",
        stage: "Building MVP",
      },
      isOnboarded: true,
    });
    await arjunProfile.save();

    const snehaProfile = new Profile({
      userId: snehaAuth._id,
      fullName: "Sneha Patel",
      college: "Design & Technology Institute",
      year: "2nd Year",
      branch: "Information Technology",
      bio: "Frontend engineer and interface designer. Love building snappy interactive dashboards and accessible UI systems.",
      role: "JOINER",
      skills: ["React", "TypeScript", "TailwindCSS", "Figma"],
      interests: ["UI/UX", "EdTech", "Developer Tools"],
      lookingFor: ["Teammates", "Learning"],
      availabilityStatus: "Open to join",
      weeklyHoursAvailable: 15,
      socialLinks: {
        github: "https://github.com/sneha-patel-ui",
        linkedin: "https://linkedin.com/in/sneha-patel-design",
      },
      pastWork: [
        {
          title: "Student Design System",
          url: "https://figma.com/@snehadesign/student-system",
          linkType: "Figma",
          description: "Reusable component tokens for campus web applications.",
        },
      ],
      joinerDetails: {
        skills: ["React", "TypeScript", "TailwindCSS", "Figma"],
        graduationYear: 2028,
      },
      isOnboarded: true,
    });
    await snehaProfile.save();

    const rohitProfile = new Profile({
      userId: rohitAuth._id,
      fullName: "Rohit Verma",
      college: "Engineering College",
      year: "4th Year",
      branch: "Electrical Engineering",
      bio: "Exploring applied machine learning pipelines and lecture summarization tools.",
      role: "BOTH",
      skills: ["Python", "PyTorch"],
      interests: ["AI", "EdTech"],
      lookingFor: ["Feedback", "Co-founder"],
      availabilityStatus: "Just exploring",
      weeklyHoursAvailable: 6,
      founderDetails: {
        startupName: "PulseAI",
        stage: "Idea",
      },
      isOnboarded: true,
    });
    await rohitProfile.save();

    // 3. Create Startups (M3)
    const campusCart = await Startup.create({
      name: "CampusCart",
      pitch: "Peer-to-peer textbook and student equipment marketplace for verified campus members.",
      problem: "Students lose hundreds of dollars every semester selling books and electronics to third-party buyback shops.",
      solution: "A closed-campus marketplace allowing students to list items, negotiate directly, and conduct fast in-person hostel pickups.",
      industryTags: ["E-Commerce", "Marketplaces", "Sustainability"],
      stage: "Building MVP",
      visibility: "PUBLIC",
      ownerId: arjunAuth._id,
      links: {
        website: "https://campuscart.local",
        demo: "https://demo.campuscart.local",
        github: "https://github.com/campuscart/core",
      },
      teamMembers: [
        {
          userId: arjunAuth._id,
          role: "Founder & Lead Backend",
          joinedDate: new Date(),
        },
        {
          userId: snehaAuth._id,
          role: "Lead Frontend Engineer",
          joinedDate: new Date(),
        },
      ],
      openRoles: [
        {
          title: "Full Stack Engineer",
          skillsNeeded: ["React", "Node.js", "MongoDB"],
          commitmentHours: 15,
          roleType: "co-founder",
          equityOrCreditNote: "15% equity grant on incorporation",
          status: "OPEN",
        },
        {
          title: "Campus Growth Lead",
          skillsNeeded: ["Community", "Growth Marketing"],
          commitmentHours: 8,
          roleType: "teammate",
          equityOrCreditNote: "Academic project credits and early team share",
          status: "OPEN",
        },
      ],
      milestones: [
        {
          title: "Campus Survey Completed",
          milestoneType: "Idea validated",
          description: "Surveyed 210 students across 4 residential dorms validating resale demand.",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
        {
          title: "Prototype Design Finalized",
          milestoneType: "Prototype ready",
          description: "Completed Figma mockups and conducted user tests with 18 student volunteers.",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    const pulseAI = await Startup.create({
      name: "PulseAI",
      pitch: "Autonomous lecture concept mapping and study problem generator.",
      problem: "Students spend hours re-watching long lecture recordings before midterm examinations.",
      solution: "Transforms audio and slides into interactive concept graphs with practice quizzes.",
      industryTags: ["AI", "EdTech"],
      stage: "Idea",
      visibility: "STEALTH",
      ownerId: rohitAuth._id,
      teamMembers: [
        {
          userId: rohitAuth._id,
          role: "Founder",
          joinedDate: new Date(),
        },
      ],
      openRoles: [
        {
          title: "ML Research Collaborator",
          skillsNeeded: ["Python", "PyTorch", "Transformers"],
          commitmentHours: 12,
          roleType: "co-founder",
          equityOrCreditNote: "Equal founder split",
          status: "OPEN",
        },
      ],
      milestones: [
        {
          title: "Architecture Drafted",
          milestoneType: "Idea validated",
          description: "Benchmark testing on Whisper and fine-tuned open models.",
          date: new Date(),
        },
      ],
    });

    // Link startups to profiles
    await Profile.updateOne(
      { userId: arjunAuth._id },
      {
        $push: {
          linkedStartups: {
            name: campusCart.name,
            stage: campusCart.stage,
            role: "Founder",
            startupId: campusCart._id,
          },
        },
      }
    );

    await Profile.updateOne(
      { userId: snehaAuth._id },
      {
        $push: {
          linkedStartups: {
            name: campusCart.name,
            stage: campusCart.stage,
            role: "Lead Frontend Engineer",
            startupId: campusCart._id,
          },
        },
      }
    );

    await Profile.updateOne(
      { userId: rohitAuth._id },
      {
        $push: {
          linkedStartups: {
            name: pulseAI.name,
            stage: pulseAI.stage,
            role: "Founder",
            startupId: pulseAI._id,
          },
        },
      }
    );

    // 4. Create sample posts
    await Post.create([
      {
        title: "CampusCart prototype testing open this Friday",
        postType: "Milestone",
        body: "We just finished our first end-to-end listing flow on CampusCart. Looking for 10 beta testers to try adding books and testing the chat coordination.",
        profileImageUrl: "/images/default.svg",
        StartupName: "CampusCart",
        likesCount: 14,
        commentsCount: 3,
      },
      {
        title: "Looking for an ML enthusiast working on speech models",
        postType: "Looking For",
        body: "Building a stealth project around classroom lecture parsing. If you have experience with Python, PyTorch, and audio transcription models, check our open role.",
        profileImageUrl: "/images/default.svg",
        StartupName: "PulseAI",
        likesCount: 8,
        commentsCount: 2,
      },
    ]);

    console.log("Database seeded successfully!");
    console.log("Sample accounts created:");
    console.log("1. arjun.sharma@college.edu (Founder - CampusCart - Builder Badge Active)");
    console.log("2. sneha.patel@college.edu (Joiner - Designer/Frontend - Builder Badge Active)");
    console.log("3. rohit.verma@college.edu (Both - PulseAI Stealth Mode)");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
}

seedDatabase();
