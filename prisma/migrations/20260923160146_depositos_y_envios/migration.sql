-- CreateTable
CREATE TABLE "Deposito" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT
);

-- CreateTable
CREATE TABLE "Envio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "clienteId" TEXT NOT NULL,
    "depositoOrigenId" TEXT NOT NULL,
    "depositoDestinoId" TEXT NOT NULL,
    "destinatarioNombre" TEXT NOT NULL,
    "destinatarioTelefono" TEXT,
    "entregaDomicilio" BOOLEAN NOT NULL DEFAULT false,
    "direccionEntrega" TEXT,
    "descripcion" TEXT NOT NULL,
    "bultos" INTEGER NOT NULL DEFAULT 1,
    "pesoKg" REAL,
    "valorDeclarado" DECIMAL,
    "precio" DECIMAL NOT NULL,
    "viajeId" TEXT,
    "recibidoPor" TEXT,
    "fechaEntrega" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Envio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_depositoOrigenId_fkey" FOREIGN KEY ("depositoOrigenId") REFERENCES "Deposito" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "Deposito" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventoEnvio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "envioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "depositoId" TEXT,
    "nota" TEXT,
    "usuarioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoEnvio_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "Envio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventoEnvio_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventoEnvio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Viaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "clienteId" TEXT,
    "depositoOrigenId" TEXT,
    "depositoDestinoId" TEXT,
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
    CONSTRAINT "Viaje_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_depositoOrigenId_fkey" FOREIGN KEY ("depositoOrigenId") REFERENCES "Deposito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "Deposito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Chofer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_acopladoId_fkey" FOREIGN KEY ("acopladoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Viaje_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Viaje" ("acopladoId", "cartaPorte", "choferId", "clienteId", "createdAt", "descripcionCarga", "destino", "estado", "facturaId", "fechaCarga", "fechaEntrega", "fechaEntregaEstimada", "id", "kmEstimados", "numero", "observaciones", "origen", "pesoKg", "remito", "tarifa", "updatedAt", "vehiculoId") SELECT "acopladoId", "cartaPorte", "choferId", "clienteId", "createdAt", "descripcionCarga", "destino", "estado", "facturaId", "fechaCarga", "fechaEntrega", "fechaEntregaEstimada", "id", "kmEstimados", "numero", "observaciones", "origen", "pesoKg", "remito", "tarifa", "updatedAt", "vehiculoId" FROM "Viaje";
DROP TABLE "Viaje";
ALTER TABLE "new_Viaje" RENAME TO "Viaje";
CREATE UNIQUE INDEX "Viaje_numero_key" ON "Viaje"("numero");
CREATE INDEX "Viaje_estado_idx" ON "Viaje"("estado");
CREATE INDEX "Viaje_clienteId_idx" ON "Viaje"("clienteId");
CREATE INDEX "Viaje_choferId_idx" ON "Viaje"("choferId");
CREATE INDEX "Viaje_fechaCarga_idx" ON "Viaje"("fechaCarga");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Deposito_nombre_key" ON "Deposito"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Envio_codigo_key" ON "Envio"("codigo");

-- CreateIndex
CREATE INDEX "Envio_estado_idx" ON "Envio"("estado");

-- CreateIndex
CREATE INDEX "Envio_clienteId_idx" ON "Envio"("clienteId");

-- CreateIndex
CREATE INDEX "Envio_viajeId_idx" ON "Envio"("viajeId");

-- CreateIndex
CREATE INDEX "EventoEnvio_envioId_idx" ON "EventoEnvio"("envioId");

-- Depósitos de la empresa
INSERT INTO "Deposito" ("id", "nombre", "direccion") VALUES ('dep_chivilcoy', 'Chivilcoy', NULL);
INSERT INTO "Deposito" ("id", "nombre", "direccion") VALUES ('dep_caba', 'CABA', NULL);
