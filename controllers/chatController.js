const Message = require('../models/message');
const User = require('../models/user');
const Mentor = require('../models/mentor');

module.exports.renderChatPage = async (req, res) => {
  const senderId = req.user._id;
  const receiverId = req.params.userId;

  if (!senderId || !receiverId) {
    req.flash("error", "Invalid chat IDs.");
    return res.redirect("back");
  }

  try {
    let receiverUser;

    // 1. Try finding by User ID directly
    receiverUser = await User.findById(receiverId);

    // 2. If not found, try as a Mentor
    if (!receiverUser) {
      const mentor = await Mentor.findById(receiverId);
      if (mentor) receiverUser = await User.findById(mentor.userId);
    }


    // 5. Validate the receiver user
    if (!receiverUser) {
      req.flash("error", "User not found.");
      return res.redirect("back");
    }

    // 6. Fetch chat messages
    const messages = await Message.find({
      $or: [
        { senderId, receiverId: receiverUser._id },
        { senderId: receiverUser._id, receiverId: senderId }
      ]
    }).sort("timestamp");

    return res.render('user/chat.ejs', {
      messages,
      senderId,
      receiver: receiverUser,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong loading chat.");
    return res.redirect("back");
  }
};
