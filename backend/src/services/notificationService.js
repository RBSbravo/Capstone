// Minimal notificationService stub for testing
module.exports = {
  async createNotification({ userId, type, title, message, ticketId }) {
    // No-op for tests
    return Promise.resolve();
  }
}; 