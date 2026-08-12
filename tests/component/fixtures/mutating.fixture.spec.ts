import { mutatingTest } from '../../../fixtures/mutating.fixture';

mutatingTest('không chạy nội dung test có thay đổi khi chưa bật cờ rõ ràng', () => {
  throw new Error('Mutation safety fixture did not skip the test');
});
