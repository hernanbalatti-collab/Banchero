-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Envio" (
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
    "repartidorId" TEXT,
    "entregadoPor" TEXT,
    "recibidoPor" TEXT,
    "recibidoDni" TEXT,
    "fechaEntrega" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Envio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_depositoOrigenId_fkey" FOREIGN KEY ("depositoOrigenId") REFERENCES "Deposito" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "Deposito" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Envio_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Envio_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "Chofer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Envio" ("bultos", "clienteId", "codigo", "createdAt", "depositoDestinoId", "depositoOrigenId", "descripcion", "destinatarioNombre", "destinatarioTelefono", "direccionEntrega", "entregaDomicilio", "estado", "fechaEntrega", "id", "pesoKg", "precio", "recibidoPor", "updatedAt", "valorDeclarado", "viajeId") SELECT "bultos", "clienteId", "codigo", "createdAt", "depositoDestinoId", "depositoOrigenId", "descripcion", "destinatarioNombre", "destinatarioTelefono", "direccionEntrega", "entregaDomicilio", "estado", "fechaEntrega", "id", "pesoKg", "precio", "recibidoPor", "updatedAt", "valorDeclarado", "viajeId" FROM "Envio";
DROP TABLE "Envio";
ALTER TABLE "new_Envio" RENAME TO "Envio";
CREATE UNIQUE INDEX "Envio_codigo_key" ON "Envio"("codigo");
CREATE INDEX "Envio_estado_idx" ON "Envio"("estado");
CREATE INDEX "Envio_clienteId_idx" ON "Envio"("clienteId");
CREATE INDEX "Envio_viajeId_idx" ON "Envio"("viajeId");
CREATE INDEX "Envio_repartidorId_idx" ON "Envio"("repartidorId");
CREATE INDEX "Envio_fechaEntrega_idx" ON "Envio"("fechaEntrega");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
