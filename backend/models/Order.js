const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING'
    },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    review: {
        rating: { type: Number },
        comment: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
