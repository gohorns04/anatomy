import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from zanat_rules import LAYERS, split_suffix, role, layer_for, group_for  # noqa: E402


class SplitSuffix(unittest.TestCase):
    def test_side_suffix(self):
        self.assertEqual(split_suffix('Median nerve.l'), ('Median nerve', 'l'))

    def test_no_suffix(self):
        self.assertEqual(split_suffix('Abdominal aorta'), ('Abdominal aorta', ''))

    def test_parenthesized(self):
        self.assertEqual(split_suffix('(Adductor minimus).r'), ('Adductor minimus', 'r'))

    def test_leading_space(self):
        self.assertEqual(split_suffix(' Posterior transverse collateral sulcus.l'),
                         ('Posterior transverse collateral sulcus', 'l'))

    def test_two_letter_suffix(self):
        self.assertEqual(split_suffix('Long head of biceps brachii.ol'), ('Long head of biceps brachii', 'ol'))


class Role(unittest.TestCase):
    def test_roles(self):
        self.assertEqual(role('Biceps brachii muscle.j', 'MESH'), 'skip')
        self.assertEqual(role('Long head of biceps brachii.ol', 'MESH'), 'origin')
        self.assertEqual(role('Biceps brachii muscle.er', 'MESH'), 'insertion')
        self.assertEqual(role('Median nerve.l', 'CURVE'), 'display')
        self.assertEqual(role('Abdominal aorta', 'CURVE'), 'display')
        self.assertEqual(role('Aorta.g', 'FONT'), 'skip')
        self.assertEqual(role('Femur.i', 'MESH'), 'skip')
        self.assertEqual(role('Camera', 'CAMERA'), 'skip')

    def test_membranes_that_cover_muscles_are_skipped(self):
        for n in ['Fascia lata.l', 'Investing abdominal fascia', 'Subdeltoid bursa.r', 'Tendon sheath of tibialis anterior.l',
                  'Synovial sheaths of digits of hand.l', 'Lateral intermuscular septum of arm.r', 'Anterior layer of thoracolumbar fascia.l']:
            self.assertEqual(role(n, 'MESH'), 'skip', n)
        for n in ['Iliotibial tract.l', 'Calcaneal tendon.r', 'Tensor fasciae latae.l', 'Palmar aponeurosis.l']:
            self.assertEqual(role(n, 'MESH'), 'display', n)

    def test_membranes_and_lymph_nodes_that_hide_organs_are_skipped(self):
        for n in ['Pleura', 'Greater omentum', 'Lesser omentum', 'Mesocolon', 'Meso-appendix',
                  'Intercostal nodes.l', 'Jugulodigastric node.r', 'Intrapulmonary nodes']:
            self.assertEqual(role(n, 'MESH'), 'skip', n)
        for n in ['Spleen', 'Palatine tonsil.l', 'Liver', 'Stomach']:
            self.assertEqual(role(n, 'MESH'), 'display', n)

    def test_liver_segments_overlap_whole_liver(self):
        self.assertEqual(role('Anterior lateral segment of liver (VI)', 'MESH'), 'skip')
        self.assertEqual(role('Posterior segment of liver (I)', 'MESH'), 'skip')
        self.assertEqual(role('Liver', 'MESH'), 'display')


class LayerFor(unittest.TestCase):
    def test_layers(self):
        self.assertEqual(LAYERS, ['skin', 'muscle', 'bone', 'organ', 'vessel', 'nerve'])
        self.assertEqual(layer_for(['4: Muscular system', 'Muscles of upper limb']), 'muscle')
        self.assertEqual(layer_for(['5: Cardiovascular system', 'Heart']), 'organ')
        self.assertEqual(layer_for(['5: Cardiovascular system', 'Systemic arteries']), 'vessel')
        self.assertEqual(layer_for(['3: Joints']), 'bone')
        self.assertEqual(layer_for(['1: Skeletal system']), 'bone')
        self.assertEqual(layer_for(['6: Lymphoid organs']), 'organ')
        self.assertEqual(layer_for(['7: Nervous system & Sense organs']), 'nerve')
        self.assertIsNone(layer_for(['2: Muscular insertions']))
        self.assertIsNone(layer_for(['Bonus collection']))

    def test_first_layer_in_order_wins(self):
        self.assertEqual(layer_for(['7: Nervous system & Sense organs', '4: Muscular system']), 'muscle')


class GroupFor(unittest.TestCase):
    def test_most_specific_non_side_group(self):
        cols = ['4: Muscular system', 'Muscles of upper limb', 'Anterior compartment of arm', 'Right upper limb']
        sizes = {'Muscles of upper limb': 122, 'Anterior compartment of arm': 9, 'Right upper limb': 300}
        self.assertEqual(group_for(cols, sizes), 'Anterior compartment of arm')

    def test_left_right_groups_ignored(self):
        cols = ['4: Muscular system', 'Left upper limb', 'Muscles']
        sizes = {'Left upper limb': 5, 'Muscles': 500}
        self.assertEqual(group_for(cols, sizes), 'Muscles')

    def test_scene_collection_and_nerve_groups_are_not_used_for_non_nerve_layers(self):
        cols = ['4: Muscular system', 'Scene Collection', 'Trigeminal nerve (V)', 'Muscles of head']
        sizes = {'Scene Collection': 1, 'Trigeminal nerve (V)': 20, 'Muscles of head': 90}
        self.assertEqual(group_for(cols, sizes), 'Muscles of head')
        self.assertEqual(group_for(['7: Nervous system & Sense organs', 'Scene Collection'], {'Scene Collection': 1}),
                         'Nervous system & Sense organs')

    def test_falls_back_to_top_level_name(self):
        self.assertEqual(group_for(['5: Cardiovascular system'], {}), 'Cardiovascular system')


if __name__ == '__main__':
    unittest.main()
