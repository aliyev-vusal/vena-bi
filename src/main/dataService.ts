import * as duckdb from 'duckdb'

export interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

export type LoadFileResult =
  | { success: true; fields: Field[]; rowCount: number; filePath: string }
  | { success: false; error: string; canceled?: boolean }

// DuckDB numeric types → measure; everything else → dimension
const NUMERIC_PREFIXES = [
  'INTEGER', 'BIGINT', 'HUGEINT', 'UBIGINT', 'UINTEGER',
  'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL',
  'DECIMAL', 'NUMERIC', 'INT', 'INT4', 'INT8'
]

function inferFieldType(duckType: string): 'dimension' | 'measure' {
  const upper = duckType.toUpperCase()
  return NUMERIC_PREFIXES.some((t) => upper === t || upper.startsWith(t + '('))
    ? 'measure'
    : 'dimension'
}

class DataService {
  private db: duckdb.Database
  private conn: duckdb.Connection

  constructor() {
    this.db = new duckdb.Database(':memory:')
    this.conn = this.db.connect()
  }

  loadFile(filePath: string): Promise<LoadFileResult> {
    // Normalize path separators and escape single quotes for SQL
    const safePath = filePath.replace(/\\/g, '/').replace(/'/g, "''")

    return new Promise((resolve) => {
      // DuckDB auto-detects CSV and Parquet from file extension
      this.conn.run(
        `CREATE OR REPLACE VIEW current_table AS SELECT * FROM '${safePath}'`,
        (err) => {
          if (err) {
            resolve({ success: false, error: err.message })
            return
          }

          this.conn.all('DESCRIBE current_table', (err2, rows) => {
            if (err2) {
              resolve({ success: false, error: err2.message })
              return
            }

            this.conn.all('SELECT COUNT(*) AS cnt FROM current_table', (err3, countRows) => {
              const rowCount = err3 ? 0 : Number((countRows[0] as Record<string, unknown>).cnt)

              const fields: Field[] = (rows as Record<string, unknown>[]).map((row) => {
                const dataType = String(row.column_type)
                return {
                  name: String(row.column_name),
                  type: inferFieldType(dataType),
                  dataType
                }
              })

              resolve({ success: true, fields, rowCount, filePath })
            })
          })
        }
      )
    })
  }
}

export const dataService = new DataService()
