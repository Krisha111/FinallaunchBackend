// import pkg from 'agora-access-token';
// const { RtcTokenBuilder, RtcRole } = pkg;

// const APP_ID = "1991693dedff48b594ad5077f75464e6"
// const APP_CERTIFICATE = "243531feb6c94e17b1a3a2e87215b238";

// // Generate Agora RTC token
// export const generateAgoraToken = async (req, res) => {
//   try {
//     const { channelName, uid = 0 } = req.body;
//     const userId = req.user._id;

//     if (!channelName) {
//       return res.status(400).json({ message: 'Channel name required' });
//     }

//     if (!APP_ID || !APP_CERTIFICATE) {
//       return res.status(500).json({ message: 'Agora credentials not configured' });
//     }

//     // Clean channel name (alphanumeric only, max 64 chars)
//     const cleanChannel = channelName
//       .replace(/[^a-zA-Z0-9_-]/g, '')
//       .substring(0, 64);

//     const role = RtcRole.PUBLISHER;
//     const expirationTimeInSeconds = 3600 * 24; // 24 hours
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

//     const token = RtcTokenBuilder.buildTokenWithUid(
//       APP_ID,
//       APP_CERTIFICATE,
//       cleanChannel,
//       uid,
//       role,
//       privilegeExpiredTs
//     );

//     res.json({
//       success: true,
//       token,
//       appId: APP_ID,
//       channelName: cleanChannel,
//       uid,
//       expiresAt: privilegeExpiredTs
//     });

//   } catch (error) {
//     console.error('Error generating Agora token:', error);
//     res.status(500).json({ message: 'Failed to generate token' });
//   }
// };

// // Initiate call
// export const initiateCall = async (req, res) => {
//   try {
//     const { recipientId, callType, callId } = req.body;
//     const callerId = req.user._id;

//     if (!recipientId || !callType) {
//       return res.status(400).json({ message: 'Recipient and call type required' });
//     }

//     const io = req.app.get('io');

//     // Find recipient socket
//     let recipientSocketId = null;
//     io.sockets.sockets.forEach((socket) => {
//       if (socket.userId === recipientId.toString()) {
//         recipientSocketId = socket.id;
//       }
//     });

//     if (!recipientSocketId) {
//       return res.status(404).json({ message: 'User is offline' });
//     }

//     const callData = {
//       callId: callId || `${callerId}_${recipientId}_${Date.now()}`,
//       from: callerId,
//       to: recipientId,
//       callType,
//       timestamp: Date.now(),
//     };

//     // Emit incoming call notification to recipient
//     io.to(recipientSocketId).emit('incoming_call', callData);

//     res.json({
//       success: true,
//       message: 'Call initiated',
//       ...callData,
//     });

//   } catch (error) {
//     console.error('Error initiating call:', error);
//     res.status(500).json({ message: 'Failed to initiate call' });
//   }
// };
// // Accept call
// export const acceptCall = async (req, res) => {
//   try {
//     const { callId, callerId } = req.body;
//     const userId = req.user._id;

//     const io = req.app.get('io');

//     // Find caller socket
//     let callerSocketId = null;
//     io.sockets.sockets.forEach((socket) => {
//       if (socket.userId === callerId) {
//         callerSocketId = socket.id;
//       }
//     });
    
//     if (callerSocketId) {
//       io.to(callerSocketId).emit('call_accepted', {
//         callId,
//         acceptedBy: userId
//       });
//     }

//     res.json({ success: true, message: 'Call accepted' });

//   } catch (error) {
//     console.error('Error accepting call:', error);
//     res.status(500).json({ message: 'Failed to accept call' });
//   }
// };

// // Reject call
// export const rejectCall = async (req, res) => {
//   try {
//     const { callId, callerId } = req.body;
//     const userId = req.user._id;

//     const io = req.app.get('io');

//     // Find caller socket
//     let callerSocketId = null;
//     io.sockets.sockets.forEach((socket) => {
//       if (socket.userId === callerId) {
//         callerSocketId = socket.id;
//       }
//     });
    
//     if (callerSocketId) {
//       io.to(callerSocketId).emit('call_rejected', {
//         callId,
//         rejectedBy: userId
//       });
//     }

//     res.json({ success: true, message: 'Call rejected' });

//   } catch (error) {
//     console.error('Error rejecting call:', error);
//     res.status(500).json({ message: 'Failed to reject call' });
//   }
// };

// // End call
// export const endCall = async (req, res) => {
//   try {
//     const { callId, otherUserId } = req.body;
//     const userId = req.user._id;

//     const io = req.app.get('io');

//     // Find other user socket
//     let otherUserSocketId = null;
//     io.sockets.sockets.forEach((socket) => {
//       if (socket.userId === otherUserId.toString()) {
//         otherUserSocketId = socket.id;
//       }
//     });

//     if (otherUserSocketId) {
//       io.to(otherUserSocketId).emit('call_ended', {
//         callId,
//         endedBy: userId,
//       });
//     }

//     res.json({ success: true, message: 'Call ended' });

//   } catch (error) {
//     console.error('Error ending call:', error);
//     res.status(500).json({ message: 'Failed to end call' });
//   }
// };