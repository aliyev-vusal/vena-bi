import * as duckdb from 'duckdb'

export interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

export type LoadFileResult =
  | { success: true; fields: Field[]; rowCount: number; filePath: string; tableName: string }
  | { success: false; error: string; canceled?: boolean }

export type TableDataResult =
  | { success: true; columns: { name: string; dataType: string }[]; rows: unknown[][]; total: number }
  | { success: false; error: string }

export interface ETLStep {
  id: string
  kind: 'rename' | 'cast' | 'remove' | 'filter_not_null'
  column: string      // original column name
  newName?: string    // for 'rename'
  castType?: string   // for 'cast'
}

export type ColumnStatsResult =
  | { success: true; stats: { name: string; dataType: string; nonNull: number; total: number; distinct: number; sample: unknown[] }[] }
  | { success: false; error: string }

// DuckDB numeric types → measure; everything else → dimension
const NUMERIC_PREFIXES = [
  'INTEGER', 'BIGINT', 'HUGEINT', 'UBIGINT', 'UINTEGER',
  'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL',
  'DECIMAL', 'NUMERIC', 'INT4', 'INT8', 'INT2', 'INT1', 'INT'
]

function inferFieldType(duckType: string): 'dimension' | 'measure' {
  const upper = duckType.toUpperCase()
  return NUMERIC_PREFIXES.some((t) => upper === t || upper.startsWith(t + '('))
    ? 'measure'
    : 'dimension'
}

