import { expect, test } from '@playwright/test';

import {
  calculateBaseScore,
  calculateDailyDecay,
  calculateFinalScore,
  calculateRankDetails,
  calculateTierDecay,
  compareListingRank,
  type RankedListingInput,
  VIP_TIER_CONFIG,
} from '../../../helpers/ranking/rankingCalculator';

test.describe('Ranking Calculator - Business Rules & Formulas', () => {
  test('Bảng cấu hình gói tin (VIP_TIER_CONFIG) khớp chính xác tham số Mục 4 tài liệu', () => {
    expect(VIP_TIER_CONFIG.DIAMOND).toEqual({
      priority: 4,
      multiplier: 5.0,
      decayRate: 0.01,
      name: 'VIP Kim Cương',
    });
    expect(VIP_TIER_CONFIG.GOLD).toEqual({
      priority: 3,
      multiplier: 3.0,
      decayRate: 0.02,
      name: 'VIP Vàng',
    });
    expect(VIP_TIER_CONFIG.SILVER).toEqual({
      priority: 2,
      multiplier: 2.0,
      decayRate: 0.05,
      name: 'VIP Bạc',
    });
    expect(VIP_TIER_CONFIG.NORMAL).toEqual({
      priority: 1,
      multiplier: 1.0,
      decayRate: 0.08,
      name: 'Tin Thường',
    });
  });

  test('Bước 1: Tính đúng Điểm gốc (Base Score = Điểm chất lượng × Hệ số nhân gói)', () => {
    // VIP Kim Cương: Multiplier x5.0
    expect(calculateBaseScore(10, 'DIAMOND')).toBe(50);
    expect(calculateBaseScore(6, 'DIAMOND')).toBe(30);

    // VIP Vàng: Multiplier x3.0
    expect(calculateBaseScore(10, 'GOLD')).toBe(30);
    expect(calculateBaseScore(6, 'GOLD')).toBe(18);

    // VIP Bạc: Multiplier x2.0
    expect(calculateBaseScore(10, 'SILVER')).toBe(20);
    expect(calculateBaseScore(8, 'SILVER')).toBe(16);
    expect(calculateBaseScore(6, 'SILVER')).toBe(12);

    // Tin Thường: Multiplier x1.0
    expect(calculateBaseScore(10, 'NORMAL')).toBe(10);
    expect(calculateBaseScore(5, 'NORMAL')).toBe(5);
  });

  test('Bước 2: Tính đúng Hệ số giảm theo ngày (Daily Decay = 1 / (1 + Hours / 24))', () => {
    // 0 giờ: hệ số = 1.0 (chưa giảm)
    expect(calculateDailyDecay(0)).toBe(1);

    // 24 giờ (1 ngày): hệ số = 1 / 2 = 0.5
    expect(calculateDailyDecay(24)).toBe(0.5);

    // 72 giờ (3 ngày): hệ số = 1 / (1 + 3) = 0.25
    expect(calculateDailyDecay(72)).toBe(0.25);

    // 168 giờ (7 ngày): hệ số = 1 / (1 + 7) = 0.125
    expect(calculateDailyDecay(168)).toBe(0.125);
  });

  test('Bước 3: Tính đúng Hệ số giảm theo gói (Tier Decay = e ^ (- DecayRate × Hours))', () => {
    // VIP Kim Cương (DecayRate 0.01) tại 48h: e^(-0.48) ≈ 0.6188
    const diamondDecay48 = calculateTierDecay(48, 'DIAMOND');
    expect(diamondDecay48).toBeCloseTo(Math.exp(-0.48), 4);
    expect(diamondDecay48).toBeGreaterThan(0.61);

    // VIP Vàng (DecayRate 0.02) tại 72h: e^(-1.44) ≈ 0.2369
    const goldDecay72 = calculateTierDecay(72, 'GOLD');
    expect(goldDecay72).toBeCloseTo(0.2369, 3);

    // VIP Bạc (DecayRate 0.05) tại 2h: e^(-0.10) ≈ 0.9048
    const silverDecay2 = calculateTierDecay(2, 'SILVER');
    expect(silverDecay2).toBeCloseTo(0.9048, 3);

    // Tin Thường (DecayRate 0.08) tại 48h: e^(-3.84) ≈ 0.0215
    const normalDecay48 = calculateTierDecay(48, 'NORMAL');
    expect(normalDecay48).toBeCloseTo(0.0215, 3);
  });

  test('Bước 4: Tính đúng Điểm hiển thị (Final Score) theo ví dụ thực tế Mục 7 tài liệu', () => {
    // Tin A: VIP Vàng, chất lượng 10/10, đăng 72 giờ
    // Base = 30, Daily ≈ 0.25, Tier ≈ 0.2369 -> Final ≈ 1.78 ≈ 1.8
    const scoreA = calculateFinalScore({
      qualityScore: 10,
      tier: 'GOLD',
      publishedHoursAgo: 72,
    });
    expect(scoreA).toBeCloseTo(1.777, 2);

    // Tin B: VIP Bạc, chất lượng 9/10, đăng 2 giờ
    // Base = 18, Daily = 1 / (1 + 2/24) ≈ 0.9231, Tier = e^(-0.10) ≈ 0.9048 -> Final ≈ 15.03 ≈ 15.0
    const scoreB = calculateFinalScore({
      qualityScore: 9,
      tier: 'SILVER',
      publishedHoursAgo: 2,
    });
    expect(scoreB).toBeCloseTo(15.03, 1);
  });

  test('TC-RANK-ORDER-001: VIP Kim Cương đăng 168h LUÔN xếp TRÊN VIP Vàng vừa đăng 0h (Cấp gói 4 > 3)', () => {
    const tinA: RankedListingInput = {
      id: 1,
      title: 'Tin A - Kim Cương cũ',
      tier: 'DIAMOND',
      qualityScore: 10,
      publishedHoursAgo: 168,
    };
    const tinB: RankedListingInput = {
      id: 2,
      title: 'Tin B - Vàng mới',
      tier: 'GOLD',
      qualityScore: 10,
      publishedHoursAgo: 0,
    };

    const detailsA = calculateRankDetails(tinA);
    const detailsB = calculateRankDetails(tinB);

    // Chứng minh Final Score Tin A thấp hơn nhiều so với Tin B
    expect(detailsA.finalScore).toBeLessThan(1.5);
    expect(detailsB.finalScore).toBe(30);
    expect(detailsA.finalScore).toBeLessThan(detailsB.finalScore);

    // Nhưng Quy tắc 1 Cấp ưu tiên gói: Cấp 4 > Cấp 3 nên Tin A xếp TRÊN Tin B (< 0)
    expect(detailsA.priority).toBe(4);
    expect(detailsB.priority).toBe(3);
    expect(compareListingRank(tinA, tinB)).toBeLessThan(0);
  });

  test('TC-RANK-ORDER-002: VIP Vàng đăng 72h LUÔN xếp TRÊN VIP Bạc đăng 2h (Cấp gói 3 > 2)', () => {
    const tinA: RankedListingInput = {
      id: 1,
      title: 'Tin A - Vàng 72h',
      tier: 'GOLD',
      qualityScore: 10,
      publishedHoursAgo: 72,
    };
    const tinB: RankedListingInput = {
      id: 2,
      title: 'Tin B - Bạc 2h',
      tier: 'SILVER',
      qualityScore: 9,
      publishedHoursAgo: 2,
    };

    const scoreA = calculateFinalScore(tinA);
    const scoreB = calculateFinalScore(tinB);

    // Final score của Tin A (~1.78) thấp hơn Tin B (~15.0)
    expect(scoreA).toBeLessThan(scoreB);

    // Nhưng Tin A vẫn xếp TRÊN Tin B vì Priority 3 > 2
    expect(compareListingRank(tinA, tinB)).toBeLessThan(0);
  });

  test('TC-RANK-ORDER-003: Cùng hạng VIP Vàng, tin có Điểm chất lượng cao hơn xếp TRÊN', () => {
    const tinA: RankedListingInput = {
      id: 1,
      title: 'Tin A - Score 10/10',
      tier: 'GOLD',
      qualityScore: 10,
      publishedHoursAgo: 0,
    };
    const tinB: RankedListingInput = {
      id: 2,
      title: 'Tin B - Score 6/10',
      tier: 'GOLD',
      qualityScore: 6,
      publishedHoursAgo: 0,
    };

    const scoreA = calculateFinalScore(tinA);
    const scoreB = calculateFinalScore(tinB);

    expect(scoreA).toBe(30);
    expect(scoreB).toBe(18);
    expect(compareListingRank(tinA, tinB)).toBeLessThan(0);
  });

  test('TC-RANK-ORDER-004: Cùng hạng VIP Bạc, tin mới đăng xếp TRÊN tin đăng lâu (Time Decay)', () => {
    const tinA: RankedListingInput = {
      id: 1,
      title: 'Tin A - Vừa đăng 1h',
      tier: 'SILVER',
      qualityScore: 10,
      publishedHoursAgo: 1,
    };
    const tinB: RankedListingInput = {
      id: 2,
      title: 'Tin B - Đã đăng 48h',
      tier: 'SILVER',
      qualityScore: 10,
      publishedHoursAgo: 48,
    };

    const scoreA = calculateFinalScore(tinA);
    const scoreB = calculateFinalScore(tinB);

    expect(scoreA).toBeGreaterThan(scoreB);
    expect(compareListingRank(tinA, tinB)).toBeLessThan(0);
  });

  test('TC-RANK-ORDER-005: Tốc độ giảm điểm VIP Kim Cương (0.01) chậm hơn hẳn Tin Thường (0.08) sau 48h', () => {
    const tinKimCuong: RankedListingInput = {
      id: 1,
      title: 'Kim Cương 48h',
      tier: 'DIAMOND',
      qualityScore: 10,
      publishedHoursAgo: 48,
    };
    const tinThuong: RankedListingInput = {
      id: 2,
      title: 'Tin Thường 48h',
      tier: 'NORMAL',
      qualityScore: 10,
      publishedHoursAgo: 48,
    };

    const diamondTierDecay = calculateTierDecay(48, 'DIAMOND');
    const normalTierDecay = calculateTierDecay(48, 'NORMAL');

    // Sau 48h:
    // Kim Cương giữ lại ~61.9% điểm gói (e^-0.48)
    // Tin Thường chỉ giữ lại ~2.15% điểm gói (e^-3.84)
    expect(diamondTierDecay).toBeGreaterThan(0.6);
    expect(normalTierDecay).toBeLessThan(0.03);

    // Tỷ lệ phân rã chênh lệch hơn 28 lần
    const decayRatio = diamondTierDecay / normalTierDecay;
    expect(decayRatio).toBeGreaterThan(28);

    const diamondFinal = calculateFinalScore(tinKimCuong);
    const normalFinal = calculateFinalScore(tinThuong);

    // Điểm hiển thị cuối cùng của Kim Cương vượt trội so với Tin Thường
    expect(diamondFinal).toBeGreaterThan(10);
    expect(normalFinal).toBeLessThan(0.1);
  });

  test('TC-RANK-QUAL-001: Bổ sung giấy tờ pháp lý tăng Điểm chất lượng 6 -> 10, đẩy Tin A lên TRÊN Tin B', () => {
    const tinA_BanDau: RankedListingInput = {
      id: 1,
      title: 'Tin A - Thiếu giấy tờ pháp lý',
      tier: 'SILVER',
      qualityScore: 6,
      publishedHoursAgo: 0,
    };
    const tinB: RankedListingInput = {
      id: 2,
      title: 'Tin B - Đủ giấy tờ pháp lý',
      tier: 'SILVER',
      qualityScore: 8,
      publishedHoursAgo: 0,
    };

    // Ban đầu: Tin A (Score 6 -> Final 12) xếp DƯỚI Tin B (Score 8 -> Final 16)
    expect(compareListingRank(tinA_BanDau, tinB)).toBeGreaterThan(0);

    // Sau khi cập nhật bổ sung giấy tờ pháp lý: Điểm chất lượng tăng lên 10 (Final 20)
    const tinA_DaCapNhat: RankedListingInput = {
      ...tinA_BanDau,
      qualityScore: 10,
    };

    const scoreUpdatedA = calculateFinalScore(tinA_DaCapNhat);
    const scoreB = calculateFinalScore(tinB);

    expect(scoreUpdatedA).toBe(20);
    expect(scoreB).toBe(16);
    // Tin A vươn lên xếp TRÊN Tin B (< 0)
    expect(compareListingRank(tinA_DaCapNhat, tinB)).toBeLessThan(0);
  });
});
