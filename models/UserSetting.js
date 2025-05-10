const mongoose = require('mongoose');

const userSettingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    notificationPreferences: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
    },
    // Add other setting fields as needed (e.g., theme, privacy settings)
});

const UserSetting = mongoose.model('UserSetting', userSettingSchema);

module.exports = UserSetting;