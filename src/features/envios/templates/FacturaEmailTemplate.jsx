import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr
} from '@react-email/components'

export function FacturaEmailTemplate({ factura, empresa }) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Header con logo y marca */}
          <Section style={styles.header}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td width="80">
                  <div style={styles.logoBox}>
                    <Text style={styles.logoText}>A360</Text>
                    <Text style={styles.logoSubtext}>ENERGÍA</Text>
                  </div>
                </td>
                <td align="right">
                  <Text style={styles.headerText}>{empresa.nombre}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Saludo personalizado */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Estimado/a {factura.cliente_nombre},
            </Text>

            <Text style={styles.paragraph}>
              Adjunto encontrará la factura correspondiente a los servicios de
              gestión energética del periodo <strong>{factura.periodo_texto}</strong>.
            </Text>
          </Section>

          {/* Cuadro resumen de factura */}
          <Section style={styles.invoiceBox}>
            <Text style={styles.invoiceTitle}>Resumen de Factura</Text>

            <table width="100%" cellPadding="8" cellSpacing="0">
              <tr>
                <td width="50%">
                  <Text style={styles.label}>Nº Factura:</Text>
                  <Text style={styles.value}>{factura.numero_completo}</Text>
                </td>
                <td width="50%">
                  <Text style={styles.label}>Fecha:</Text>
                  <Text style={styles.value}>{factura.fecha_formateada}</Text>
                </td>
              </tr>
              <tr>
                <td width="50%">
                  <Text style={styles.label}>Periodo:</Text>
                  <Text style={styles.value}>{factura.periodo_texto}</Text>
                </td>
                <td width="50%">
                  <Text style={styles.label}>Vencimiento:</Text>
                  <Text style={styles.value}>{factura.vencimiento_formateado}</Text>
                </td>
              </tr>
            </table>

            <Hr style={styles.divider} />

            <table width="100%" cellPadding="8" cellSpacing="0">
              <tr>
                <td width="60%">
                  <Text style={styles.totalLabel}>TOTAL A PAGAR:</Text>
                </td>
                <td width="40%" align="right">
                  <Text style={styles.totalValue}>{factura.total_formateado}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Información de pago */}
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              {factura.metodo_pago === 'domiciliacion' ? (
                <>
                  El importe será cargado en su cuenta bancaria terminada en
                  <strong> ****{factura.iban_ultimos4}</strong> en la fecha de vencimiento indicada.
                </>
              ) : (
                <>
                  Por favor, realice el pago antes de la fecha de vencimiento
                  mediante transferencia bancaria a la cuenta indicada en la factura adjunta.
                </>
              )}
            </Text>
          </Section>

          {/* Botón de descarga (solo si hay PDF URL) */}
          {factura.pdf_url && (
            <Section style={styles.buttonSection}>
              <Button href={factura.pdf_url} style={styles.button}>
                📄 Ver Factura en Línea
              </Button>
            </Section>
          )}

          {/* Información de contacto */}
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              Si tiene alguna consulta sobre esta factura, no dude en contactarnos:
            </Text>
            <Text style={styles.contact}>
              📧 {empresa.email}<br />
              📞 {empresa.telefono}
            </Text>
          </Section>

          {/* Footer con datos legales */}
          <Section style={styles.footer}>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>
              {empresa.nombre}<br />
              {empresa.direccion}<br />
              {empresa.cp} {empresa.ciudad}, {empresa.provincia}<br />
              CIF: {empresa.cif}
            </Text>
            <Text style={styles.legal}>
              Este correo electrónico y sus adjuntos son confidenciales y están
              dirigidos exclusivamente a su destinatario. Si lo ha recibido por error,
              le rogamos que lo elimine y nos lo comunique.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// Estilos inline (requerido para compatibilidad con clientes de email)
const styles = {
  body: {
    backgroundColor: '#f6f6f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px',
    maxWidth: '600px',
    borderRadius: '8px',
  },
  header: {
    padding: '20px 0',
    borderBottom: '3px solid #1B4F72',
    marginBottom: '20px',
  },
  logoBox: {
    backgroundColor: '#1B4F72',
    borderRadius: '8px',
    padding: '12px',
    width: '70px',
    textAlign: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    lineHeight: '1',
  },
  logoSubtext: {
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: 'normal',
    margin: 0,
    marginTop: '2px',
    lineHeight: '1',
    letterSpacing: '1px',
  },
  headerText: {
    fontSize: '11px',
    color: '#1B4F72',
    fontWeight: 'bold',
    margin: 0,
    lineHeight: '1.4',
  },
  content: {
    padding: '20px 0',
  },
  greeting: {
    fontSize: '16px',
    color: '#333333',
    marginBottom: '15px',
    lineHeight: '1.4',
  },
  paragraph: {
    fontSize: '14px',
    color: '#555555',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  invoiceBox: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  invoiceTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: '15px',
  },
  label: {
    fontSize: '12px',
    color: '#666666',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '15px',
    color: '#333333',
    fontWeight: 'bold',
    marginTop: '4px',
    marginBottom: '12px',
  },
  divider: {
    borderTop: '1px solid #dee2e6',
    margin: '15px 0',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333333',
    margin: 0,
  },
  totalValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1B4F72',
    margin: 0,
  },
  buttonSection: {
    textAlign: 'center',
    padding: '20px 0',
  },
  button: {
    backgroundColor: '#1B4F72',
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '15px',
    display: 'inline-block',
    border: 'none',
  },
  contact: {
    fontSize: '14px',
    color: '#1B4F72',
    lineHeight: '1.8',
    marginTop: '10px',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
    marginTop: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#888888',
    lineHeight: '1.6',
    marginBottom: '10px',
  },
  legal: {
    fontSize: '10px',
    color: '#aaaaaa',
    marginTop: '15px',
    fontStyle: 'italic',
    lineHeight: '1.4',
  },
}

export default FacturaEmailTemplate
