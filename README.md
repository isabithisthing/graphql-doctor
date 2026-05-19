# 🏥 graphql-doctor

> GraphQL schema linter and performance analyzer — detects N+1 queries, deprecated fields, and resolver issues.

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/graphql-doctor/ci.yml?style=for-the-badge)](https://github.com/yourusername/graphql-doctor/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Codespace Ready](https://img.shields.io/badge/Codespace-Ready-green?style=for-the-badge&logo=github)](https://codespaces.new/yourusername/graphql-doctor)

---

## 🚀 What is graphql-doctor?

`graphql-doctor` runs static analysis on your GraphQL schema and query files to catch performance problems, deprecated usage, naming convention violations, and security issues before they hit production.

```bash
graphql-doctor check schema.graphql
graphql-doctor check schema.graphql --queries ./src/**/*.graphql
graphql-doctor lint schema.graphql
graphql-doctor analyze queries/ --detect n+1
graphql-doctor demo
```

## ✨ Features
- 🔍 N+1 query pattern detection
- ⚠️  Deprecated field usage in queries
- 📐 Naming convention enforcement (camelCase fields, PascalCase types)
- 🔒 Missing auth directives on sensitive fields
- 📊 Query complexity scoring
- 🔄 Circular reference detection in schema
- 📋 JSON and Markdown report output

## 📊 Sample Output
```
🏥 graphql-doctor — schema.graphql
────────────────────────────────────────────
❌ Query getUserPosts     N+1 risk: posts resolver inside user loop
⚠️  Field User.legacyId  Deprecated — use User.id instead
⚠️  Type user_profile     Naming: should be UserProfile (PascalCase)
ℹ️  Query getOrders       Complexity score: 847 (threshold: 1000)

1 error  2 warnings  1 info
```

## 🏆 Achievement Scripts
```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```
## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)
