export type VipPackageTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'NORMAL';

export interface VipTierConfig {
  readonly priority: number;
  readonly multiplier: number;
  readonly decayRate: number;
  readonly name: string;
}

export const VIP_TIER_CONFIG: Readonly<Record<VipPackageTier, VipTierConfig>> = Object.freeze({
  DIAMOND: Object.freeze({
    priority: 4,
    multiplier: 5.0,
    decayRate: 0.01,
    name: 'VIP Kim Cương',
  }),
  GOLD: Object.freeze({
    priority: 3,
    multiplier: 3.0,
    decayRate: 0.02,
    name: 'VIP Vàng',
  }),
  SILVER: Object.freeze({
    priority: 2,
    multiplier: 2.0,
    decayRate: 0.05,
    name: 'VIP Bạc',
  }),
  NORMAL: Object.freeze({
    priority: 1,
    multiplier: 1.0,
    decayRate: 0.08,
    name: 'Tin Thường',
  }),
});

export interface RankedListingInput {
  readonly id: number | string;
  readonly title: string;
  readonly tier: VipPackageTier;
  readonly qualityScore: number;
  readonly publishedHoursAgo: number;
}

export interface CalculatedRankScore {
  readonly priority: number;
  readonly baseScore: number;
  readonly dailyDecay: number;
  readonly tierDecay: number;
  readonly finalScore: number;
}

/**
 * Bước 1: Tính Điểm gốc = Điểm chất lượng × Hệ số nhân gói tin.
 */
export const calculateBaseScore = (qualityScore: number, tier: VipPackageTier): number => {
  const config = VIP_TIER_CONFIG[tier];
  return qualityScore * config.multiplier;
};

/**
 * Bước 2: Hệ số giảm theo ngày = 1 / (1 + Số giờ đã đăng / 24).
 */
export const calculateDailyDecay = (publishedHoursAgo: number): number => {
  return 1 / (1 + publishedHoursAgo / 24);
};

/**
 * Bước 3: Hệ số giảm theo gói = e ^ (- Tốc độ giảm điểm của gói × Số giờ đã đăng).
 */
export const calculateTierDecay = (publishedHoursAgo: number, tier: VipPackageTier): number => {
  const config = VIP_TIER_CONFIG[tier];
  return Math.exp(-config.decayRate * publishedHoursAgo);
};

/**
 * Bước 4: Tính Điểm hiển thị cuối cùng (Final Score) = Điểm gốc × Hệ số giảm ngày × Hệ số giảm gói.
 */
export const calculateFinalScore = (input: {
  qualityScore: number;
  tier: VipPackageTier;
  publishedHoursAgo: number;
}): number => {
  const baseScore = calculateBaseScore(input.qualityScore, input.tier);
  const dailyDecay = calculateDailyDecay(input.publishedHoursAgo);
  const tierDecay = calculateTierDecay(input.publishedHoursAgo, input.tier);
  return baseScore * dailyDecay * tierDecay;
};

/**
 * Trả về chi tiết các bước tính điểm hiển thị của tin đăng.
 */
export const calculateRankDetails = (input: {
  qualityScore: number;
  tier: VipPackageTier;
  publishedHoursAgo: number;
}): CalculatedRankScore => {
  const priority = VIP_TIER_CONFIG[input.tier].priority;
  const baseScore = calculateBaseScore(input.qualityScore, input.tier);
  const dailyDecay = calculateDailyDecay(input.publishedHoursAgo);
  const tierDecay = calculateTierDecay(input.publishedHoursAgo, input.tier);
  const finalScore = baseScore * dailyDecay * tierDecay;

  return Object.freeze({
    priority,
    baseScore,
    dailyDecay,
    tierDecay,
    finalScore,
  });
};

/**
 * So sánh thứ tự xếp hạng giữa 2 tin đăng theo 2 quy tắc cốt lõi:
 * 1. Ưu tiên Cấp ưu tiên gói tin (Priority cao hơn xếp trên).
 * 2. Nếu cùng Cấp ưu tiên, tin có Điểm hiển thị (Final Score) cao hơn xếp trên.
 *
 * Trả về:
 * - Số âm (< 0) nếu tin A xếp TRÊN tin B.
 * - Số dương (> 0) nếu tin A xếp DƯỚI tin B.
 * - 0 nếu ngang nhau.
 */
export const compareListingRank = (a: RankedListingInput, b: RankedListingInput): number => {
  const aPriority = VIP_TIER_CONFIG[a.tier].priority;
  const bPriority = VIP_TIER_CONFIG[b.tier].priority;

  // Ưu tiên 1: Cấp ưu tiên gói tin
  if (aPriority !== bPriority) {
    return bPriority - aPriority; // Cấp cao hơn đứng trước
  }

  // Ưu tiên 2: Điểm hiển thị (Final Score)
  const aScore = calculateFinalScore(a);
  const bScore = calculateFinalScore(b);

  if (Math.abs(bScore - aScore) > 1e-9) {
    return bScore - aScore; // Điểm cao hơn đứng trước
  }

  return 0;
};
