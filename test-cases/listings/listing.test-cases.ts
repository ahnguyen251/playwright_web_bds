import type {
  ListingRequirementId,
  ListingTestCaseDefinition,
  TestClassification,
  TestPriority,
} from '../../types/test-case.types';

const MANUAL_EVIDENCE = 'docs/traceability/requirements-to-tests.md#listings-manual-evidence';

interface ListingCaseSeed {
  readonly id: string;
  readonly title: string;
  readonly precondition: string;
  readonly testData: string;
  readonly expectedResult: string;
  readonly requiredListingState: string;
  readonly playwrightTest: string;
}

interface RequirementDefaults {
  readonly requirementId: ListingRequirementId;
  readonly classification: TestClassification;
  readonly priority: TestPriority;
  readonly requiredUserState: string;
  readonly tags: readonly string[];
}

const defineCases = (
  defaults: RequirementDefaults,
  seeds: readonly ListingCaseSeed[],
): readonly ListingTestCaseDefinition[] =>
  seeds.map((seed) =>
    Object.freeze({
      id: seed.id,
      title: seed.title,
      module: 'Listings',
      requirementId: defaults.requirementId,
      scenario: `Kịch bản: ${seed.title}`,
      classification: defaults.classification,
      priority: defaults.priority,
      tags: Object.freeze([...defaults.tags]),
      preconditions: Object.freeze([seed.precondition]),
      testData: seed.testData,
      requiredUserState: defaults.requiredUserState,
      requiredListingState: seed.requiredListingState,
      expectedResult: seed.expectedResult,
      playwrightTest: seed.playwrightTest,
      language: 'vi' as const,
    }),
  );

type ListingCaseRow = readonly [
  suffix: string,
  title: string,
  precondition: string,
  testData: string,
  expectedResult: string,
  requiredListingState: string,
  playwrightTest: string,
];

const withIds = (prefix: string, rows: readonly ListingCaseRow[]): readonly ListingCaseSeed[] =>
  rows.map(
    ([
      suffix,
      title,
      precondition,
      testData,
      expectedResult,
      requiredListingState,
      playwrightTest,
    ]) => ({
      id: `${prefix}-${suffix}`,
      title,
      precondition,
      testData,
      expectedResult,
      requiredListingState,
      playwrightTest,
    }),
  );

