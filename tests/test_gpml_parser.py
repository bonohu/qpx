import unittest
from src.gpml_parser import GpmlParser

class GpmlParserTests(unittest.TestCase):
    def test_parse_gpml_file(self):
        gpml_file = "tests/data/WP459.gpml"
        parser = GpmlParser(gpml_file)
        
        self.assertEqual(parser.gpml, gpml_file)
        self.assertIsNotNone(parser.data)
        self.assertIsInstance(parser.data, dict)
        self.assertIn("pathway", parser.data)
        self.assertIn("nodes", parser.data)
        self.assertIn("interactions", parser.data)
        self.assertIn("anchors", parser.data)
        self.assertIn("groups", parser.data)
        

if __name__ == "__main__":
    unittest.main()