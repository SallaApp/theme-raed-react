import { describe, it, expect } from 'vitest';
import { nearestSlide } from '../../app/hooks/useLoopCarousel';

describe('nearestSlide', () => {
  it('finds the slide nearest the centre in LTR', () => {
    expect(nearestSlide(0, 0, 100, 9)).toBe(0);
    expect(nearestSlide(340, 0, 100, 9)).toBe(3);
    expect(nearestSlide(360, 0, 100, 9)).toBe(4);
  });

  it('finds it in RTL, where the row scrolls towards negative scrollLeft', () => {
    expect(nearestSlide(-340, 0, -100, 9)).toBe(3);
    expect(nearestSlide(-3522, 330, -1284, 9)).toBe(3);
  });

  it('stays inside the row, and is 0 when there is no next slide to measure from', () => {
    expect(nearestSlide(-100, 0, 100, 9)).toBe(0);
    expect(nearestSlide(5000, 0, 100, 9)).toBe(8);
    expect(nearestSlide(50, 0, 0, 1)).toBe(0);
  });
});