function esc(s: string): string {
  return s.replace(/"/g, '""')
}

/** Build a SELECT expression that applies ETL steps to original columns from a raw file. */
function buildETLSelect(filePath: string, originalColumns: { name: string }[], steps: ETLStep[]): string {
  const removals = new Set<string>()
  const renames = new Map<string, string>()
  const casts   = new Map<string, string>()
  const filters: string[] = []

  for (const s of steps) {
    if (s.kind === 'remove') removals.add(s.column)
    if (s.kind === 'rename' && s.newName) renames.set(s.column, s.newName)
    if (s.kind === 'cast'   && s.castType) casts.set(s.column, s.castType)
    if (s.kind === 'filter_not_null') filters.push(`"${esc(s.column)}" IS NOT NULL`)
  }

  const selectParts = originalColumns
    .filter((c) => !removals.has(c.name))
    .map((c) => {
      let expr = `"${esc(c.name)}"`
      if (casts.has(c.name)) {
        expr = `TRY_CAST(${expr} AS ${casts.get(c.name)})`
      }
      const alias = renames.get(c.name)
      return alias ? `${expr} AS "${esc(alias)}"` : expr
    })

  const safePath = filePath.replace(/\\/g, '/').replace(/'/g, "''")
  let sql = `SELECT ${selectParts.join(', ')} FROM '${safePath}'`
  if (filters.length > 0) sql += ` WHERE ${filters.join(' AND ')}`
  return sql
}

class DataService {
  private db: duckdb.Database
  readonly conn: duckdb.Connection
  private tableCounter = 0

  constructor() {
    this.db = new duckdb.Database(':memory:')
    this.conn = this.db.connect()
  }

  // ── File loading ────────────────────────────────────────────────────────────

  loadFile(filePath: string): Promise<LoadFileResult> {
    const safePath = filePath.replace(/\\/g, '/').replace(/'/g, "''")
    const tableName = `src_${this.tableCounter++}`

    return new Promise((resolve) => {
      this.conn.run(
        `CREATE OR REPLACE VIEW "${esc(tableName)}" AS SELECT * FROM '${safePath}'`,
        (err) => {
          if (err) { resolve({ success: false, error: err.message }); return }

          this.conn.all(`DESCRIBE "${esc(tableName)}"`, (err2, rows) => {
            if (err2) { resolve({ success: false, error: err2.message }); return }

            this.conn.all(`SELECT COUNT(*) AS cnt FROM "${esc(tableName)}"`, (err3, countRows) => {
              const rowCount = err3 ? 0 : Number((countRows[0] as Record<string, unknown>).cnt)
              const fields: Field[] = (rows as Record<string, unknown>[]).map((row) => {
                const dataType = String(row.column_type)
                return { name: String(row.column_name), type: inferFieldType(dataType), dataType }
              })
              resolve({ success: true, fields, rowCount, filePath, tableName })
            })
          })
        }
      )
    })
  }

  // ── ETL: preview (dry-run, no view rebuild) ─────────────────────────────────

  applyETLPreview(tableName: string, filePath: string, steps: ETLStep[]): Promise<TableDataResult> {
    // Get original columns from the raw file (not the view, which may be transformed)
    const safePath = filePath.replace(/\\/g, '/').replace(/'/g, "''")
    return new Promise((resolve) => {
      this.conn.all(`DESCRIBE SELECT * FROM '${safePath}' LIMIT 1`, (err, schemaRows) => {
        if (err) { resolve({ success: false, error: err.message }); return }
        const origCols = (schemaRows as Record<string, unknown>[]).map((r) => ({
          name: String(r.column_name),
          dataType: String(r.column_type)
        }))
        const selectSQL = buildETLSelect(filePath, origCols, steps)
        const previewSQL = `${selectSQL} LIMIT 500`

        this.conn.all(previewSQL, (e2, rows) => {
          if (e2) { resolve({ success: false, error: e2.message }); return }

          // Derive column list from applied steps
          const removals = new Set(steps.filter(s => s.kind === 'remove').map(s => s.column))
          const renames = new Map(steps.filter(s => s.kind === 'rename' && s.newName).map(s => [s.column, s.newName!]))
          const casts   = new Map(steps.filter(s => s.kind === 'cast' && s.castType).map(s => [s.column, s.castType!]))
          const columns = origCols
            .filter(c => !removals.has(c.name))
            .map(c => ({
              name: renames.get(c.name) ?? c.name,
              dataType: casts.get(c.name) ?? c.dataType
            }))

          const dataRows = (rows as Record<string, unknown>[]).map((row) =>
            columns.map((col) => row[col.name] ?? null)
          )
          resolve({ success: true, columns, rows: dataRows, total: dataRows.length })
        })
      })
    })
  }

  // ── ETL: apply (rebuild view permanently) ──────────────────────────────────

  applyETLSteps(tableName: string, filePath: string, steps: ETLStep[]): Promise<LoadFileResult> {
    const safePath = filePath.replace(/\\/g, '/').replace(/'/g, "''")
    return new Promise((resolve) => {
      // Get original columns from raw file
      this.conn.all(`DESCRIBE SELECT * FROM '${safePath}' LIMIT 1`, (err, schemaRows) => {
        if (err) { resolve({ success: false, error: err.message }); return }
        const origCols = (schemaRows as Record<string, unknown>[]).map((r) => ({
          name: String(r.column_name),
          dataType: String(r.column_type)
        }))

        const selectSQL = buildETLSelect(filePath, origCols, steps)
        const viewSQL = `CREATE OR REPLACE VIEW "${esc(tableName)}" AS ${selectSQL}`

        this.conn.run(viewSQL, (e2) => {
          if (e2) { resolve({ success: false, error: e2.message }); return }

          this.conn.all(`DESCRIBE "${esc(tableName)}"`, (e3, descRows) => {
            if (e3) { resolve({ success: false, error: e3.message }); return }
            this.conn.all(`SELECT COUNT(*) AS cnt FROM "${esc(tableName)}"`, (e4, cntRows) => {
              const rowCount = e4 ? 0 : Number((cntRows[0] as Record<string, unknown>).cnt)
              const fields: Field[] = (descRows as Record<string, unknown>[]).map((r) => {
                const dataType = String(r.column_type)
                return { name: String(r.column_name), type: inferFieldType(dataType), dataType }
              })
              resolve({ success: true, fields, rowCount, filePath, tableName })
            })
          })
        })
      })
    })
  }

  // ── Column stats ────────────────────────────────────────────────────────────

  getColumnStats(tableName: string): Promise<ColumnStatsResult> {
    const safe = esc(tableName)
    return new Promise((resolve) => {
      this.conn.all(`DESCRIBE "${safe}"`, (e1, schemaRows) => {
        if (e1) { resolve({ success: false, error: e1.message }); return }
        const columns = (schemaRows as Record<string, unknown>[]).map((r) => ({
          name: String(r.column_name),
          dataType: String(r.column_type)
        }))

        // Single batched query: total + COUNT/COUNT DISTINCT for every column at once
        // Indexed aliases (_nn_0, _dc_0) avoid any special-char issues in column names
        const countExprs = columns.flatMap((c, i) => [
          `COUNT("${esc(c.name)}") AS "_nn_${i}"`,
          `COUNT(DISTINCT "${esc(c.name)}") AS "_dc_${i}"`
        ])
        const batchSQL = `SELECT COUNT(*) AS _total_, ${countExprs.join(', ')} FROM "${safe}"`

        this.conn.all(batchSQL, (e2, batchRows) => {
          if (e2) { resolve({ success: false, error: e2.message }); return }
          const batchRow = (batchRows as Record<string, unknown>[])[0] ?? {}
          const total = Number(batchRow['_total_'] ?? 0)

          // Per-column sample queries only (N round-trips instead of N*2+1)
          const promises = columns.map((col, i) =>
            new Promise<{ name: string; dataType: string; nonNull: number; total: number; distinct: number; sample: unknown[] }>((res) => {
              this.conn.all(
                `SELECT DISTINCT "${esc(col.name)}" AS v FROM "${safe}" WHERE "${esc(col.name)}" IS NOT NULL LIMIT 5`,
                (_e3, sampleRows) => {
                  res({
                    name: col.name,
                    dataType: col.dataType,
                    nonNull: Number(batchRow[`_nn_${i}`] ?? 0),
                    total,
                    distinct: Number(batchRow[`_dc_${i}`] ?? 0),
                    sample: (sampleRows as Record<string, unknown>[]).map((sr) => sr['v'])
                  })
                }
              )
            })
          )

          Promise.all(promises).then((stats) => resolve({ success: true, stats }))
        })
      })
    })
  }

  // ── Data access ─────────────────────────────────────────────────────────────

  queryColumns(tableName: string, columns: string[], limit = 500): Promise<TableDataResult> {
    const safe = esc(tableName)
    const cols = columns.map((c) => `"${esc(c)}"`).join(', ')
    return new Promise((resolve) => {
      // Get column types and data in parallel
      const typeQuery = new Promise<Map<string, string>>((res) => {
        this.conn.all(`DESCRIBE "${safe}"`, (_e, rows) => {
          const map = new Map<string, string>()
          if (rows) {
            for (const r of rows as Record<string, unknown>[]) {
              map.set(String(r.column_name), String(r.column_type))
            }
          }
          res(map)
        })
      })
      const dataQuery = new Promise<{ rows: Record<string, unknown>[]; err: Error | null }>((res) => {
        this.conn.all(`SELECT ${cols} FROM "${safe}" LIMIT ${limit}`, (err, rows) =>
          res({ rows: err ? [] : (rows as Record<string, unknown>[]), err: err ?? null })
        )
      })
      Promise.all([typeQuery, dataQuery]).then(([typeMap, { rows, err }]) => {
        if (err) { resolve({ success: false, error: err.message }); return }
        const colDefs = columns.map((name) => ({ name, dataType: typeMap.get(name) ?? '' }))
        const data = rows.map((row) => columns.map((c) => row[c] ?? null))
        resolve({ success: true, columns: colDefs, rows: data, total: data.length })
      })
    })
  }

  queryAggregate(tableName: string, fieldName: string, _isMeasure: boolean, expression?: string): Promise<{ success: true; value: number } | { success: false; error: string }> {
    const safe = esc(tableName)
    const expr = expression ?? `SUM("${esc(fieldName)}")`
    return new Promise((resolve) => {
      this.conn.all(`SELECT ${expr} AS value FROM "${safe}"`, (err, rows) => {
        if (err) { resolve({ success: false, error: err.message }); return }
        const value = Number((rows as Record<string, unknown>[])[0]?.value ?? 0)
        resolve({ success: true, value })
      })
    })
  }

  fetchTableData(tableName: string, limit = 2000): Promise<TableDataResult> {
    const safe = esc(tableName)
    return new Promise((resolve) => {
      this.conn.all(`DESCRIBE "${safe}"`, (e1, schemaRows) => {
        if (e1) { resolve({ success: false, error: e1.message }); return }
        const columns = (schemaRows as Record<string, unknown>[]).map((r) => ({
          name: String(r.column_name),
          dataType: String(r.column_type)
        }))
        this.conn.all(`SELECT COUNT(*) AS cnt FROM "${safe}"`, (e2, countRows) => {
          const total = e2 ? 0 : Number((countRows[0] as Record<string, unknown>).cnt)
          this.conn.all(`SELECT * FROM "${safe}" LIMIT ${limit}`, (e3, dataRows) => {
            if (e3) { resolve({ success: false, error: e3.message }); return }
            const rows = (dataRows as Record<string, unknown>[]).map((row) =>
              columns.map((col) => row[col.name] ?? null)
            )
            resolve({ success: true, columns, rows, total })
          })
        })
      })
    })
  }

  dropTable(tableName: string): void {
    this.conn.run(`DROP VIEW IF EXISTS "${esc(tableName)}"`)
  }
}

export const dataService = new DataService()
