const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const PDFDocument = require('pdfkit');
const path = require('path');

const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.query;
        const order = await Order.findById(id).populate('orderedItems.product');
        
      

        const doc = new PDFDocument({ margin: 50 });

        const filename = `invoice-${order.orderId}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        generateHeader(doc);
        doc.moveDown();

        generateCustomerInformation(doc, order);
        doc.moveDown();

        generateInvoiceTable(doc, order);
        doc.moveDown();

        generateFooter(doc, order);

        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice");
    }
};

const generateHeader = (doc) => {
    doc
        .image('public/evara-frontend/assets/imgs/theme/mp-perfume-logo-2.jpg', 50, 45, { width: 50 })
        .fillColor('#444444')
        .fontSize(20)
        .text('MapRoneZ', 110, 57)
        .fontSize(10)
        .text('MapRoneZ', 200, 50, { align: 'right' })
        .moveDown();

    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, 90)
        .lineTo(550, 90)
        .stroke();
};

const generateCustomerInformation = async (doc, order) => {
    const customerInfoTop = 100;

    doc
        .fontSize(16)
        .text('Invoice', 50, customerInfoTop)
        .fontSize(10)
        .text(`Invoice No.: ${order.orderId}`, 50, customerInfoTop + 30)
        .text(`Invoice Date: ${order.createdAt.toLocaleDateString()}`, 50, customerInfoTop + 45)
        .text(`Due Date: ${order.createdAt.toLocaleDateString()}`, 50, customerInfoTop + 60)

        .text('Bill To:', 300, customerInfoTop + 30)
        .font('Helvetica-Bold')
        .text(order.address.name, 300, customerInfoTop + 45)
        .font('Helvetica')
        .text(order.address.streetAddress, 300, customerInfoTop + 60)
        .text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, 300, customerInfoTop + 75)
        .text(`Phone: ${order.address.phone}`, 300, customerInfoTop + 90)
        .moveDown();

    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, customerInfoTop + 110)
        .lineTo(550, customerInfoTop + 110)
        .stroke();
};

const generateInvoiceTable = (doc, order) => {
    let i;
    const invoiceTableTop = 330;
    const tableTop = 250;

    doc
        .fontSize(10)
        .text('Item', 50, tableTop)
        .text('Description', 150, tableTop)
        .text('Unit Price', 280, tableTop, { width: 90, align: 'right' })
        .text('Quantity', 370, tableTop, { width: 90, align: 'right' })
        .text('Line Total', 470, tableTop, { width: 90, align: 'right' });

    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

    let position = 0;
    order.orderedItems.forEach((item, index) => {
        position = tableTop + 30 + (index * 30);

        doc
            .fontSize(10)
            .text(`${index + 1}`, 50, position)
            .text(item.product.productName, 150, position)
            .text("₹"+item.product.salePrice.toLocaleString(), 280, position, { width: 90, align: 'right' })
            .text(item.quantity.toString(), 370, position, { width: 90, align: 'right' })
            .text("₹"+(item.quantity * item.product.salePrice).toLocaleString(), 470, position, { width: 90, align: 'right' });
    });

    const subtotalPosition = position + 30;
    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, subtotalPosition)
        .lineTo(550, subtotalPosition)
        .stroke();

    doc
        .fontSize(10)
        .text('Subtotal:', 380, subtotalPosition + 15)
        .text("₹"+order.totalPrice.toLocaleString(), 470, subtotalPosition + 15, { width: 90, align: 'right' })
        .text('Discount:', 380, subtotalPosition + 30)
        .text("₹"+order.discount.toLocaleString(), 470, subtotalPosition + 30, { width: 90, align: 'right' })
        .text('Amount (before GST):', 380, subtotalPosition + 45)
        .text("₹"+(order.totalWithoutGst || (order.totalPrice - order.discount)).toLocaleString(), 470, subtotalPosition + 45, { width: 90, align: 'right' })
        .text('GST (18%):', 380, subtotalPosition + 60)
        .text("₹"+(order.gstAmount || ((order.totalPrice - order.discount) * 0.18)).toLocaleString(), 470, subtotalPosition + 60, { width: 90, align: 'right' })
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total Amount:', 380, subtotalPosition + 75)
        .text("₹"+order.finalAmount.toLocaleString(), 470, subtotalPosition + 75, { width: 90, align: 'right' });
};

const generateFooter = (doc, order) => {
    doc
        .fontSize(10)
        .text('Payment Status:', 50, 700)
        .fillColor(order.paymentStatus === 'PAID' ? '#008000' : '#FF0000')
        .text(order.paymentStatus, 120, 700)
        .fillColor('#444444')
        .text('Shipment Status:', 50, 715)
        .text(order.status, 120, 715)
        .fontSize(10)
        .text('Thank you for your business. For any queries, please contact support@yourcompany.com', 50, 750, { align: 'center' });
};

module.exports = {
    downloadInvoice
};