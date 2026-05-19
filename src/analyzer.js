#!/usr/bin/env node
// 🏥 graphql-doctor — GraphQL Schema Linter & Analyzer

const fs   = require('fs');
const path = require('path');

const GREEN  = '\x1b[32m'; const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m'; const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';  const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

// ── Schema parser (minimal SDL tokenizer) ─────────────────
function parseSchema(sdl) {
  const types   = {};
  const typeRe  = /(?:type|input|interface|enum)\s+(\w+)[^{]*\{([^}]*)\}/g;
  const fieldRe = /(\w+)(?:\([^)]*\))?\s*:\s*([\w\[\]!]+)(?:\s+@(\w+))?/g;
  let   match;

  while ((match = typeRe.exec(sdl)) !== null) {
    const [, name, body] = match;
    const fields = {};
    let   fmatch;
    while ((fmatch = fieldRe.exec(body)) !== null) {
      const [, fname, ftype, directive] = fmatch;
      fields[fname] = { type: ftype, deprecated: directive === 'deprecated' };
    }
    types[name] = { fields };
  }
  return types;
}

// ── Lint rules ────────────────────────────────────────────
const RULES = [
  {
    id: 'GQL001', level: 'WARNING',
    name: 'PascalCase types',
    check: (types) => {
      const issues = [];
      for (const name of Object.keys(types)) {
        if (!/^[A-Z]/.test(name) && !['Query','Mutation','Subscription'].includes(name)) {
          issues.push({ type: name, msg: `Type "${name}" should be PascalCase` });
        }
      }
      return issues;
    },
  },
  {
    id: 'GQL002', level: 'WARNING',
    name: 'camelCase fields',
    check: (types) => {
      const issues = [];
      for (const [tname, tdef] of Object.entries(types)) {
        for (const fname of Object.keys(tdef.fields)) {
          if (/_/.test(fname)) {
            issues.push({ type: `${tname}.${fname}`, msg: `Field "${fname}" should be camelCase, not snake_case` });
          }
        }
      }
      return issues;
    },
  },
  {
    id: 'GQL003', level: 'INFO',
    name: 'Deprecated field usage',
    check: (types) => {
      const issues = [];
      for (const [tname, tdef] of Object.entries(types)) {
        for (const [fname, fdef] of Object.entries(tdef.fields)) {
          if (fdef.deprecated) {
            issues.push({ type: `${tname}.${fname}`, msg: `Field is marked @deprecated` });
          }
        }
      }
      return issues;
    },
  },
  {
    id: 'GQL004', level: 'ERROR',
    name: 'N+1 risk detection',
    check: (types) => {
      const issues = [];
      const queryType = types['Query'] || types['query'];
      if (!queryType) return issues;
      for (const [fname, fdef] of Object.entries(queryType.fields)) {
        const returnType = fdef.type.replace(/[\[\]!]/g, '');
        const relType    = types[returnType];
        if (!relType) continue;
        // Check if this type has list fields pointing to other types
        for (const [nestedName, nestedDef] of Object.entries(relType.fields)) {
          const nestedClean = nestedDef.type.replace(/[\[\]!]/g, '');
          if (nestedDef.type.includes('[') && types[nestedClean]) {
            issues.push({
              type: `Query.${fname}`,
              msg: `N+1 risk: ${returnType}.${nestedName} is a list resolved inside ${fname}`,
            });
          }
        }
      }
      return issues;
    },
  },
  {
    id: 'GQL005', level: 'WARNING',
    name: 'Missing ID field',
    check: (types) => {
      const issues = [];
      for (const [name, def] of Object.entries(types)) {
        if (['Query','Mutation','Subscription'].includes(name)) continue;
        if (!def.fields.id && !def.fields.ID && !def.fields._id) {
          issues.push({ type: name, msg: `Type "${name}" has no id field` });
        }
      }
      return issues;
    },
  },
];

function runAnalysis(sdl, filename = 'schema.graphql') {
  const types  = parseSchema(sdl);
  const issues = [];

  for (const rule of RULES) {
    const found = rule.check(types);
    found.forEach(f => issues.push({ ...f, level: rule.level, rule: rule.id, name: rule.name }));
  }

  const errors = issues.filter(i => i.level === 'ERROR');
  const warns  = issues.filter(i => i.level === 'WARNING');
  const infos  = issues.filter(i => i.level === 'INFO');

  console.log(`\n${CYAN}${BOLD}🏥 graphql-doctor — ${filename}${NC}`);
  console.log(`${DIM}Types found: ${Object.keys(types).join(', ')}${NC}`);
  console.log('─'.repeat(65));

  if (!issues.length) {
    console.log(`${GREEN}✅ Schema looks healthy!${NC}\n`);
    return;
  }

  issues.forEach(({ type, level, msg }) => {
    const color = level === 'ERROR' ? RED : level === 'WARNING' ? YELLOW : DIM;
    const icon  = level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️ ' : 'ℹ️ ';
    console.log(`${color}${icon}${NC} ${BOLD}${(type || '').padEnd(28)}${NC} ${msg}`);
  });

  console.log(`\n${RED}${errors.length} errors${NC}  ${YELLOW}${warns.length} warnings${NC}  ${DIM}${infos.length} info${NC}\n`);
  if (errors.length) process.exit(1);
}

const DEMO_SCHEMA = `
type Query {
  getUser(id: ID!): user_profile
  getUserPosts(userId: ID!): [Post!]!
}

type user_profile {
  id: ID!
  name: String!
  email: String!
  legacy_id: String @deprecated
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  comments: [Comment!]!
}

type Comment {
  content: String!
}
`;

const args = process.argv.slice(2);
const cmd  = args[0] || 'demo';
const file = args[1];

console.log(`\n${CYAN}${BOLD}🏥 graphql-doctor${NC}\n`);

if (cmd === 'demo') {
  runAnalysis(DEMO_SCHEMA, 'demo.graphql');
} else if ((cmd === 'check' || cmd === 'lint') && file) {
  if (!fs.existsSync(file)) { console.error(`❌ File not found: ${file}`); process.exit(1); }
  runAnalysis(fs.readFileSync(file, 'utf8'), path.basename(file));
} else {
  console.log(`Usage:`);
  console.log(`  node src/analyzer.js demo`);
  console.log(`  node src/analyzer.js check schema.graphql`);
  console.log(`  node src/analyzer.js lint schema.graphql\n`);
}