const uc08 = defineCases(
  {
    requirementId: 'UC-08',
    classification: 'mutating',
    priority: 'critical',
    requiredUserState: 'Người dùng đã đăng nhập và có số điện thoại hợp lệ',
    tags: ['@listings', '@uc08', '@mutating'],
  },
  [
    {
      id: 'LIST-UC08-001',
      title: 'Tạo tin đăng hợp lệ kèm ảnh',
      precondition: 'Tài khoản chủ tin đã sẵn sàng tạo dữ liệu kiểm thử',
      testData: 'Dữ liệu hợp lệ từ ListingDataFactory và ảnh property.png',
      expectedResult: 'Tin được lưu, liên kết ảnh và chuyển sang trạng thái Chờ duyệt',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-002',
      title: 'Tạo tin đăng hợp lệ kèm video tùy chọn',
      precondition: 'Biểu mẫu tạo tin cho phép tải ảnh và video',
      testData: 'Ảnh property.png và video tổng hợp property.mp4',
      expectedResult: 'Biểu mẫu chấp nhận video và tin mới có trạng thái Chờ duyệt',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-003',
      title: 'Yêu cầu bổ sung số điện thoại trước khi tạo tin',
      precondition: 'Tài khoản đã đăng nhập nhưng chưa có số điện thoại hợp lệ',
      testData: 'Dữ liệu tin đăng hợp lệ',
      expectedResult: 'Hệ thống yêu cầu cập nhật số điện thoại và không tạo tin',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: MANUAL_EVIDENCE,
    },
    {
      id: 'LIST-UC08-004',
      title: 'Từ chối biểu mẫu thiếu dữ liệu bắt buộc',
      precondition: 'Người dùng đang ở biểu mẫu tạo tin',
      testData: 'Các trường bắt buộc được để trống',
      expectedResult: 'Hiển thị lỗi theo từng trường và không báo tạo tin thành công',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-005',
      title: 'Kiểm tra biên văn bản và giá trị số',
      precondition: 'Biểu mẫu tạo tin đã được mở',
      testData: 'Tiêu đề 120 và 121 ký tự, mô tả 5000 và 5001 ký tự, số bằng không hoặc âm',
      expectedResult: 'Chấp nhận đúng biên và hiển thị lỗi cho mọi giá trị vượt biên',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-006',
      title: 'Kiểm tra giới hạn số lượng và dung lượng media',
      precondition: 'Biểu mẫu tạo tin đã được mở',
      testData: 'Mười và mười một ảnh, ảnh hoặc video tại và vượt dung lượng tối đa',
      expectedResult: 'Chấp nhận media đúng giới hạn và từ chối media vượt giới hạn',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-007',
      title: 'Từ chối định dạng media không hợp lệ',
      precondition: 'Biểu mẫu tạo tin đã được mở',
      testData: 'Tệp invalid.txt không phải media',
      expectedResult: 'Hiển thị lỗi định dạng media và cho phép người dùng chọn lại',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: 'tests/component/pages/ListingFormComponent.spec.ts',
    },
    {
      id: 'LIST-UC08-008',
      title: 'Xử lý lỗi tải lên, mạng, hết thời gian hoặc hệ thống',
      precondition: 'Có cơ chế tái hiện lỗi ổn định và xác định',
      testData: 'Yêu cầu tải lên hoặc tạo tin được cấu hình trả lỗi',
      expectedResult: 'Hiển thị lỗi hoặc tùy chọn thử lại và không báo thành công sai',
      requiredListingState: 'Không yêu cầu tin có sẵn',
      playwrightTest: MANUAL_EVIDENCE,
    },
  ],
);

const uc09 = defineCases(
  {
    requirementId: 'UC-09',
    classification: 'read-only',
    priority: 'high',
    requiredUserState: 'Người dùng đã đăng nhập',
    tags: ['@listings', '@uc09', '@read-only'],
  },
  withIds('LIST-UC09', [
    [
      '001',
      'Xem danh sách tin của người dùng hiện tại',
      'Tài khoản có tin thuộc sở hữu',
      'Không cần dữ liệu nhập',
      'Chỉ hiển thị tin thuộc người dùng hiện tại và đúng trạng thái',
      'Có danh sách tin thuộc sở hữu',
      'tests/listings/view-own-listings.read-only.spec.ts',
    ],
    [
      '002',
      'Hiển thị danh sách tin của tôi trống',
      'Tài khoản không có tin đăng',
      'Không cần dữ liệu nhập',
      'Hiển thị trạng thái Không có tin đăng',
      'Không có tin thuộc sở hữu',
      'tests/component/pages/MyListingsPage.spec.ts',
    ],
    [
      '003',
      'Tìm kiếm trong danh sách tin của tôi',
      'Tài khoản có tin kiểm soát',
      'Tiêu đề tin thuộc sở hữu đã cấu hình',
      'Chỉ hiển thị hàng khớp tiêu đề tìm kiếm',
      'Có tin thuộc sở hữu đã cấu hình',
      'tests/listings/view-own-listings.read-only.spec.ts',
    ],
    [
      '004',
      'Lọc danh sách tin của tôi',
      'Tài khoản có dữ liệu phù hợp bộ lọc',
      'Loại giao dịch và trạng thái hiển thị',
      'Mọi hàng hiển thị khớp bộ lọc đã chọn',
      'Có nhiều trạng thái tin thuộc sở hữu',
      'tests/component/pages/MyListingsPage.spec.ts',
    ],
    [
      '005',
      'Chuyển trang tiếp theo và quay lại',
      'Danh sách có nhiều hơn một trang',
      'Điều khiển phân trang',
      'Dữ liệu đổi theo trang và có thể quay lại trang trước',
      'Có danh sách tin được phân trang',
      'tests/component/pages/MyListingsPage.spec.ts',
    ],
    [
      '006',
      'Hiển thị không có kết quả tìm kiếm trong tin của tôi',
      'Người dùng đang xem danh sách tin của mình',
      'Từ khóa duy nhất không tồn tại',
      'Hiển thị trạng thái rỗng và không chọn nhầm tin khác',
      'Có thể có hoặc không có tin thuộc sở hữu',
      'tests/listings/view-own-listings.read-only.spec.ts',
    ],
    [
      '007',
      'Xử lý lỗi tải danh sách tin của tôi',
      'Có cơ chế tái hiện lỗi ổn định',
      'Yêu cầu danh sách được cấu hình trả lỗi',
      'Hiển thị lỗi hoặc tùy chọn thử lại',
      'Không yêu cầu trạng thái tin cụ thể',
      MANUAL_EVIDENCE,
    ],
  ]),
);

