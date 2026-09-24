-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "clienteId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "pesoKg" REAL,
    "origen" TEXT,
    "destino" TEXT,
    "fechaCarga" DATETIME,
    "depositoOrigenId" TEXT,
    "depositoDestinoId" TEXT,
    "destinatarioNombre" TEXT,
    "destinatarioTelefono" TEXT,
    "entregaDomicilio" BOOLEAN NOT NULL DEFAULT false,
    "direccionEntrega" TEXT,
    "bultos" INTEGER,
    "valorDeclarado" DECIMAL,
    "observaciones" TEXT,
    "respuesta" TEXT,
    "revisadoPorId" TEXT,
    "fechaRevision" DATETIME,
    "viajeId" TEXT,
    "envioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_depositoOrigenId_fkey" FOREIGN KEY ("depositoOrigenId") REFERENCES "Deposito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "Deposito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "Envio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_viajeId_key" ON "Pedido"("viajeId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_envioId_key" ON "Pedido"("envioId");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");
