import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from align import fit_bbox, apply  # noqa: E402

IDENTITY = ((0, 1), (1, 1), (2, 1))


class FitBbox(unittest.TestCase):
    def test_identity_axes_scale_and_offset(self):
        scale, offset = fit_bbox((0, 0, 0), (10, 20, 30), (5, 5, 5), (6, 7, 8), IDENTITY)
        self.assertAlmostEqual(scale, 0.1)
        for got, want in zip(apply((10, 20, 30), scale, offset, IDENTITY), (6, 7, 8)):
            self.assertAlmostEqual(got, want, places=9)
        for got, want in zip(apply((0, 0, 0), scale, offset, IDENTITY), (5, 5, 5)):
            self.assertAlmostEqual(got, want, places=9)

    def test_axis_swap_maps_center_to_center(self):
        # 대상 x ← 원본 x, 대상 y ← 원본 z, 대상 z ← -원본 y
        axis_map = ((0, 1), (2, 1), (1, -1))
        src_min, src_max = (0, 0, 0), (100, 200, 300)
        dst_min, dst_max = (-1, -3, -2), (1, 3, 2)
        scale, offset = fit_bbox(src_min, src_max, dst_min, dst_max, axis_map)
        center = apply((50, 100, 150), scale, offset, axis_map)
        for got in center:
            self.assertAlmostEqual(got, 0.0, places=9)
        self.assertAlmostEqual(scale, 0.02)


    def test_scale_from_selected_axes_only(self):
        # 키(z) 비율은 무시하고 좌우·앞뒤 비율(0.5)로만 크기를 정한다
        scale, offset = fit_bbox((0, 0, 0), (10, 10, 10), (0, 0, 0), (5, 5, 20), IDENTITY, scale_axes=(0, 1))
        self.assertAlmostEqual(scale, 0.5)
        center = apply((5, 5, 5), scale, offset, IDENTITY)
        self.assertAlmostEqual(center[2], 10)


if __name__ == '__main__':
    unittest.main()
