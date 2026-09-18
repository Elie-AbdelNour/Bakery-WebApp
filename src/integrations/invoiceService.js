const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { sendInvoiceEmail } = require("./emailService");

/**
 * Generates an invoice PDF and emails it to the customer.
 * Returns a Promise for clean async chaining in services.
 */
exports.generateAndSendInvoice = (order, customerEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, "../../invoices");
      if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

      const filePath = path.join(invoicesDir, `invoice_${order.id}.pdf`);
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // 🧾 Invoice Header
      doc.fontSize(20).text("Bakery Invoice", { align: "center" });
      doc.moveDown();

      // 🧍‍♂️ Customer Info
      doc.fontSize(12).text(`Invoice #: ${order.id}`);
      doc.text(`Customer ID: ${order.user_id}`);
      doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
      doc.moveDown();

      // 🍰 Items
      doc.fontSize(14).text("Items:");
      order.items.forEach((item) => {
        doc.text(
          `- ${item.product_name} (x${item.quantity}) - $${(
            item.price * item.quantity
          ).toFixed(2)}`
        );
      });

      doc.moveDown();
      doc.fontSize(14).text(`Total: $${order.total_amount.toFixed(2)}`, {
        align: "right",
      });

      doc.end();

      stream.on("finish", async () => {
        try {
          await sendInvoiceEmail(customerEmail, filePath, order.id);
          resolve();
        } catch (emailErr) {
          reject(emailErr);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};