const uc10 = defineCases(
  {
    requirementId: 'UC-10',
    classification: 'read-only',
    priority: 'critical',
    requiredUserState: 'Khách hoặc người dùng có quyền xem tin công khai',
    tags: ['@listings', '@uc10', '@read-only'],
  },
  withIds('LIST-UC10', [
    [
      '001',
      'Hiển thị đầy đủ chi tiết tin đã duyệt',
      'Tin công khai tồn tại',
      'Tham chiếu LISTING_APPROVED_ID',
      'Hiển thị thông tin, media, mô tả, liên hệ, tiện ích và tin liên quan',
      'Tin có trạng thái Đã duyệt và đủ dữ liệu',
      'tests/listings/listing-detail.read-only.spec.ts',
    ],
    [
      '002',
      'Hiển thị thông báo khi tin không tồn tại',
      'Không yêu cầu đăng nhập',
      'Mã tin chắc chắn không tồn tại',
      'Hiển thị không tìm thấy và không hiển thị nội dung chi tiết',
      'Không có bản ghi tương ứng',
      'tests/listings/listing-detail.read-only.spec.ts',
    ],
    [
      '003',
      'Ẩn nội dung tin chưa được duyệt',
      'Tin chưa duyệt tồn tại',
      'Tham chiếu LISTING_UNAPPROVED_ID',
      'Không hiển thị nội dung chi tiết công khai',
      'Tin có trạng thái chưa được duyệt',
      'tests/listings/listing-detail.read-only.spec.ts',
    ],
    [
      '004',
      'Hiển thị ảnh mặc định khi tin không có media',
      'Tin đã duyệt tồn tại nhưng không có media',
      'Tham chiếu LISTING_NO_MEDIA_ID',
      'Hiển thị ảnh mặc định thay cho vùng media trống',
      'Tin Đã duyệt không có media',
      'tests/listings/listing-detail.read-only.spec.ts',
    ],
    [
      '005',
      'Quan sát tác động phụ tăng lượt xem',
      'Trang chi tiết tin đã duyệt được mở',
      'Tham chiếu tin đã duyệt',
      'Lượt xem hiển thị là giá trị hợp lệ và test vẫn được phân loại chỉ đọc',
      'Tin Đã duyệt được kiểm soát',
      'tests/component/pages/ListingDetailPage.spec.ts',
    ],
  ]),
);

