const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const { isAdmin } = require("../config/admin");

/**
 * Support Ticket Service
 * Handles human support requests and ticket management
 */

const TICKET_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress', 
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Create a new support ticket
 */
async function createTicket(userId, username, message, context = {}) {
  try {
    const ticket = {
      userId: userId.toString(),
      username: username || "Unknown",
      message: message,
      context: context, // AI conversation context, plan info, etc.
      status: TICKET_STATUSES.OPEN,
      priority: TICKET_PRIORITIES.MEDIUM,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: []
    };

    const docRef = await db.collection('supportTickets').add(ticket);
    logger.info(`Support ticket created: ${docRef.id} for user ${userId}`);
    
    return { id: docRef.id, ...ticket };
  } catch (error) {
    logger.error('Error creating support ticket:', error);
    throw error;
  }
}

/**
 * Get all open tickets for admin view
 */
async function getOpenTickets(adminId = null) {
  try {
    let query = db.collection('supportTickets')
      .where('status', 'in', [TICKET_STATUSES.OPEN, TICKET_STATUSES.IN_PROGRESS])
      .orderBy('createdAt', 'desc');

    if (adminId) {
      // If specific admin, show their assigned tickets
      query = query.where('assignedTo', '==', adminId.toString());
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting open tickets:', error);
    throw error;
  }
}

/**
 * Get ticket by ID
 */
async function getTicket(ticketId) {
  try {
    const doc = await db.collection('supportTickets').doc(ticketId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting ticket:', error);
    throw error;
  }
}

/**
 * Assign ticket to admin
 */
async function assignTicket(ticketId, adminId) {
  try {
    await db.collection('supportTickets').doc(ticketId).update({
      assignedTo: adminId.toString(),
      status: TICKET_STATUSES.IN_PROGRESS,
      updatedAt: new Date()
    });
    
    logger.info(`Ticket ${ticketId} assigned to admin ${adminId}`);
    return true;
  } catch (error) {
    logger.error('Error assigning ticket:', error);
    throw error;
  }
}

/**
 * Add response to ticket
 */
async function addResponse(ticketId, adminId, message, isResolution = false) {
  try {
    const response = {
      adminId: adminId.toString(),
      message: message,
      timestamp: new Date(),
      isResolution: isResolution
    };

    const updateData = {
      responses: db.FieldValue.arrayUnion(response),
      updatedAt: new Date()
    };

    if (isResolution) {
      updateData.status = TICKET_STATUSES.RESOLVED;
    }

    await db.collection('supportTickets').doc(ticketId).update(updateData);
    logger.info(`Response added to ticket ${ticketId} by admin ${adminId}`);
    
    return response;
  } catch (error) {
    logger.error('Error adding response:', error);
    throw error;
  }
}

/**
 * Close ticket
 */
async function closeTicket(ticketId, adminId) {
  try {
    await db.collection('supportTickets').doc(ticketId).update({
      status: TICKET_STATUSES.CLOSED,
      closedBy: adminId.toString(),
      closedAt: new Date(),
      updatedAt: new Date()
    });
    
    logger.info(`Ticket ${ticketId} closed by admin ${adminId}`);
    return true;
  } catch (error) {
    logger.error('Error closing ticket:', error);
    throw error;
  }
}

/**
 * Get tickets for a specific user
 */
async function getUserTickets(userId) {
  try {
    const snapshot = await db.collection('supportTickets')
      .where('userId', '==', userId.toString())
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting user tickets:', error);
    throw error;
  }
}

/**
 * Update ticket priority
 */
async function updatePriority(ticketId, priority, adminId) {
  try {
    if (!Object.values(TICKET_PRIORITIES).includes(priority)) {
      throw new Error('Invalid priority level');
    }

    await db.collection('supportTickets').doc(ticketId).update({
      priority: priority,
      updatedAt: new Date()
    });
    
    logger.info(`Ticket ${ticketId} priority updated to ${priority} by admin ${adminId}`);
    return true;
  } catch (error) {
    logger.error('Error updating priority:', error);
    throw error;
  }
}

/**
 * Get ticket statistics for admin dashboard
 */
async function getTicketStats() {
  try {
    const [openSnapshot, inProgressSnapshot, resolvedSnapshot] = await Promise.all([
      db.collection('supportTickets').where('status', '==', TICKET_STATUSES.OPEN).get(),
      db.collection('supportTickets').where('status', '==', TICKET_STATUSES.IN_PROGRESS).get(),
      db.collection('supportTickets').where('status', '==', TICKET_STATUSES.RESOLVED).get()
    ]);

    return {
      open: openSnapshot.size,
      inProgress: inProgressSnapshot.size,
      resolved: resolvedSnapshot.size,
      total: openSnapshot.size + inProgressSnapshot.size + resolvedSnapshot.size
    };
  } catch (error) {
    logger.error('Error getting ticket stats:', error);
    throw error;
  }
}

module.exports = {
  createTicket,
  getOpenTickets,
  getTicket,
  assignTicket,
  addResponse,
  closeTicket,
  getUserTickets,
  updatePriority,
  getTicketStats,
  TICKET_STATUSES,
  TICKET_PRIORITIES
};