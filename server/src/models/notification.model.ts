import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { Collections } from '../constants/collections.js';
import { NotificationTypes, type NotificationType } from '../constants/notification-constants.js';

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationTypes),
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: Collections.NOTIFICATIONS,
  },
);

// Compound index for efficient user-specific querying (newest first, unread first)
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

// TTL index: automatically delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema,
);
