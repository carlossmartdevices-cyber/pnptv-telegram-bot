const axios = require("axios");

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.baseUrl = "https://api.zoom.us/v2";
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   * Implements token caching to reduce API calls
   */
  async getAccessToken() {
    // Return cached token if still valid (with 5-minute buffer)
    if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      return this.tokenCache;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

      const response = await axios.post(
        "https://zoom.us/oauth/token",
        null,
        {
          params: {
            grant_type: "account_credentials",
            account_id: this.accountId,
          },
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.tokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.tokenCache;
    } catch (error) {
      console.error("Zoom OAuth Error:", error.response?.data || error.message);
      throw new Error("Failed to authenticate with Zoom API");
    }
  }

  /**
   * Create a Zoom meeting
   * @param {Object} meetingData - Meeting configuration
   * @param {string} meetingData.title - Meeting title
   * @param {Date|string} meetingData.startTime - Meeting start time (ISO string)
   * @param {number} meetingData.duration - Duration in minutes
   * @param {string} meetingData.description - Meeting description (optional)
   * @param {string} meetingData.password - Meeting password (optional)
   * @returns {Object} Meeting details including join URL
   */
  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();

      // Prepare meeting payload
      const payload = {
        topic: meetingData.title || "PNPtv Video Call",
        type: 2, // Scheduled meeting
        start_time: typeof meetingData.startTime === 'string'
          ? meetingData.startTime
          : meetingData.startTime.toISOString(),
        duration: meetingData.duration || 60,
        timezone: "America/Bogota", // Colombia timezone
        agenda: meetingData.description || "",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: meetingData.joinBeforeHost ?? true,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: "both",
          auto_recording: "none",
          waiting_room: meetingData.waitingRoom ?? false,
          // Optional password protection
          ...(meetingData.password && {
            meeting_authentication: false,
            password: meetingData.password,
          }),
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const meeting = response.data;

      return {
        success: true,
        meetingId: meeting.id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password || meetingData.password,
        startTime: meeting.start_time,
        duration: meeting.duration,
        topic: meeting.topic,
      };
    } catch (error) {
      console.error("Zoom Create Meeting Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create Zoom meeting",
      };
    }
  }

  /**
   * Delete a Zoom meeting
   * @param {string} meetingId - Zoom meeting ID
   * @returns {Object} Success status
   */
  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();

      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Zoom Delete Meeting Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete Zoom meeting",
      };
    }
  }

  /**
   * Get meeting details
   * @param {string} meetingId - Zoom meeting ID
   * @returns {Object} Meeting details
   */
  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const meeting = response.data;

      return {
        success: true,
        meetingId: meeting.id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        topic: meeting.topic,
        startTime: meeting.start_time,
        duration: meeting.duration,
        status: meeting.status,
      };
    } catch (error) {
      console.error("Zoom Get Meeting Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get Zoom meeting",
      };
    }
  }

  /**
   * Update a Zoom meeting
   * @param {string} meetingId - Zoom meeting ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Success status
   */
  async updateMeeting(meetingId, updates) {
    try {
      const token = await this.getAccessToken();

      const payload = {};
      if (updates.title) payload.topic = updates.title;
      if (updates.startTime) {
        payload.start_time = typeof updates.startTime === 'string'
          ? updates.startTime
          : updates.startTime.toISOString();
      }
      if (updates.duration) payload.duration = updates.duration;
      if (updates.description) payload.agenda = updates.description;

      await axios.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return { success: true };
    } catch (error) {
      console.error("Zoom Update Meeting Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update Zoom meeting",
      };
    }
  }
}

// Export singleton instance
module.exports = new ZoomService();
