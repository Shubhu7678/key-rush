import mongoose from 'mongoose';

const practiceSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: String, required: true },
    sentence: { type: String, maxlength: 5000, default: '' },
    mode: { type: String, enum: ['lesson', 'time', 'words', 'quote', 'race'], default: 'lesson', required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium', required: true },
    timeLimitSeconds: { type: Number, enum: [0, 15, 30, 60, 120], default: 30, required: true },
    wordCount: { type: Number, min: 0, max: 500, default: 0, required: true },
    quoteLength: { type: String, enum: ['short', 'medium', 'long'], default: 'short', required: true },
    includePunctuation: { type: Boolean, default: false, required: true },
    includeNumbers: { type: Boolean, default: false, required: true },
    wpm: { type: Number, required: true, min: 0, max: 500 },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    mistakes: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 0 },
    xpEarned: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

export const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema);