const uc11Edit = defineCases(
  {
    requirementId: 'UC-11-EDIT',
    classification: 'mutating',
    priority: 'critical',
    requiredUserState: 'Chủ tin đã đăng nhập',
    tags: ['@listings', '@uc11-edit', '@mutating'],
  },
  withIds('LIST-UC11-EDIT', [
    [
      '001',
      'Chỉnh sửa thông tin tin thuộc sở hữu',
      'Biểu mẫu chỉnh sửa được dựng từ trạng thái tin kiểm soát',
      'Dữ liệu cập nhật xác định trong component fixture',
      'Lưu thay đổi và chuyển trạng thái sang Chờ duyệt mà không làm trôi dữ liệu staging',
      'Tin thuộc sở hữu có thể sửa',
      'tests/component/pages/ListingFormComponent.spec.ts',
    ],
    [
      '002',
      'Thêm và xóa media khi chỉnh sửa',
      'Tin có thể sửa đã có media',
      'Ảnh tổng hợp mới và tên media hiện có',
      'Cập nhật danh sách media và chuyển trạng thái sang Chờ duyệt',
      'Tin thuộc sở hữu có media',
      'tests/component/pages/ListingFormComponent.spec.ts',
    ],
    [
      '003',
      'Từ chối người không phải chủ tin chỉnh sửa',
      'Người dùng không sở hữu tin',
      'Tham chiếu LISTING_OTHER_OWNER_ID',
      'Hiển thị Không có quyền và không lưu thay đổi',
      'Tin thuộc người dùng khác',
      'tests/listings/edit-listing.mutating.spec.ts',
    ],
    [
      '004',
      'Từ chối dữ liệu chỉnh sửa không hợp lệ',
      'Chủ tin đang mở biểu mẫu chỉnh sửa',
      'Giá trị ngoài biên hoặc sai định dạng',
      'Hiển thị lỗi theo trường và giữ nguyên dữ liệu cũ',
      'Tin thuộc sở hữu có thể sửa',
      'tests/component/pages/ListingFormComponent.spec.ts',
    ],
    [
      '005',
      'Xử lý lỗi tải media khi chỉnh sửa',
      'Có cơ chế lỗi tải lên xác định',
      'Media không hợp lệ hoặc yêu cầu tải lên thất bại',
      'Hiển thị lỗi tải lên và cho phép thử lại',
      'Tin thuộc sở hữu có thể sửa',
      'tests/component/pages/ListingFormComponent.spec.ts',
    ],
  ]),
);

const uc11Withdraw = defineCases(
  {
    requirementId: 'UC-11-WITHDRAW',
    classification: 'mutating',
    priority: 'critical',
    requiredUserState: 'Chủ tin đã đăng nhập',
    tags: ['@listings', '@uc11-withdraw', '@mutating'],
  },
  withIds('LIST-UC11-WITHDRAW', [
    [
      '001',
      'Xác nhận gỡ tin đang đăng',
      'Tin thuộc sở hữu đang được công khai',
      'Tham chiếu dành riêng cho thao tác gỡ',
      'Chuyển trạng thái thành Đã gỡ và ẩn khỏi công khai nhưng không xóa bản ghi',
      'Tin có trạng thái Đang đăng và có thể seed lại',
      'tests/listings/withdraw-listing.mutating.spec.ts',
    ],
    [
      '002',
      'Hủy thao tác gỡ tin',
      'Tin thuộc sở hữu đang được công khai',
      'Tham chiếu dành riêng cho thao tác hủy',
      'Đóng xác nhận và giữ nguyên trạng thái cùng khả năng hiển thị',
      'Tin có trạng thái Đang đăng',
      'tests/listings/withdraw-listing.mutating.spec.ts',
    ],
    [
      '003',
      'Từ chối gỡ tin có trạng thái không hợp lệ',
      'Tin thuộc sở hữu không ở trạng thái công khai',
      'Tham chiếu tin Chờ duyệt hoặc Đã gỡ',
      'Hiển thị Không cho phép gỡ và không đổi trạng thái',
      'Tin có trạng thái khác Đang đăng',
      'tests/listings/withdraw-listing.mutating.spec.ts',
    ],
    [
      '004',
      'Từ chối người không phải chủ tin gỡ tin',
      'Người dùng không sở hữu tin',
      'Tham chiếu tin của người khác',
      'Hiển thị lỗi quyền sở hữu và không đổi trạng thái',
      'Tin thuộc người dùng khác',
      'tests/listings/withdraw-listing.mutating.spec.ts',
    ],
    [
      '005',
      'Không gỡ nhầm khi tin không tồn tại',
      'Người dùng đang xem danh sách tin của mình',
      'Tiêu đề chắc chắn không tồn tại',
      'Không hiển thị hoặc không thực hiện thao tác gỡ',
      'Không có tin khớp tham chiếu',
      'tests/component/pages/MyListingsPage.spec.ts',
    ],
    [
      '006',
      'Xử lý lỗi yêu cầu gỡ tin',
      'Có cơ chế tái hiện lỗi ổn định',
      'Yêu cầu gỡ được cấu hình trả lỗi',
      'Hiển thị thất bại và giữ trạng thái Đang đăng',
      'Tin hợp lệ có trạng thái Đang đăng',
      MANUAL_EVIDENCE,
    ],
  ]),
);

