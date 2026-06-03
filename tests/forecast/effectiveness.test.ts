import { describe, it, expect } from 'vitest';

import { computeEffectiveness } from '../../app/lib/forecast/effectiveness';

describe('computeEffectiveness', () => {
  it('returns Hl lift, margin lift, margin delta, and ROI proxy for the textbook case', () => {
    const r = computeEffectiveness({
      retailer: 'Retailer 1',
      skuDescr: 'Estrella 4x440ml Can',
      actualHl: 120,
      baselineHl: 100,
      actualMargin: 35,
      baselineMargin: 40,
      mktgFund: 4,
    });
    expect(r.observedHlLift).toBeCloseTo(0.2, 3);
    expect(r.observedMarginLift).toBeCloseTo(-0.125, 4);
    expect(r.marginDelta).toBeCloseTo(-5, 6);
    // ROI proxy = (margin gained − marketing spend) / |marketing spend|
    expect(r.roiProxy).toBeCloseTo((-5 - 4) / 4, 3);
  });

  it('surfaces a positive margin lift as positive ROI', () => {
    const r = computeEffectiveness({
      retailer: 'Retailer 2',
      skuDescr: 'Daura 4x330ml (Can)',
      actualHl: 110,
      baselineHl: 100,
      actualMargin: 50,
      baselineMargin: 40,
      mktgFund: 2,
    });
    expect(r.observedMarginLift).toBeCloseTo(0.25, 3);
    expect(r.roiProxy).toBeCloseTo((10 - 2) / 2, 3);
  });

  it('returns NaN — not 0 — when baselineHl is non-positive, so UI can render "—"', () => {
    const zero = computeEffectiveness({
      retailer: 'R',
      skuDescr: 'S',
      actualHl: 50,
      baselineHl: 0,
      actualMargin: 10,
      baselineMargin: 20,
      mktgFund: 1,
    });
    expect(Number.isNaN(zero.observedHlLift)).toBe(true);

    const negative = computeEffectiveness({
      retailer: 'R',
      skuDescr: 'S',
      actualHl: 50,
      baselineHl: -10,
      actualMargin: 10,
      baselineMargin: 20,
      mktgFund: 1,
    });
    expect(Number.isNaN(negative.observedHlLift)).toBe(true);
  });

  it('returns NaN observedMarginLift when baselineMargin is non-positive', () => {
    const r = computeEffectiveness({
      retailer: 'R',
      skuDescr: 'S',
      actualHl: 100,
      baselineHl: 80,
      actualMargin: 20,
      baselineMargin: 0,
      mktgFund: 1,
    });
    expect(Number.isNaN(r.observedMarginLift)).toBe(true);
    // marginDelta is still meaningful even when the ratio isn't
    expect(r.marginDelta).toBe(20);
  });

  it('returns NaN roiProxy when mktgFund is zero (no spend → ROI undefined)', () => {
    const r = computeEffectiveness({
      retailer: 'R',
      skuDescr: 'S',
      actualHl: 100,
      baselineHl: 80,
      actualMargin: 30,
      baselineMargin: 20,
      mktgFund: 0,
    });
    expect(Number.isNaN(r.roiProxy)).toBe(true);
    // Lift signals are independent of the marketing fund and stay finite
    expect(r.observedHlLift).toBeCloseTo(0.25, 3);
    expect(r.observedMarginLift).toBeCloseTo(0.5, 3);
  });

  it('passes retailer, skuDescr, mktgFund through unchanged', () => {
    const r = computeEffectiveness({
      retailer: 'Retailer 3',
      skuDescr: 'Victoria Malaga 660ml NRB',
      actualHl: 100,
      baselineHl: 100,
      actualMargin: 20,
      baselineMargin: 20,
      mktgFund: 7.5,
    });
    expect(r.retailer).toBe('Retailer 3');
    expect(r.skuDescr).toBe('Victoria Malaga 660ml NRB');
    expect(r.mktgFund).toBe(7.5);
  });
});
