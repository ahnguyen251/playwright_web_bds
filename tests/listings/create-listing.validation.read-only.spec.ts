import { ROUTES } from '../../constants/routes';
import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

test(listingCaseTitle('TC-LIST-CREATE-011'), async ({ createListingPage }) => {
  await createListingPage.open();

  await createListingPage.fillContactPhone('12345');
  await createListingPage.blurContactPhone();

  await expect
    .poll(async () => createListingPage.contactPhoneError())
    .toMatch(/Số điện thoại không (?:đúng|hợp lệ) định dạng/i);
  expect(await createListingPage.contactPhoneError()).toBe('Số điện thoại không đúng định dạng');
});

test(listingCaseTitle('TC-LIST-CREATE-003'), async ({ createListingPage }) => {
  await createListingPage.open();

  // Trạng thái mặc định: "Mua bán"
  await expect.poll(async () => createListingPage.priceLabel()).toMatch(/Giá bán/i);
  expect(await createListingPage.isLegalVisible()).toBe(true);
  expect(await createListingPage.isDepositVisible()).toBe(false);

  // Chuyển sang "Cho thuê"
  await createListingPage.selectTransactionType('rent');
  await expect.poll(async () => createListingPage.priceLabel()).toMatch(/Giá thuê/i);
  await expect.poll(async () => createListingPage.isDepositVisible()).toBe(true);

  // Chuyển ngược lại về "Mua bán"
  await createListingPage.selectTransactionType('sale');
  await expect.poll(async () => createListingPage.priceLabel()).toMatch(/Giá bán/i);
  await expect.poll(async () => createListingPage.isDepositVisible()).toBe(false);
  expect(await createListingPage.isLegalVisible()).toBe(true);
});

test(listingCaseTitle('TC-LIST-CREATE-004'), async ({ page, createListingPage }) => {
  await createListingPage.open();

  // Bỏ trống tiêu đề và blur ra ngoài
  await createListingPage.fillTitle('');
  await createListingPage.blurTitle();

  // Xác nhận hiển thị lỗi bắt buộc cho Tiêu đề
  await expect
    .poll(async () => createListingPage.titleError())
    .toMatch(/tiêu đề|tên bất động sản|không được để trống|bắt buộc/i);
  expect(await createListingPage.titleError()).toBe('Tiêu đề không được để trống');

  // Thử bấm đăng tin (submit) khi thiếu tiêu đề
  await createListingPage.publish();

  // Xác nhận lỗi tiêu đề vẫn hiển thị và hệ thống chặn submit (vẫn giữ nguyên trên /post-listing)
  expect(await createListingPage.titleError()).toBe('Tiêu đề không được để trống');
  await expect(page).toHaveURL(/post-listing/);
});

test(listingCaseTitle('TC-LIST-CREATE-005'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Kiểm tra biên Tiêu đề: nhập/paste chuỗi 140 ký tự (vượt giới hạn 120)
  const longTitle = 'Bán căn hộ chung cư cao cấp trung tâm thành phố với đầy đủ tiện ích nội khu và view thoáng '.repeat(2);
  const str140 = longTitle.slice(0, 140);
  await createListingPage.fillTitle(str140);
  await createListingPage.blurTitle();

  // Xác nhận giá trị bị cắt còn đúng 120 ký tự và bộ đếm đạt 120/120
  await expect.poll(async () => (await createListingPage.titleValue()).length).toBe(120);
  expect((await createListingPage.titleValue()).length).toBe(120);
  expect(await createListingPage.titleCounterText()).toContain('120/120');

  // 2. Kiểm tra Họ tên liên hệ: nhập chuỗi kèm khoảng trắng thừa ở đầu và cuối
  await createListingPage.fillContactName('   Nguyễn Văn An   ');
  await createListingPage.blurContactName();

  // Xác nhận chuỗi tự động được trim sạch khoảng trắng khi rời tiêu điểm
  await expect.poll(async () => createListingPage.contactNameValue()).toBe('Nguyễn Văn An');
  expect(await createListingPage.contactNameValue()).toBe('Nguyễn Văn An');
});

