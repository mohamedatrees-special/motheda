import { runSqliteToPostgresMigration } from './migrate-sqlite-to-pg.ts';

async function main() {
  console.log('🚀 [Migration] Starting SQLite to PostgreSQL migration...');
  const result = await runSqliteToPostgresMigration();
  console.log('====================================================');
  console.log('📊 MIGRATION SUMMARY REPORT:');
  console.log(`Success: ${result.success}`);
  console.log(`All Parity Verified: ${result.allParityVerified}`);
  console.log(`Backup File: ${result.backupPath}`);
  console.log('Tables:');
  for (const [table, info] of Object.entries(result.tables)) {
    console.log(`  - ${table}: SQLite=${info.sqliteCount} | PostgreSQL=${info.pgCount} [${info.match ? 'MATCH' : 'MISMATCH'}]`);
  }
  console.log('====================================================');

  if (!result.success || !result.allParityVerified) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
