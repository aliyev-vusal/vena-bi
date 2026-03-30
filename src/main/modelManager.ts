import * as duckdb from 'duckdb'

export interface Relationship {
  id: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

export interface Measure {
  id: string
  name: string
  expression: string  // SQL aggregate, e.g. SUM("src_0"."Revenue") / SUM("src_0"."Units")
}

export interface AxisField {
  fieldName: string
  tableName: string          // DuckDB view name, empty string for bare measures
  isMeasure: boolean
  measureExpression?: string // filled when isMeasure === true AND it's a custom expression
  dataType?: string          // DuckDB column type, e.g. 'VARCHAR', 'INTEGER', 'DOUBLE'
}

export type ModelQueryResult =
  | { success: true; data: { x: unknown; value: number }[] }
  | { success: false; error: string }

// DuckDB numeric type prefixes — anything matching these can be SUM'd
const NUMERIC_PREFIXES = [
  'INTEGER', 'BIGINT', 'HUGEINT', 'UBIGINT', 'UINTEGER',
  'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL',
  'DECIMAL', 'NUMERIC', 'INT4', 'INT8', 'INT2', 'INT1', 'INT'
]

function isNumericType(dataType: string | undefined): boolean {
  if (!dataType) return false
  const t = dataType.toUpperCase().trim()
  return NUMERIC_PREFIXES.some((p) => t === p || t.startsWith(p + '('))
}

function escapeId(s: string): string {
  return s.replace(/"/g, '""')
}

export class ModelManager {
  private relationships: Relationship[] = []
  private measures: Measure[] = []

  constructor(private conn: duckdb.Connection) {}

  // ─── Relationships ────────────────────────────────────────────────────────

  addRelationship(rel: Omit<Relationship, 'id'>): Relationship {
    const r: Relationship = { ...rel, id: `rel_${Date.now()}_${Math.random().toString(36).slice(2)}` }
    this.relationships.push(r)
    return r
  }

  removeRelationship(id: string): void {
    this.relationships = this.relationships.filter((r) => r.id !== id)
  }

  getRelationships(): Relationship[] {
    return [...this.relationships]
  }

  // ─── Measures ─────────────────────────────────────────────────────────────

  addMeasure(m: Omit<Measure, 'id'>): Measure {
    const measure: Measure = { ...m, id: `msr_${Date.now()}_${Math.random().toString(36).slice(2)}` }
    this.measures.push(measure)
    return measure
  }

  removeMeasure(id: string): void {
    this.measures = this.measures.filter((m) => m.id !== id)
  }

  getMeasures(): Measure[] {
    return [...this.measures]
  }

  // ─── Query Builder ────────────────────────────────────────────────────────

  private findRelationship(tableA: string, tableB: string): Relationship | null {
    return (
      this.relationships.find(
        (r) =>
          (r.fromTable === tableA && r.toTable === tableB) ||
          (r.fromTable === tableB && r.toTable === tableA)
      ) ?? null
    )
  }

  /** Extract DuckDB view names referenced in a measure expression like "src_0"."col" */
  private extractTablesFromExpr(expr: string): string[] {
    const matches = [...expr.matchAll(/"([^"]+)"\."[^"]+"/g)]
    return [...new Set(matches.map((m) => m[1]))]
  }

  /**
   * Build a GROUP BY aggregate SQL query.
   * Always outputs:
   *   SELECT <x_expr> AS x, <agg_expr> AS value
   *   FROM ...
   *   WHERE <x_expr> IS NOT NULL
   *   GROUP BY <x_expr>
   *   ORDER BY value DESC NULLS LAST
   *   LIMIT 500
   */
  buildSQL(xField: AxisField, yField: AxisField): string {
    const xTable = xField.tableName
    if (!xTable) throw new Error('X axis field must belong to a table.')

    // ── X expression (qualified) ─────────────────────────────────────────
    const xExpr = `"${escapeId(xTable)}"."${escapeId(xField.fieldName)}"`

    // ── Y expression (aggregation) ────────────────────────────────────────
    let yExpr: string
    let joinTables: string[] = []

    if (yField.isMeasure && yField.measureExpression) {
      // Custom measure with SQL expression (e.g. from Measures panel)
      yExpr = yField.measureExpression
      const exprTables = this.extractTablesFromExpr(yField.measureExpression)
      joinTables = exprTables.filter((t) => t !== xTable)
    } else {
      // Regular field from data source — choose aggregation by data type
      const yTable = yField.tableName && yField.tableName !== xTable ? yField.tableName : xTable
      const yQualified = `"${escapeId(yTable)}"."${escapeId(yField.fieldName)}"`

      if (isNumericType(yField.dataType)) {
        yExpr = `SUM(${yQualified})`
      } else {
        // String / date / other → COUNT distinct values (Power BI-style auto aggregation)
        yExpr = `COUNT(${yQualified})`
      }

      if (yField.tableName && yField.tableName !== xTable) {
        joinTables = [yField.tableName]
      }
    }

    // ── FROM + JOIN clause ────────────────────────────────────────────────
    let fromClause = `"${escapeId(xTable)}"`
    for (const joinTable of joinTables) {
      const rel = this.findRelationship(xTable, joinTable)
      if (!rel) {
        throw new Error(
          `No relationship defined between "${xTable}" and "${joinTable}". ` +
          `Add it in the Relationships panel.`
        )
      }
      const [leftCol, rightCol] =
        rel.fromTable === xTable
          ? [rel.fromColumn, rel.toColumn]
          : [rel.toColumn, rel.fromColumn]

      fromClause +=
        ` LEFT JOIN "${escapeId(joinTable)}"` +
        ` ON "${escapeId(xTable)}"."${escapeId(leftCol)}"` +
        ` = "${escapeId(joinTable)}"."${escapeId(rightCol)}"`
    }

    return [
      `SELECT ${xExpr} AS x, ${yExpr} AS value`,
      `FROM ${fromClause}`,
      `WHERE ${xExpr} IS NOT NULL`,
      `GROUP BY ${xExpr}`,
      `ORDER BY value DESC NULLS LAST`,
      `LIMIT 500`
    ].join(' ')
  }

  executeQuery(xField: AxisField, yField: AxisField): Promise<ModelQueryResult> {
    let sql: string
    try {
      sql = this.buildSQL(xField, yField)
    } catch (e) {
      return Promise.resolve({ success: false, error: (e as Error).message })
    }

    return new Promise((resolve) => {
      this.conn.all(sql, (err, rows) => {
        if (err) {
          resolve({ success: false, error: err.message })
          return
        }
        const data = (rows as Record<string, unknown>[]).map((row) => ({
          // We always alias the x column as 'x' in buildSQL, so this is reliable
          x: row['x'],
          value: Number(row['value'] ?? 0)
        }))
        resolve({ success: true, data })
      })
    })
  }
}