test(listingCaseTitle('TC-LIST-CREATE-006'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Kiểm tra Mô tả < 20 ký tự
  await createListingPage.fillDescription('Nhà đẹp');
  await createListingPage.blurDescription();
  await expect
    .poll(async () => createListingPage.descriptionError())
    .toMatch(/Mô tả phải có ít nhất 20 ký tự/i);
  expect(await createListingPage.descriptionError()).toBe('Mô tả phải có ít nhất 20 ký tự');

  // 2. Kiểm tra Diện tích <= 0
  await createListingPage.fillArea('0');
  await createListingPage.blurArea();
  await expect
    .poll(async () => createListingPage.areaError())
    .toMatch(/Diện tích không hợp lệ hoặc vượt giới hạn/i);
  expect(await createListingPage.areaError()).toBe('Diện tích không hợp lệ hoặc vượt giới hạn');

  // 3. Kiểm tra Giá bán <= 0
  await createListingPage.fillPrice('0');
  await createListingPage.blurPrice();
  await expect
    .poll(async () => createListingPage.priceError())
    .toMatch(/Giá bán phải lớn hơn 999/i);
  expect(await createListingPage.priceError()).toBe('Giá bán phải lớn hơn 999');
});

test(listingCaseTitle('TC-LIST-CREATE-007'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Khi chưa nhập giá (hoặc giá rỗng): Checkbox "Giá Thương lượng" khả dụng
  expect(await createListingPage.isNegotiableDisabled()).toBe(false);

  // Chọn checkbox "Giá Thương lượng"
  await createListingPage.toggleNegotiable(true);
  await expect.poll(async () => createListingPage.isNegotiableChecked()).toBe(true);

  // Ô nhập Giá bị vô hiệu hóa (disabled) và giá trị là chuỗi rỗng
  await expect.poll(async () => createListingPage.isPriceDisabled()).toBe(true);
  expect(await createListingPage.priceValue()).toBe('');

  // Bỏ chọn "Giá Thương lượng"
  await createListingPage.toggleNegotiable(false);
  await expect.poll(async () => createListingPage.isNegotiableChecked()).toBe(false);

  // Ô nhập Giá được kích hoạt lại (enabled)
  await expect.poll(async () => createListingPage.isPriceDisabled()).toBe(false);

  // 2. Ràng buộc loại trừ (Mutual Exclusivity): Khi đã nhập Giá bán hợp lệ, checkbox "Thương lượng" bị vô hiệu hóa
  await createListingPage.fillPrice('5000000');
  await expect.poll(async () => createListingPage.isNegotiableDisabled()).toBe(true);
});

test(listingCaseTitle('TC-LIST-CREATE-008'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Chặn upload vượt quá 10 ảnh BĐS
  const dummy11Images = Array.from({ length: 11 }, (_, i) => ({
    name: `bds-image-${String(i + 1)}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from('dummy-bds-image'),
  }));
  await createListingPage.uploadImageBuffers(dummy11Images);
  await expect
    .poll(async () => createListingPage.imageSectionError())
    .toMatch(/Bạn chỉ có thể tải tối đa 10 hình ảnh/i);
  expect(await createListingPage.imageSectionError()).toBe('Bạn chỉ có thể tải tối đa 10 hình ảnh');

  // 2. Chặn ảnh vượt dung lượng (>3MB)
  const largeImage = [
    {
      name: 'large-bds-image.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(4 * 1024 * 1024),
    },
  ];
  await createListingPage.uploadImageBuffers(largeImage);
  await expect
    .poll(async () => {
      const toast = await createListingPage.toastMessage();
      const secErr = await createListingPage.imageSectionError();
      return `${toast} ${secErr}`;
    })
    .toMatch(/File không hợp lệ đã bị loại bỏ|Dung lượng ảnh vượt quá 3MB/i);
});

test(listingCaseTitle('TC-LIST-CREATE-009'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Chặn upload vượt quá 5 ảnh Giấy tờ pháp lý
  const dummy6Legal = Array.from({ length: 6 }, (_, i) => ({
    name: `legal-doc-${String(i + 1)}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from('dummy-legal-doc'),
  }));
  await createListingPage.uploadLegalDocumentBuffers(dummy6Legal);
  await expect
    .poll(async () => createListingPage.legalSectionError())
    .toMatch(/Tối đa 5 ảnh giấy tờ pháp lý/i);
  expect(await createListingPage.legalSectionError()).toBe('Tối đa 5 ảnh giấy tờ pháp lý');

  // 2. Chặn upload file Giấy tờ pháp lý vượt dung lượng 10MB
  const largeLegalDoc = [
    {
      name: 'large-legal-doc.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(11 * 1024 * 1024),
    },
  ];
  await createListingPage.uploadLegalDocumentBuffers(largeLegalDoc);
  await expect
    .poll(async () => {
      const toast = await createListingPage.toastMessage();
      const secErr = await createListingPage.legalSectionError();
      return `${toast} ${secErr}`;
    })
    .toMatch(/File không hợp lệ đã bị loại bỏ|Dung lượng file vượt quá giới hạn/i);
});

