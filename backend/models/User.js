const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['CUSTOMER', 'WORKER', 'ADMIN'], default: 'CUSTOMER' },
    avatar: { type: String },
    balance: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    ratingCount: { type: Number, default: 0 },
    // Worker specific fields
    skills: [{ type: String }],
    hourlyRate: { type: Number },
    completedJobs: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
