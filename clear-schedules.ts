import { createClient } from '@libsql/client';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const db = createClient({
  url: 'file:local.db',
});

console.log('====================================================');
console.log('⚠️  警告：危险操作！');
console.log('此操作将永久删除数据库中【所有成员】的【所有日程记录】！');
console.log('====================================================\n');

rl.question('您确定要继续吗？请输入 "yes" 确认删除 (输入其他任意字符取消): ', async (answer) => {
  if (answer.trim().toLowerCase() === 'yes') {
    try {
      console.log('\n正在删除所有日程...');
      const result = await db.execute('DELETE FROM schedules');
      console.log(`✅ 成功删除了 ${result.rowsAffected} 条日程记录。`);
    } catch (error) {
      console.error('❌ 删除失败:', error);
    }
  } else {
    console.log('\n操作已取消，未删除任何数据。');
  }
  
  rl.close();
  process.exit(0);
});