const uc12 = defineCases(
  {
    requirementId: 'UC-12',
    classification: 'mutating',
    priority: 'high',
    requiredUserState: 'Người dùng đã đăng nhập, trừ kịch bản khách',
    tags: ['@listings', '@uc12', '@mutating'],
  },
  withIds('LIST-UC12', [
    [
      '001',
      'Thêm rồi bỏ yêu thích trong cùng test',
      'Tin công khai tồn tại',
      'Tham chiếu tin đã duyệt',
      'Biểu tượng và dữ liệu yêu thích trở về trạng thái ban đầu sau hai lần nhấn',
      'Tin đã duyệt được kiểm soát',
      'tests/listings/favorite-listing.mutating.spec.ts',
    ],
    [
      '002',
      'Kiểm tra danh sách yêu thích sau khi thêm và bỏ',
      'Tin được thêm và bỏ trong cùng test độc lập',
      'Tham chiếu tin đã duyệt',
      'Danh sách chứa tin sau khi thêm và không còn tin sau khi bỏ',
      'Tin đã duyệt được kiểm soát',
      'tests/listings/favorite-listing.mutating.spec.ts',
    ],
    [
      '003',
      'Yêu cầu khách đăng nhập khi nhấn yêu thích',
      'Khách chưa đăng nhập',
      'Tham chiếu tin đã duyệt',
      'Hiển thị đăng nhập và không thêm yêu thích',
      'Tin công khai tồn tại',
      'tests/listings/favorite-listing.mutating.spec.ts',
    ],
    [
      '004',
      'Không yêu thích tin không tồn tại',
      'Người dùng đã đăng nhập',
      'Mã tin chắc chắn không tồn tại',
      'Hiển thị không tìm thấy và không thay đổi danh sách yêu thích',
      'Không có bản ghi tương ứng',
      'tests/component/pages/FavoritesPage.spec.ts',
    ],
    [
      '005',
      'Giữ biểu tượng nhất quán khi yêu cầu yêu thích thất bại',
      'Có cơ chế tái hiện lỗi ổn định',
      'Yêu cầu yêu thích được cấu hình trả lỗi',
      'Hiển thị lỗi, cho phép thử lại và giữ trạng thái biểu tượng',
      'Tin đã duyệt được kiểm soát',
      MANUAL_EVIDENCE,
    ],
  ]),
);

