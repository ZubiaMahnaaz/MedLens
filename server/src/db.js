import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'medlens.sqlite');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let dbInstance = null;
let SQL = null;

export async function initDatabase() {
  if (dbInstance) return dbInstance;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables
  createTables();
  saveDatabase();

  return dbInstance;
}

export function saveDatabase() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function createTables() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      full_name TEXT,
      role TEXT,
      avatar_initials TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      identifier TEXT UNIQUE,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      age INTEGER,
      sex TEXT,
      symptoms TEXT,
      existing_conditions TEXT,
      allergies TEXT,
      current_medications TEXT,
      notes TEXT,
      provenance_meta TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      title TEXT NOT NULL,
      report_type TEXT,
      report_date TEXT,
      lab_name TEXT,
      file_name TEXT,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      status TEXT,
      raw_text TEXT,
      conflicts TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS report_results (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      patient_id TEXT,
      test_name TEXT NOT NULL,
      category TEXT,
      value_raw TEXT,
      value_numeric REAL,
      unit TEXT,
      ref_range_raw TEXT,
      ref_min REAL,
      ref_max REAL,
      status TEXT,
      evaluation_reason TEXT,
      provenance TEXT,
      is_verified INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0.95,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      patient_id TEXT,
      summary_text TEXT,
      key_findings TEXT,
      questions_for_doctor TEXT,
      total_tests INTEGER,
      normal_count INTEGER,
      abnormal_count INTEGER,
      is_verified INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      report_id TEXT,
      event_type TEXT,
      description TEXT,
      details_json TEXT,
      actor_name TEXT,
      actor_role TEXT,
      created_at TEXT
    );
  `;

  dbInstance.run(schema);
}

// Database helper functions with parameter binding
export const db = {
  queryAll(sql, params = []) {
    if (!dbInstance) throw new Error("Database not initialized");
    const stmt = dbInstance.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  queryOne(sql, params = []) {
    if (!dbInstance) throw new Error("Database not initialized");
    const stmt = dbInstance.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  run(sql, params = []) {
    if (!dbInstance) throw new Error("Database not initialized");
    dbInstance.run(sql, params);
    saveDatabase();
    return true;
  }
};
