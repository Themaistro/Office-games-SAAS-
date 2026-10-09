import { query as pgQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Filter = { sql: string; value?: unknown; parameterized?: boolean };
const safeName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : (() => { throw new Error("Invalid database identifier"); })();
const serializeJsonColumn = (column: string, value: unknown) =>
  (column === "content" || column === "options") && value !== null && typeof value === "object"
    ? JSON.stringify(value)
    : value;
function fields(selection?: string) {
  if (!selection || selection === "*" || selection.includes("(") || selection.includes("!")) return "*";
  return selection.split(",").map((x) => safeName(x.trim())).join(", ");
}

class TableQuery implements PromiseLike<any> {
  private table: string; private mode: "select"|"insert"|"update"|"delete" = "select"; private selection = "*"; private values: Record<string, unknown>|Record<string, unknown>[]|null = null; private filters: Filter[] = []; private orGroups: Filter[][] = []; private orders: string[] = []; private limitValue?: number; private offsetValue?: number; private count = false; private head = false; private one = false;
  constructor(table: string) { this.table = safeName(table); }
  select(selection = "*", options?: { count?: "exact"; head?: boolean }) { if (this.mode !== "insert" && this.mode !== "update") this.mode = "select"; this.selection = fields(selection); this.count = options?.count === "exact"; this.head = options?.head === true; return this; }
  insert(values: Record<string, unknown>|Record<string, unknown>[]) { this.mode="insert"; this.values=values; return this; }
  update(values: Record<string, unknown>) { this.mode="update"; this.values=values; return this; }
  delete() { this.mode="delete"; return this; }
  eq(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} = $VALUE`,value});return this;}
  neq(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} <> $VALUE`,value});return this;}
  ilike(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} ILIKE $VALUE`,value});return this;}
  gt(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} > $VALUE`,value});return this;}
  gte(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} >= $VALUE`,value});return this;}
  lt(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} < $VALUE`,value});return this;}
  lte(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} <= $VALUE`,value});return this;}
  in(column:string,values:unknown[]){this.filters.push({sql:`${safeName(column)} = ANY($VALUE)`,value:values});return this;}
  is(column:string,value:unknown){
    const sqlValue = value === null ? "NULL" : value === true ? "TRUE" : value === false ? "FALSE" : null;
    if (!sqlValue) throw new Error("Unsupported IS filter value");
    this.filters.push({sql:`${safeName(column)} IS ${sqlValue}`,parameterized:false});
    return this;
  }
  not(column:string,operator:string,value:unknown){
    if (operator === "is") {
      const sqlValue = value === null ? "NULL" : value === true ? "TRUE" : value === false ? "FALSE" : null;
      if (!sqlValue) throw new Error("Unsupported NOT IS filter value");
      this.filters.push({sql:`${safeName(column)} IS NOT ${sqlValue}`,parameterized:false});
    }
    return this;
  }
  or(expression:string){
    const group = expression.split(",").map((part) => {
      const [column, operator, rawValue] = part.split(".");
      if (!column || operator !== "eq" || !rawValue) throw new Error("Unsupported OR filter");
      return { sql: `${safeName(column)} = $VALUE`, value: rawValue };
    });
    this.orGroups.push(group);
    return this;
  }
  order(column:string,options?:{ascending?:boolean}){this.orders.push(`${safeName(column)} ${options?.ascending===false?"DESC":"ASC"}`);return this;}
  limit(value:number){this.limitValue=value;return this;}
  range(from:number,to:number){this.offsetValue=from;this.limitValue=to-from+1;return this;}
  single(){this.limitValue=1;this.one=true;return this;}
  maybeSingle(){this.limitValue=1;this.one=true;return this;}
  then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any> { return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined); }
  private async execute() {
    const params: unknown[]=[]; let where="";
    const renderFilter = (f: Filter) => { if(f.parameterized===false)return f.sql; params.push(f.value); return f.sql.replace("$VALUE",`$${params.length}`); };
    const whereParts = this.filters.map(renderFilter);
    for (const group of this.orGroups) whereParts.push(`(${group.map(renderFilter).join(" OR ")})`);
    if(whereParts.length) where=" WHERE "+whereParts.join(" AND ");
    if(this.mode==="select") { if(this.head && this.count){const r=await pgQuery(`SELECT count(*)::int AS count FROM ${this.table}${where}`,params);return {data:null,error:null,count:r.rows[0]?.count??0};} const r=await pgQuery(`SELECT ${this.selection} FROM ${this.table}${where}${this.orders.length?` ORDER BY ${this.orders.join(",")}`:""}${this.limitValue!==undefined?` LIMIT ${this.limitValue}`:""}${this.offsetValue!==undefined?` OFFSET ${this.offsetValue}`:""}`,params);return {data:this.head?null:this.one?(r.rows[0]??null):r.rows,error:null,count:this.count?r.rowCount:null}; }
    if(this.mode==="delete"){await pgQuery(`DELETE FROM ${this.table}${where}`,params);return {data:null,error:null};}
    if(this.mode==="insert"){const rows=Array.isArray(this.values)?this.values:[this.values];if(!rows.length)return {data:[],error:null};const keys=Object.keys(rows[0]!);const vals=rows.flatMap(row=>keys.map(k=>serializeJsonColumn(k,(row as Record<string,unknown>)[k] ?? null)));const tuples=rows.map((_,i)=>`(${keys.map((__,j)=>`$${i*keys.length+j+1}`).join(",")})`).join(",");const r=await pgQuery(`INSERT INTO ${this.table} (${keys.map(safeName).join(",")}) VALUES ${tuples} RETURNING *`,vals);return {data:this.one?(r.rows[0]??null):r.rows,error:null};}
    const values=this.values as Record<string,unknown>;
    const filterParams=[...params];
    const updateParams=Object.keys(values).map(k=>serializeJsonColumn(k, values[k]));
    const sets=Object.keys(values).map((k,i)=>`${safeName(k)}=$${i+1}`).join(",");
    const finalWhere=where.replace(/\$(\d+)/g,(_,n)=>`$${Number(n)+updateParams.length}`);
    const r=await pgQuery(`UPDATE ${this.table} SET ${sets}${finalWhere} RETURNING *`,[...updateParams,...filterParams]);
    return {data:this.one?(r.rows[0]??null):r.rows,error:null};
  }
}

export function createClient(..._args: unknown[]) { return { auth: { getUser: async () => ({ data: { user: await getCurrentUser() } }) }, from: (table: string) => new TableQuery(table) }; }
export function createAdminClient(..._args: unknown[]) { return createClient(); }