const uc16 = defineCases(
  {
    requirementId: 'UC-16',
    classification: 'read-only',
    priority: 'high',
    requiredUserState: 'Khách chưa đăng nhập để không lưu lịch sử tìm kiếm',
    tags: ['@listings', '@uc16', '@read-only'],
  },
  withIds('LIST-UC16', [
    [
      '001',
      'Tìm kiếm bằng từ khóa công khai hợp lệ',
      'Có dữ liệu đủ điều kiện hiển thị',
      'Một phần tiêu đề tin đã duyệt',
      'Kết quả chứa tin công khai khớp từ khóa',
      'Có tin đã duyệt được kiểm soát',
      'tests/listings/search-listing.read-only.spec.ts',
    ],
    [
      '002',
      'Chỉ tìm kiếm bằng từ khóa',
      'Mọi bộ lọc ở giá trị mặc định',
      'Từ khóa công khai hợp lệ',
      'Kết quả được xác định theo từ khóa mà không áp dụng bộ lọc bổ sung',
      'Có dữ liệu công khai khớp',
      'tests/listings/search-listing.read-only.spec.ts',
    ],
    [
      '003',
      'Hiển thị tìm kiếm không có kết quả',
      'Trang danh sách công khai hoạt động',
      'Từ khóa duy nhất không tồn tại',
      'Hiển thị trạng thái không có kết quả',
      'Không yêu cầu tin cụ thể',
      'tests/listings/search-listing.read-only.spec.ts',
    ],
    [
      '004',
      'Từ chối từ khóa vượt độ dài tối đa được cấu hình',
      'Có nguồn cấu hình giới hạn chính thức',
      'Giới hạn chính thức cộng một ký tự',
      'Hiển thị validation và không gửi yêu cầu tìm kiếm',
      'Không yêu cầu tin cụ thể',
      MANUAL_EVIDENCE,
    ],
    [
      '005',
      'Sắp xếp kết quả tìm kiếm',
      'Có nhiều tin công khai',
      'Tùy chọn sắp xếp hiện có trên giao diện',
      'Danh sách hiển thị đúng thứ tự được chọn',
      'Có dữ liệu công khai ổn định',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '006',
      'Chuyển trang kết quả tiếp theo và quay lại',
      'Số kết quả lớn hơn kích thước một trang',
      'Điều khiển phân trang',
      'Trang tiếp theo đổi dữ liệu và quay lại khôi phục trang trước',
      'Có danh sách công khai được phân trang',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '007',
      'Loại bỏ tin không đủ điều kiện hiển thị',
      'Có dữ liệu đã duyệt và chưa duyệt',
      'Tham chiếu các trạng thái tin được kiểm soát',
      'Chỉ tin đủ điều kiện công khai xuất hiện',
      'Có tin đã duyệt và chưa duyệt',
      'tests/listings/search-listing.read-only.spec.ts',
    ],
    [
      '008',
      'Xử lý lỗi tải dữ liệu khi tìm kiếm',
      'Có cơ chế tái hiện lỗi ổn định',
      'Yêu cầu tìm kiếm được cấu hình trả lỗi',
      'Hiển thị lỗi hoặc tùy chọn thử lại',
      'Không yêu cầu tin cụ thể',
      MANUAL_EVIDENCE,
    ],
  ]),
);

