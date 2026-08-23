import { getDefaultDatabase } from '../database/sqlite';
import { initializeSchema } from '../database/schema';

console.log('Đang khởi tạo cấu trúc cơ sở dữ liệu...');
const conn = getDefaultDatabase();
try {
  initializeSchema(conn);
  console.log('Khởi tạo cấu trúc cơ sở dữ liệu thành công.');
} catch (error) {
  console.error('Lỗi khi khởi tạo cấu trúc cơ sở dữ liệu:', error);
  process.exit(1);
} finally {
  conn.close();
}
