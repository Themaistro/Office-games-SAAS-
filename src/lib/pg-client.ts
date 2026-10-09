import { query as pgQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Filter = { sql: string; value: unknown };
const safeName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : (() => { throw new Error("Invalid database identifier"); })();
function fields(selection?: string) { if (!selection || selection.includes("(") || selection.includes("!")) return "*"; return selection.split(",").map((x) => safeName(x.trim())).join(", "); }

class TableQuery implements PromiseLike<any> {
  private table: string; private mode: "select"|"insert"|"update"|"delete" = "select"; private selection = "*"; private values: Record<string, unknown>|Record<string, unknown>[]|null = null; private filters: Filter[] = []; private orders: string[] = []; private limitValue?: number; private offsetValue?: number; private count = false; private head = false; private one = false;
  constructor(table: string) { this.table = safeName(table); }
  select(selection = "*", options?: { count?: "exact"; head?: boolean }) { this.mode = "select"; this.selection = fields(selection); this.count = options?.count === "exact"; this.head = options?.head === true; return this; }
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
  is(column:string,value:unknown){this.filters.push({sql:`${safeName(column)} IS ${value===null?"NULL":"NOT NULL"}`,value:null});return this;}
  not(column:string,operator:string,value:unknown){if(operator==="is") return this.is(column,value); return this;}
  or(_expression:string){return this;}
  order(column:string,options?:{ascending?:boolean}){this.orders.push(`${safeName(column)} ${options?.ascending===false?"DESC":"ASC"}`);return this;}
  limit(value:number){this.limitValue=value;return this;}
  range(from:number,to:number){this.offsetValue=from;this.limitValue=to-from+1;return this;}
  single(){this.limitValue=1;this.one=true;return this;}
  maybeSingle(){this.limitValue=1;this.one=true;return this;}
  then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any> { return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined); }
  private async execute() {
    const params: unknown[]=[]; let where="";
    if(this.filters.length){where=" WHERE "+this.filters.map(f=>{params.push(f.value);return f.sql.replace("$VALUE",`$${params.length}`)}).join(" AND ");}
    if(this.mode==="select") { if(this.head && this.count){const r=await pgQuery(`SELECT count(*)::int AS count FROM ${this.table}${where}`,params);return {data:null,error:null,count:r.rows[0]?.count??0};} const r=await pgQuery(`SELECT ${this.selection} FROM ${this.table}${where}${this.orders.length?` ORDER BY ${this.orders.join(",")}`:""}${this.limitValue!==undefined?` LIMIT ${this.limitValue}`:""}${this.offsetValue!==undefined?` OFFSET ${this.offsetValue}`:""}`,params);return {data:this.head?null:this.one?(r.rows[0]??null):r.rows,error:null,count:this.count?r.rowCount:null}; }
    if(this.mode==="delete"){await pgQuery(`DELETE FROM ${this.table}${where}`,params);return {data:null,error:null};}
    if(this.mode==="insert"){const rows=Array.isArray(this.values)?this.values:[this.values];if(!rows.length)return {data:[],error:null};const keys=Object.keys(rows[0]!);const vals=rows.flatMap(row=>keys.map(k=>(row as Record<string,unknown>)[k]));const tuples=rows.map((_,i)=>`(${keys.map((__,j)=>`$${i*keys.length+j+1}`).join(",")})`).join(",");const r=await pgQuery(`INSERT INTO ${this.table} (${keys.map(safeName).join(",")}) VALUES ${tuples} RETURNING *`,vals);return {data:this.one?(r.rows[0]??null):r.rows,error:null};}
    const values=this.values as Record<string,unknown>;const sets=Object.keys(values).map(k=>{params.push(values[k]);return `${safeName(k)}=$${params.length}`}).join(",");const offset=params.length;const finalWhere=where.replace(/\$(\d+)/g,(_,n)=>`$${Number(n)+offset}`);const r=await pgQuery(`UPDATE ${this.table} SET ${sets}${finalWhere} RETURNING *`,params);return {data:this.one?(r.rows[0]??null):r.rows,error:null};
  }
}

export function createClient(..._args: unknown[]) { return { auth: { getUser: async () => ({ data: { user: await getCurrentUser() } }) }, from: (table: string) => new TableQuery(table) }; }
export function createAdminClient(..._args: unknown[]) { return createClient(); }

