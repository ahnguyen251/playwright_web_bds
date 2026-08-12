export const LISTING_UI_LIMITS = Object.freeze({
  titleCharacters: 120,
  descriptionCharacters: 5000,
  maximumImages: 10,
  maximumImageBytes: 3 * 1024 * 1024,
  maximumVideos: 1,
  maximumVideoBytes: 10 * 1024 * 1024,
});

export const LISTING_STATUS_LABELS = Object.freeze({
  pendingApproval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đang đăng',
  withdrawn: 'Đã gỡ',
} as const);
