// Handler to open a Zoom room immediately (variant: openroom)
const zoomService = require('../../services/zoomService');

async function handleOpenRoom(ctx) {
  try {
    // Create an instant meeting (type: 1)
    const meetingData = {
      title: 'PNPtv Open Room',
      startTime: new Date(),
      duration: 60,
      description: 'Sala Zoom abierta para la comunidad',
    };
    // Override type for instant meeting
    const token = await zoomService.getAccessToken();
    const payload = {
      topic: meetingData.title,
      type: 1, // Instant meeting
      duration: meetingData.duration,
      agenda: meetingData.description,
      settings: {
        host_video: false, // No host needed
        participant_video: true,
        join_before_host: true, // Anyone can join anytime
        mute_upon_entry: true, // Everyone silenced
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: 'none',
        waiting_room: false, // No waiting room
        meeting_authentication: false,
        use_pmi: true, // Use Personal Meeting ID for permanent room
      },
    };
    const axios = require('axios');
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const meeting = response.data;
    await ctx.reply(`✅ Zoom room opened!\nJoin: ${meeting.join_url}`);
  } catch (err) {
    console.error('Error opening Zoom room:', err);
    await ctx.reply('❌ Error opening Zoom room. Please try again later.');
  }
}

module.exports = { handleOpenRoom };
