const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['PENDING', 'REVIEWED', 'RESOLVED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
