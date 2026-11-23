import { Schema, model } from "mongoose";

const teamMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    role: {
      type: String,
      trim: true,
      default: "Team Member",
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const startupInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      trim: true,
      default: "Team Member",
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED"],
      default: "PENDING",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const startupMilestoneSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    milestoneType: {
      type: String,
      enum: [
        "Idea validated",
        "Prototype ready",
        "First users",
        "Launched",
        "Won event",
        "Custom update",
      ],
      default: "Custom update",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    completedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, timestamps: true }
);

const openRoleSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    skillsNeeded: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    commitmentHours: {
      type: Number,
      min: 0,
      max: 168,
      default: 0,
    },
    roleType: {
      type: String,
      enum: ["co-founder", "teammate", "short-term collaboration"],
      default: "teammate",
    },
    equityOrCreditNote: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["OPEN", "FILLED", "CLOSED"],
      default: "OPEN",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const startupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    pitch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    problem: {
      type: String,
      trim: true,
      default: "",
    },

    solution: {
      type: String,
      trim: true,
      default: "",
    },

    industryTags: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    stage: {
      type: String,
      enum: ["Idea", "Building MVP", "Launched", "Has users"],
      default: "Idea",
    },

    visibility: {
      type: String,
      enum: ["PUBLIC", "STEALTH"],
      default: "PUBLIC",
    },

    links: {
      website: { type: String, trim: true, default: "" },
      demo: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" },
      pitchDeck: { type: String, trim: true, default: "" },
    },

    teamMembers: {
      type: [teamMemberSchema],
      default: [],
    },

    invitations: {
      type: [startupInvitationSchema],
      default: [],
    },

    openRoles: {
      type: [openRoleSchema],
      default: [],
    },

    milestones: {
      type: [startupMilestoneSchema],
      default: [],
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

startupSchema.index({ name: "text", pitch: "text", industryTags: "text" });

const Startup = model("Startup", startupSchema);

export default Startup;
