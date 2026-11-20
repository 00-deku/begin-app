import { Schema, model } from "mongoose";

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

    bio: {
      type: String,
      maxlength: 300,
      default: "",
    },

    avatarUrl: {
      type: String,
      default: "/images/default.svg",
    },

    // Role chosen during onboarding
    role: {
      type: String,
      enum: ["FOUNDER", "JOINER", "BOTH"],
      default: null,
    },

    // Specific details based on role
    founderDetails: {
      startupName: { type: String, default: "" },
      stage: { type: String, default: "" }, // e.g. "Idea", "MVP", "Revenue"
    },

    joinerDetails: {
      skills: [{ type: String }], // e.g. ["React", "Node.js"]
      graduationYear: { type: Number },
    },

    // True once all onboarding steps are done
    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Profile = model("Profile", profileSchema);

export default Profile;