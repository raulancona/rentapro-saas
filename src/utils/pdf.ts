import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateRentalPDF(booking: any) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(22)
  doc.setTextColor(37, 99, 235) // brand blue
  doc.text('RentaPro', 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // muted
  doc.text('Comprobante de Renta', 14, 30)

  // Booking Info
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42) // foreground
  const folio = booking.id?.slice(0, 8).toUpperCase() || 'N/A'
  doc.text(`Folio: ${folio}`, 140, 22)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 140, 28)

  // Client info
  doc.setFontSize(12)
  doc.setFont(undefined as any, 'bold')
  doc.text('Cliente', 14, 45)
  doc.setFont(undefined as any, 'normal')
  doc.setFontSize(10)
  doc.text(booking.clients?.name || 'Sin cliente asignado', 14, 52)

  // Dates
  doc.setFont(undefined as any, 'bold')
  doc.text('Período de Renta', 14, 65)
  doc.setFont(undefined as any, 'normal')
  const startDate = booking.start_date ? new Date(booking.start_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'
  const endDate = booking.end_date ? new Date(booking.end_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'
  doc.text(`Desde: ${startDate}`, 14, 72)
  doc.text(`Hasta: ${endDate}`, 14, 79)

  // Status
  const statusLabels: any = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    active: 'En Curso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }
  doc.text(`Estado: ${statusLabels[booking.status] || booking.status || 'Pendiente'}`, 140, 72)

  // Items table
  const items = booking.booking_items || []
  if (items.length > 0) {
    autoTable(doc, {
      startY: 90,
      head: [['Artículo', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: items.map((item: any) => [
        item.equipment?.name || 'Artículo',
        item.quantity || 1,
        `$${Number(item.unit_price || 0).toLocaleString()}`,
        `$${Number(item.subtotal || (item.quantity * item.unit_price) || 0).toLocaleString()}`,
      ]),
      foot: [['', '', 'TOTAL', `$${Number(booking.total_price || 0).toLocaleString()}`]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
    })
  } else {
    doc.setFontSize(11)
    doc.setFont(undefined as any, 'bold')
    doc.text(`Monto Total: $${Number(booking.total_amount || 0).toLocaleString()}`, 14, 95)
  }

  // Notes
  if (booking.notes) {
    const finalY = (doc as any).lastAutoTable?.finalY || 110
    doc.setFontSize(9)
    doc.setFont(undefined as any, 'bold')
    doc.text('Notas:', 14, finalY + 15)
    doc.setFont(undefined as any, 'normal')
    doc.text(booking.notes, 14, finalY + 22)
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Documento generado por RentaPro — Sistema de Gestión de Rentas', 14, 280)

  // Save
  doc.save(`Renta-${folio}.pdf`)
}
