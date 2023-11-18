import xml.etree.ElementTree as ElementTree
from typing import Dict, List, Union


class GpmlParser:
    def __init__(self, gpml: str):
        self.gpml = gpml
        self.data = {}
        self._parse()
        
    def _parse(self):
        # open file if gpml is a path
        if self.gpml.endswith(".gpml"):
            with open(self.gpml) as f:
                gpml_data = f.read()
        else:
            gpml_data = self.gpml

        # XMLの名前空間を設定
        namespace = {'gpml': 'http://pathvisio.org/GPML/2013a'}

        # XMLデータのルート要素を取得
        root = ElementTree.fromstring(gpml_data)

        # スキーマに従ってデータを格納する辞書を作成
        parsed_data = {
            "pathway": {},
            "nodes": [],
            "interactions": [],
            "anchors": [],
            "groups": []
        }

        # Pathwayタグの属性を抽出
        pathway_attrs = ['Name', 'Organism', 'Version']
        for attr in pathway_attrs:
            parsed_data['pathway'][attr] = root.attrib.get(attr)

        # DataNodeタグからノード情報を抽出
        for node in root.findall('gpml:DataNode', namespace):
            graphics = node.find('gpml:Graphics', namespace)
            if graphics is not None:
                node_data = {
                    'CenterX': graphics.get('CenterX'),
                    'CenterY': graphics.get('CenterY'),
                    'Width': graphics.get('Width'),
                    'Height': graphics.get('Height'),
                    'Color': graphics.get('Color', '000000')  # デフォルトの色を黒とする
                }
                parsed_data['nodes'].append(node_data)

        # Interactionタグからインタラクション情報を抽出
        for interaction in root.findall('gpml:Interaction', namespace):
            interaction_data = {
                'Graphics': {
                    'LineStyle': 'solid'  # デフォルトの線のスタイルを実線とする
                },
                'points': []
            }

            for point in interaction.findall('gpml:Graphics/gpml:Point', namespace):
                point_data = {
                    'GraphId': point.get('GraphId'),
                    'X': point.get('X'),
                    'Y': point.get('Y'),
                    'RelX': point.get('RelX'),
                    'RelY': point.get('RelY'),
                    'ArrowHead': point.get('ArrowHead')
                }
                interaction_data['points'].append(point_data)

            # Anchor要素からアンカー情報を抽出
            for anchor in interaction.findall('gpml:Graphics/gpml:Anchor', namespace):
                anchor_data = {'GraphId': anchor.get('GraphId')}
                parsed_data['anchors'].append(anchor_data)

            parsed_data['interactions'].append(interaction_data)

        # Groupタグからグループ情報を抽出
        for group in root.findall('gpml:Group', namespace):
            group_data = {'GroupId': group.get('GraphId')}
            parsed_data['groups'].append(group_data)

        self.data = parsed_data


