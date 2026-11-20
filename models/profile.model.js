import { Schema, model } from "mongoose";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

const pastWorkSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    linkType: {
      type: String,
      enum: ["GitHub", "Behance", "Portfolio", "Figma", "Live Demo", "Other"],
      default: "Portfolio",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },
  },
  { _id: true, timestamps: true }
);

const linkedStartupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    stage: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "Founder",
    },
    startupId: {
      type: Schema.Types.ObjectId,
      ref: "Startup",
      default: null,
    },
  },
  { _id: true, timestamps: true }
);

const profileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      trim: true,
      default: "",
    },

    college: {
      type: String,
      trim: true,
      default: "",
    },

    year: {
      type: String,
      trim: true,
      default: "",
    },

    branch: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 280,
      default: "",
    },

    avatarUrl: {
      type: String,
      default: "/images/default.svg",
    },

    role: {
      type: String,
      enum: ["FOUNDER", "JOINER", "BOTH"],
      default: null,
    },

    skills: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    interests: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    lookingFor: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    pastWork: {
      type: [pastWorkSchema],
      default: [],
    },

    linkedStartups: {
      type: [linkedStartupSchema],
      default: [],
    },

    availabilityStatus: {
      type: String,
      enum: ["Open to join", "Looking for co-founder", "Just exploring"],
      default: "Just exploring",
    },

    weeklyHoursAvailable: {
      type: Number,
      min: 0,
      max: 168,
      default: 0,
    },

    isBuilder: {
      type: Boolean,
      default: false,
    },

    builderBadgeAwardedAt: {
      type: Date,
      default: null,
    },

    profileCompletionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    socialLinks: {
      linkedin: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      portfolio: { type: String, trim: true, default: "" },
    },

    privacy: {
      hideYear: { type: Boolean, default: false },
      hideBranch: { type: Boolean, default: false },
      allowIntroRequests: { type: Boolean, default: true },
    },

    reputationCount: {
      type: Number,
      default: 0,
    },

    weeklyStreak: {
      type: Number,
      default: 0,
    },

    founderDetails: {
      startupName: { type: String, default: "" },
      stage: { type: String, default: "" },
    },

    joinerDetails: {
      skills: [{ type: String, trim: true }],
      graduationYear: { type: Number },
    },

    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to synchronize skills and recalculate completion and badge.
profileSchema.pre("save", async function () {
  if (this.joinerDetails?.skills?.length && !this.skills?.length) {
    this.skills = [...this.joinerDetails.skills];
  } else if (this.skills?.length && !this.joinerDetails?.skills?.length) {
    this.joinerDetails.skills = [...this.skills];
  }

  const result = calculateProfileCompletion(this);
  this.profileCompletionPercentage = result.completionPercentage;
  this.isBuilder = result.isBuilder;
  if (this.isBuilder && !this.builderBadgeAwardedAt) {
    this.builderBadgeAwardedAt = new Date();
  } else if (!this.isBuilder) {
    this.builderBadgeAwardedAt = null;
  }
});

const Profile = model("Profile", profileSchema);

export default Profile;
