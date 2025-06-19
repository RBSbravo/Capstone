const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { CustomReport, User } = require('../models');
const analyticsService = require('../services/analyticsService');

// Configure your email transport (update with your SMTP credentials)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password'
  }
});

async function sendReportEmail(to, subject, text, html) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject,
    text,
    html
  });
}

// Helper to format report data as text (can be improved for HTML/PDF)
function formatReportData(report, data) {
  return `Report: ${report.name}\nType: ${report.type}\n\nData:\n${JSON.stringify(data, null, 2)}`;
}

// Main scheduled job: runs every hour (can be adjusted)
cron.schedule('0 * * * *', async () => {
  console.log('[Scheduler] Checking for scheduled reports...');
  const now = new Date();
  const reports = await CustomReport.findAll({
    where: { isActive: true, schedule: { [CustomReport.sequelize.Op.ne]: null } },
    include: [{ model: User, as: 'reportCreator', attributes: ['email', 'username'] }]
  });

  for (const report of reports) {
    // Example: schedule = { cron: '0 8 * * 1', lastSent: '2024-06-01T08:00:00Z' }
    const { cron: cronExpr, lastSent } = report.schedule || {};
    if (!cronExpr) continue;

    // Use node-cron's validate to check if it's time to send
    const shouldSend = cron.validate(cronExpr) && cron.schedule(cronExpr, () => {}, { scheduled: false }).nextDates().toDate() <= now && (!lastSent || new Date(lastSent) < now);
    if (!shouldSend) continue;

    // Generate report data
    let reportData;
    try {
      const result = await analyticsService.generateCustomReport(report.id);
      reportData = result.data;
    } catch (err) {
      console.error(`[Scheduler] Failed to generate report ${report.id}:`, err);
      continue;
    }

    // Send email
    try {
      await sendReportEmail(
        report.reportCreator.email,
        `Scheduled Report: ${report.name}`,
        formatReportData(report, reportData)
      );
      // Update lastSent
      report.schedule.lastSent = now;
      await report.update({ schedule: report.schedule });
      console.log(`[Scheduler] Sent report ${report.id} to ${report.reportCreator.email}`);
    } catch (err) {
      console.error(`[Scheduler] Failed to send report ${report.id}:`, err);
    }
  }
});

module.exports = {}; 