const uc17 = defineCases(
  {
    requirementId: 'UC-17',
    classification: 'read-only',
    priority: 'high',
    requiredUserState: 'Khách hoặc người dùng đang xem danh sách công khai',
    tags: ['@listings', '@uc17', '@read-only'],
  },
  withIds('LIST-UC17', [
    [
      '001',
      'Lọc người đăng là Chủ nhà',
      'Có tin do chủ nhà đăng',
      'Giá trị người đăng Chủ nhà',
      'Mọi kết quả đều do chủ nhà đăng',
      'Có tin chủ nhà công khai',
      'tests/listings/filter-listing.read-only.spec.ts',
    ],
    [
      '002',
      'Lọc người đăng là Môi giới',
      'Có tin do môi giới đăng',
      'Giá trị người đăng Môi giới',
      'Mọi kết quả đều do môi giới đăng',
      'Có tin môi giới công khai',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '003',
      'Lọc theo khoảng giá có sẵn',
      'Có tin công khai với giá xác định',
      'Khoảng giá có sẵn trên giao diện',
      'Mọi giá hiển thị nằm trong khoảng được chọn',
      'Có dữ liệu giá công khai',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '004',
      'Lọc theo khoảng giá tùy chỉnh Từ và Đến',
      'Có tin công khai với giá dạng số',
      'Hai giá trị dương Từ và Đến',
      'Mọi kết quả nằm trong khoảng giá tùy chỉnh',
      'Có dữ liệu giá công khai',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '005',
      'Lọc theo khoảng diện tích có sẵn',
      'Có dữ liệu diện tích công khai',
      'Khoảng diện tích có sẵn trên giao diện',
      'Mọi diện tích hiển thị nằm trong khoảng được chọn',
      'Có dữ liệu diện tích công khai',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '006',
      'Lọc theo diện tích tùy chỉnh Từ và Đến',
      'Có dữ liệu diện tích dạng số',
      'Hai giá trị dương Từ và Đến',
      'Mọi diện tích nằm trong khoảng tùy chỉnh',
      'Có dữ liệu diện tích công khai',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '007',
      'Kết hợp các bộ lọc được hỗ trợ',
      'Có dữ liệu công khai khớp tổ hợp',
      'Người đăng, khoảng giá và khoảng diện tích',
      'Mọi kết quả thỏa mãn đồng thời tất cả điều kiện',
      'Có danh sách khớp được kiểm soát',
      'tests/listings/filter-listing.read-only.spec.ts',
    ],
    [
      '008',
      'Hiển thị đúng số lượng kết quả lọc',
      'Có ít nhất một bộ lọc đang hoạt động',
      'Các điều kiện lọc đã chọn',
      'Số lượng hiển thị bằng số bản tóm tắt tin trả về',
      'Có danh sách công khai ổn định',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '009',
      'Đặt lại toàn bộ bộ lọc',
      'Bộ lọc đang khác giá trị mặc định',
      'Các điều kiện không mặc định',
      'Khôi phục bộ lọc, danh sách và số lượng ban đầu',
      'Có danh sách công khai ổn định',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '010',
      'Hiển thị lỗi khi giá Từ lớn hơn giá Đến',
      'Trang danh sách công khai đã mở',
      'Giá Từ là mười và giá Đến là hai',
      'Hiển thị thông báo validation khoảng giá',
      'Không yêu cầu tin cụ thể',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '011',
      'Hiển thị lỗi khi diện tích Từ lớn hơn diện tích Đến',
      'Trang danh sách công khai đã mở',
      'Diện tích Từ là một trăm và Đến là ba mươi',
      'Hiển thị thông báo validation khoảng diện tích',
      'Không yêu cầu tin cụ thể',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '012',
      'Chuẩn hóa giá trị khoảng nhỏ hơn hoặc bằng không',
      'Trang danh sách công khai đã mở',
      'Giá trị bằng không và số âm',
      'Giao diện chuẩn hóa giá trị thành không',
      'Không yêu cầu tin cụ thể',
      'tests/component/pages/ListingListPage.spec.ts',
    ],
    [
      '013',
      'Hiển thị không có kết quả phù hợp bộ lọc',
      'Trang danh sách công khai đã mở',
      'Tổ hợp khoảng chắc chắn không có kết quả',
      'Hiển thị trạng thái rỗng và số lượng bằng không',
      'Không yêu cầu tin cụ thể',
      'tests/listings/filter-listing.read-only.spec.ts',
    ],
    [
      '014',
      'Xử lý lỗi tải dữ liệu khi lọc',
      'Có cơ chế tái hiện lỗi ổn định',
      'Yêu cầu lọc được cấu hình trả lỗi',
      'Hiển thị lỗi hoặc tùy chọn thử lại',
      'Không yêu cầu tin cụ thể',
      MANUAL_EVIDENCE,
    ],
  ]),
);

export const listingTestCases: readonly ListingTestCaseDefinition[] = Object.freeze([
  ...uc08,
  ...uc09,
  ...uc10,
  ...uc11Edit,
  ...uc11Withdraw,
  ...uc12,
  ...uc16,
  ...uc17,
]);

export const getListingTestCase = (id: string): ListingTestCaseDefinition => {
  const testCase = listingTestCases.find((candidate) => candidate.id === id);
  if (testCase === undefined) throw new Error(`Unknown listing test case: ${id}`);
  return testCase;
};

export const listingCaseTitle = (id: string): string => {
  const testCase = getListingTestCase(id);
  return `${testCase.id} ${testCase.title} ${testCase.tags.join(' ')}`;
};
