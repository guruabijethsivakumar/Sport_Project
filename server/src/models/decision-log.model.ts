import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { Collections } from '../constants/collections.js';
import {
  DecisionTypes,
  FactorImpacts,
  type DecisionType,
  type FactorImpact,
} from '../constants/explainability-constants.js';

export interface IDecisionFactor {
  name: string;
  value: number;
  weight?: number;
  impact: FactorImpact;
}

export interface IDecisionLog {
  decisionType: DecisionType;
  subjectId: string;
  actorId: Types.ObjectId;
  inputSnapshot: Record<string, unknown>;
  outputDecision: Record<string, unknown>;
  factors: IDecisionFactor[];
  metrics: Record<string, number | string | boolean>;
  codes: string[];
  summary: string;
  reasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDecisionLogDocument extends IDecisionLog, Document {
  id: string;
}

const decisionFactorSchema = new Schema<IDecisionFactor>(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    weight: { type: Number },
    impact: {
      type: String,
      enum: Object.values(FactorImpacts),
      default: FactorImpacts.NEUTRAL,
    },
  },
  { _id: false },
);

const decisionLogSchema = new Schema<IDecisionLogDocument>(
  {
    decisionType: {
      type: String,
      enum: Object.values(DecisionTypes),
      required: true,
      index: true,
    },
    subjectId: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: Collections.USERS,
      required: true,
      index: true,
    },
    inputSnapshot: {
      type: Schema.Types.Mixed,
      default: {},
    },
    outputDecision: {
      type: Schema.Types.Mixed,
      default: {},
    },
    factors: {
      type: [decisionFactorSchema],
      default: [],
    },
    metrics: {
      type: Schema.Types.Mixed,
      default: {},
    },
    codes: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      required: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  {
    collection: Collections.DECISION_LOGS,
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id ? String(ret._id) : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

decisionLogSchema.index({ actorId: 1, createdAt: -1 });
decisionLogSchema.index({ decisionType: 1, subjectId: 1, createdAt: -1 });

export const DecisionLog: Model<IDecisionLogDocument> = model<IDecisionLogDocument>(
  'DecisionLog',
  decisionLogSchema,
);
