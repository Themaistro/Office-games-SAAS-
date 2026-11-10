const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), assert = require('node:assert/strict');
const root = path.join(__dirname, '../src');
const walk = p => fs.readdirSync(p, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]);
const files = walk(root).filter(file => /\.tsx?$/.test(file)), modules = new Map();
function resolve(from, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
  return [base, base+'.ts', base+'.tsx', path.join(base,'index.ts'), path.join(base,'index.tsx')].find(file => files.includes(file));
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8'), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if(relative.startsWith('app/') || relative.startsWith('components/') || relative.startsWith('hooks/')) {
    for(const node of ast.statements) if(ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      assert(!/^@\/features\/[^/]+\/infrastructure\//.test(node.moduleSpecifier.text),`${relative}: import the feature public entry point instead of its persistence implementation`);
  }
  for (const [index,statement] of ast.statements.entries()) {
    if (!ts.isExpressionStatement(statement)) continue;
    let expression=statement.expression;
    while(ts.isParenthesizedExpression(expression)) expression=expression.expression;
    if(ts.isStringLiteral(expression)&&['use client','use server'].includes(expression.text)) assert(index===0,`${relative}: framework directive must be the first statement`);
  }
  assert(!/@ts-nocheck|@ts-ignore/.test(source), `${relative}: type checking bypass`);
  assert(!source.includes('Compatibility export.'), `${relative}: obsolete compatibility wrapper`);
  assert(!source.includes('database/legacy-client'), `${relative}: retired database adapter`);
  function answerContract(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'onAnswer') {
      assert(node.arguments.length <= 2, `${relative}: use the shared answer/options contract`);
      const options=node.arguments[1];
      assert(!options || ![ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(options.kind),`${relative}: boolean result arguments are retired`);
    }
    ts.forEachChild(node,answerContract);
  }
  answerContract(ast);
  if(relative.startsWith('app/api/'))for(const node of ast.statements){
    if(!ts.isFunctionDeclaration(node)||!['POST','PUT','PATCH','DELETE'].includes(node.name?.text))continue;
    let guarded=false;
    function findGuard(child){
      if(ts.isCallExpression(child)&&ts.isIdentifier(child.expression)&&child.expression.text==='handleApiRequest')guarded=child.arguments.length===2&&ts.isIdentifier(child.arguments[1])&&child.arguments[1].text==='request';
      ts.forEachChild(child,findGuard);
    }
    findGuard(node);assert(guarded,`${relative}: cookie-authenticated API mutations must pass their Request to the shared origin guard`);
  }
  if (relative.startsWith('app/admin/') && relative.endsWith('/page.tsx')) {
    const page=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.DefaultKeyword));
    assert(page?.body?.statements[0]?.getText(ast).includes('await requireAdminPage('), `${relative}: admin page must guard its own reads`);
  }
  const edges = [], external = [];
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
    if (!node.moduleSpecifier || node.importClause?.isTypeOnly || node.isTypeOnly) continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(e => e.isTypeOnly)) continue;
    const specifier = node.moduleSpecifier.text, destination = resolve(file, specifier);
    if (destination) edges.push(destination); else external.push(specifier);
    if (relative.includes('/infrastructure/')) assert(!specifier.startsWith('@/app/'), `${relative}: persistence imports a route`);
  }
  function inspect(node) {
    if ((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&node.text.startsWith('game:'))
      assert(false,`${relative}: realtime channels must use the shared company-scoped channel builder`);
    if(ts.isTemplateExpression(node)&&node.head.text.startsWith('game:'))
      assert(false,`${relative}: realtime channels must use the shared company-scoped channel builder`);
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
      const specifier=node.arguments[0].text,destination=resolve(file,specifier);
      if(destination)edges.push(destination);else external.push(specifier);
      if(relative.startsWith('app/')||relative.startsWith('components/')||relative.startsWith('hooks/'))assert(!/^@\/features\/[^/]+\/infrastructure\//.test(specifier),`${relative}: lazy imports must also respect feature boundaries`);
    }
    if ((relative.startsWith('app/') || relative.startsWith('components/') || relative.startsWith('hooks/')) && ts.isCallExpression(node)) {
      const exp = node.expression;
      const name = ts.isIdentifier(exp) ? exp.text : ts.isPropertyAccessExpression(exp) ? exp.name.text : '';
      const databaseCall = ['query','pgQuery'].includes(name) || (name === 'from' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]));
      assert(!databaseCall, `${relative}: direct database call in presentation`);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  const first = ast.statements[0];
  const directive = first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) ? first.expression.text : null;
  modules.set(file, { relative, edges, external, client: directive === 'use client', action: directive === 'use server' });
}
const visited = new Set(), active = [];
function cycles(file) {
  if (active.includes(file)) throw new Error('Dependency cycle: ' + [...active.slice(active.indexOf(file)),file].map(p => modules.get(p).relative).join(' -> '));
  if (visited.has(file)) return;
  active.push(file); for (const next of modules.get(file).edges) cycles(next); active.pop(); visited.add(file);
}
for (const file of files) cycles(file);
for (const [file, module] of modules) if (module.client) {
  const seen = new Set();
  function clientBoundary(current, chain) {
    if (seen.has(current)) return; seen.add(current);
    const next = modules.get(current);
    if (current !== file && next.action) return; // Next server-action RPC boundary.
    assert(!next.external.includes('server-only') && !next.external.includes('pg') && !next.relative.startsWith('server/') && !next.relative.includes('/infrastructure/'), `${module.relative}: server dependency in client graph: ${[...chain,next.relative].join(' -> ')}`);
    for (const edge of next.edges) clientBoundary(edge, [...chain,next.relative]);
  }
  clientBoundary(file, []);
}
console.log(`PASS ${files.length} source modules: no dependency cycles, UI database calls, server code in client imports or type-check bypasses.`);
