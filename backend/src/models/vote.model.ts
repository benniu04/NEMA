import mongoose, { Schema, Document } from 'mongoose';

export type VoteType = 'upvote' | 'downvote';

export interface IVote extends Document {
  commentId: string;
  userId: string;
  voteType: VoteType;
  createdAt: Date;
  updatedAt: Date;
}

const voteSchema = new Schema<IVote>({
  commentId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  voteType: {
    type: String,
    enum: ['upvote', 'downvote'],
    required: true
  }
}, { timestamps: true });

// One vote per user per comment
voteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

// Count votes by type for a comment
voteSchema.index({ commentId: 1, voteType: 1 });

export const Vote = mongoose.model<IVote>('Vote', voteSchema);
