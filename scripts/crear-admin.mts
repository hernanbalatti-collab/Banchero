// Crea un usuario administrador. Pensado para el primer ingreso en producción,
// donde no se corre el seed.
//
// Uso: npm run crear-admin -- <email> "<nombre>"
// La contraseña se toma de ADMIN_PASSWORD o, si no está, se genera una al azar
// y se muestra una única vez.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const [email, nombre] = process.argv.slice(2);
if (!email || !nombre) {
  console.error('Uso: npm run crear-admin -- <email> "<nombre>"');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
if (password.length < 8) {
  console.error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN }),
});

try {
  const existente = await db.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) {
    console.error(`Ya existe un usuario con el email ${email}.`);
    process.exitCode = 1;
  } else {
    await db.usuario.create({
      data: { email: email.toLowerCase(), nombre, rol: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Administrador creado: ${email.toLowerCase()}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Contraseña: ${password}   (guardala; cambiala desde Usuarios después de ingresar)`);
    }
  }
} finally {
  await db.$disconnect();
}
