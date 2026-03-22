import { createClient } from '@libsql/client';

async function test() {
  const db = createClient({
    url: 'file:local.db',
  });
  await db.execute('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
  await db.execute('INSERT INTO test (name) VALUES ("hello")');
  const res = await db.execute('SELECT * FROM test');
  console.log(res.rows);
}
test().catch(console.error);
