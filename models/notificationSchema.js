const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['read', 'unread'],
            default: 'unread'
        },
        type: {
            type: String,
            enum: ['referral', 'order', 'product', 'wallet', 'general'],
            default: 'general'
        },
        link: {
            type: String,
            default: null
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.statics.createNotification = async function(userId, message, type, link = null, meta = {}) {
    return await this.create({
        userId,
        message,
        type,
        link,
        meta,
        status: 'unread'
    });
};

notificationSchema.statics.markAsRead = async function(notificationId) {
    return await this.findByIdAndUpdate(
        notificationId,
        { status: 'read' },
        { new: true }
    );
};

notificationSchema.statics.getUserUnreadNotifications = async function(userId) {
    return await this.find({ 
        userId, 
        status: 'unread' 
    }).sort({ createdAt: -1 });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;