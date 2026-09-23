-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "choferId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Usuario_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Chofer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "condicionIva" TEXT NOT NULL DEFAULT 'RESPONSABLE_INSCRIPTO',
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patente" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER,
    "capacidadKg" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "vencimientoVtv" DATETIME,
    "vencimientoSeguro" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Chofer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "categoriaLicencia" TEXT,
    "vencimientoLicencia" DATETIME,
    "vencimientoLinti" DATETIME,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Viaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "clienteId" TEXT NOT NULL,
    "choferId" TEXT,
    "vehiculoId" TEXT,
    "acopladoId" TEXT,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "fechaCarga" DATETIME NOT NULL,
    "fechaEntregaEstimada" DATETIME,
    "fechaEntrega" DATETIME,
    "descripcionCarga" TEXT NOT NULL,
    "pesoKg" INTEGER,
    "kmEstimados" INTEGER,
    "tarifa" DECIMAL NOT NULL,
    "cartaPorte" TEXT,
    "remito" TEXT,
    "observaciones" TEXT,
    "facturaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Viaje_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Viaje_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Chofer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_acopladoId_fkey" FOREIGN KEY ("acopladoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventoViaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viajeId" TEXT NOT NULL,
    "estado" TEXT,
    "nota" TEXT,
    "ubicacion" TEXT,
    "usuarioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoViaje_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventoViaje_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viajeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gasto_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL DEFAULT 1,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "vencimiento" DATETIME,
    "subtotal" DECIMAL NOT NULL,
    "iva" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'EMITIDA',
    "fechaPago" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_choferId_key" ON "Usuario"("choferId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cuit_key" ON "Cliente"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_patente_key" ON "Vehiculo"("patente");

-- CreateIndex
CREATE UNIQUE INDEX "Chofer_dni_key" ON "Chofer"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Viaje_numero_key" ON "Viaje"("numero");

-- CreateIndex
CREATE INDEX "Viaje_estado_idx" ON "Viaje"("estado");

-- CreateIndex
CREATE INDEX "Viaje_clienteId_idx" ON "Viaje"("clienteId");

-- CreateIndex
CREATE INDEX "Viaje_choferId_idx" ON "Viaje"("choferId");

-- CreateIndex
CREATE INDEX "Viaje_fechaCarga_idx" ON "Viaje"("fechaCarga");

-- CreateIndex
CREATE INDEX "EventoViaje_viajeId_idx" ON "EventoViaje"("viajeId");

-- CreateIndex
CREATE INDEX "Gasto_viajeId_idx" ON "Gasto"("viajeId");

-- CreateIndex
CREATE INDEX "Factura_clienteId_idx" ON "Factura"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_tipo_puntoVenta_numero_key" ON "Factura"("tipo", "puntoVenta", "numero");
