# Comisiones por pagar — Manual de uso

**Ruta:** `/comisiones-por-pagar`  
**Acceso:** Restringido (módulo **comisiones-por-pagar**).

## Objetivo

Registrar comisiones de ventas por **vendedor** y **cliente**, con cuotas de pago, facturas y fechas de cobro.

## Consulta

1. Listado de encabezados (vendedor, cliente, valor del servicio, % comisión, estado).
2. Clic en una fila → panel de **detalle** con tabla de pagos (1er, 2do, 3er pago…).

## Alta y edición (administradores)

Solo usuarios **admin** ven botones de crear, editar encabezado y eliminar.

1. **Nueva comisión:** vendedor, cliente, valor, moneda (PEN/USD), % comisión, condiciones de pago.
2. En el detalle, **agregar pago:** forma, importe, N° factura, fechas de emisión y pago, firma/observaciones.
3. Actualiza estados según avance real de cobranza.

## Usuarios no admin

Pueden **consultar** el listado y detalle si tienen el módulo activo; no modifican registros.

## Portal

**Proyectos y análisis** → **Comisiones por Pagar** → **Ver detalle**.
