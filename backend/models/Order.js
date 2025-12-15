const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String },
    lat: { type: Number },  // GPS koordinatasi - kenglik (latitude)
    lng: { type: Number },  // GPS koordinatasi - uzunlik (longitude)
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING'
    },
    aiSuggested: { type: Boolean, default: false },
    review: {
        rating: { type: Number },
        comment: { type: String },
        createdAt: { type: Date }
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
