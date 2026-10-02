// Conexão única com o SQLite do app (lista e ajustes usam a mesma).
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

let conexao: Promise<SQLiteDBConnection> | null = null;

export function abrirBanco(): Promise<SQLiteDBConnection> {
  conexao ??= (async () => {
    const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.createConnection("lingoflix", false, "no-encryption", 1, false);
    await db.open();
    return db;
  })();
  return conexao;
}