test(listingCaseTitle('TC-LIST-CREATE-010'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Thử nhập số âm "-5" vào ô Số phòng ngủ -> tự động thanh lọc còn "5"
  await createListingPage.fillBedrooms('-5');
  await expect.poll(async () => createListingPage.bedroomsValue()).toBe('5');
  expect(await createListingPage.bedroomsValue()).toBe('5');

  // 2. Thử nhập số thập phân "2.5" vào ô Số phòng ngủ -> tự động thanh lọc dấu chấm và cắt độ dài còn "2"
  await createListingPage.fillBedrooms('2.5');
  await expect.poll(async () => createListingPage.bedroomsValue()).toBe('2');
  expect(await createListingPage.bedroomsValue()).toBe('2');

  // 3. Thử nhập ký tự chữ "abc" vào ô Số phòng ngủ -> tự động thanh lọc về rỗng ""
  await createListingPage.fillBedrooms('abc');
  await expect.poll(async () => createListingPage.bedroomsValue()).toBe('');
  expect(await createListingPage.bedroomsValue()).toBe('');

  // 4. Kiểm tra tương tự đối với ô Số phòng tắm: thử nhập ký tự đặc biệt "@4" -> còn "4"
  await createListingPage.fillBathrooms('@4');
  await expect.poll(async () => createListingPage.bathroomsValue()).toBe('4');
  expect(await createListingPage.bathroomsValue()).toBe('4');
});

test(listingCaseTitle('TC-LIST-CREATE-012'), async ({ page, header, profilePage }) => {
  // 1. Giả lập tài khoản chưa có số điện thoại thông qua route interception
  await page.route('**/api/v1/auth/me', async (route) => {
    const response = await route.fetch();
    const rawText = await response.text();
    const json = JSON.parse(rawText) as { data?: { phone?: string | null } };
    if (json.data) {
      json.data.phone = null;
    }
    await route.fulfill({ response, json });
  });

  // 2. Truy cập trang chủ với tài khoản đã đăng nhập nhưng chưa có SĐT
  await page.goto(ROUTES.home);
  await page.waitForLoadState('networkidle');

  // 3. Nhấn "Đăng tin" trên thanh điều hướng Header
  await header.openCreateListing();

  // 4. Xác nhận hệ thống chặn vào /post-listing và điều hướng sang /profile?require=phone
  await expect(page).toHaveURL(/profile\?require=phone/);
  expect(await profilePage.isPhoneInputVisible()).toBe(true);
  await expect.poll(async () => profilePage.isPhoneInputFocused()).toBe(true);

  // 5. Xác nhận hiển thị thông báo cảnh báo yêu cầu bổ sung SĐT trước khi đăng tin
  await expect
    .poll(async () => profilePage.requirePhoneNotice())
    .toMatch(/Bạn cần cập nhật số điện thoại trước khi đăng tin/i);
  expect(await profilePage.isSaveDisabled()).toBe(true);

  // 6. Nhập số điện thoại không hợp lệ (< 10 chữ số) và bấm "Lưu thay đổi"
  await profilePage.fillPhone('0123');
  expect(await profilePage.isSaveDisabled()).toBe(false);
  await profilePage.save();

  // 7. Xác nhận hệ thống hiển thị thông báo lỗi yêu cầu SĐT phải đủ 10 chữ số và dừng lại trên trang Profile
  await expect
    .poll(async () => profilePage.phoneValidationAlert())
    .toMatch(/Số điện thoại phải đúng 10 chữ số/i);
  expect(await profilePage.phoneValidationAlert()).toBe('Số điện thoại phải đúng 10 chữ số.');
  await expect(page).toHaveURL(/profile\?require=phone/);
});

test(listingCaseTitle('TC-LIST-CREATE-013'), async ({ createListingPage }) => {
  await createListingPage.open();

  // 1. Chuyển sang loại hình "Cho thuê"
  await createListingPage.selectTransactionType('rent');
  await expect.poll(async () => createListingPage.isDepositVisible()).toBe(true);

  // 2. Xác nhận danh sách các nút tùy chọn Đặt cọc xuất hiện đầy đủ
  const options = await createListingPage.depositOptions();
  expect(options).toEqual(
    expect.arrayContaining(['Không', '1 tháng', '3 tháng', '6 tháng', '1 năm']),
  );

  // 3. Xác nhận trường Đặt cọc là tùy chọn (không có class required, không có dấu *)
  expect(await createListingPage.isDepositRequired()).toBe(false);

  // 4. Thử chọn một mức đặt cọc (ví dụ "1 tháng") và kiểm tra trạng thái kích hoạt
  await createListingPage.selectDepositOption('1 tháng');
  expect(await createListingPage.selectedDepositOption()).toBe('1 tháng');

  // 5. Xác nhận không có thông báo lỗi bắt buộc cho trường Đặt cọc
  expect(await createListingPage.depositError()).toBe('');
});



