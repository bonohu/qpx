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
            "groups": [],
            "shapes": []
        }

        # Pathwayタグの属性を抽出
        pathway_attrs = ['Name', 'Organism', 'Version', 'Last-Modified']
        for attr in pathway_attrs:
            parsed_data['pathway'][attr] = root.attrib.get(attr)

        # DataNodeタグからノード情報を抽出
        for node in root.findall('gpml:DataNode', namespace):
            graphics = node.find('gpml:Graphics', namespace)
            node_data = {}
            if graphics is not None:
                node_attributes = ["CenterX", "CenterY", "Width", "Height", "Color", "ShapeType"]
                for attr in node_attributes:
                    node_data[attr] = graphics.get(attr)
                float_attributes = ["CenterX", "CenterY", "Width", "Height"]
                for attr in float_attributes:
                    if node_data[attr] is not None:
                        node_data[attr] = float(node_data[attr])

                if node_data["Color"] is None:
                    node_data["Color"] = "000000"
                node_data["TextLabel"] = node.get("TextLabel")
            node_data["GroupRef"] = node.get("GroupRef")
            parsed_data['nodes'].append(node_data)
            

        # Interactionタグからインタラクション情報を抽出
        for interaction in root.findall('gpml:Interaction', namespace):
            interaction_data = {
                'Graphics': {
                    'LineStyle': 'solid'  # デフォルトの線のスタイルを実線とする
                },
                'points': []
            }

            graphics = interaction.find('gpml:Graphics', namespace)
            if graphics is not None:
                interaction_attributes = ["LineStyle"]
                for attr in interaction_attributes:
                    interaction_data['Graphics'][attr] = graphics.get(attr)

                for point in graphics.findall('gpml:Point', namespace):
                    point_attributes = ["GraphId", "X", "Y", "RelX", "RelY", "ArrowHead"]
                    point_data = {attr: point.get(attr) for attr in point_attributes}
                    float_attributes = ["X", "Y", "RelX", "RelY"]
                    for attr in float_attributes:
                        if point_data[attr] is not None:
                            point_data[attr] = float(point_data[attr])
                    interaction_data['points'].append(point_data)

                # Anchor要素からアンカー情報を抽出
                for anchor in graphics.findall('gpml:Anchor', namespace):
                    anchor_data = {'GraphId': anchor.get('GraphId')}
                    parsed_data['anchors'].append(anchor_data)

            parsed_data['interactions'].append(interaction_data)

        # Groupタグからグループ情報を抽出
        for group in root.findall('gpml:Group', namespace):
            group_data = {'GroupId': group.get('GroupId')}
            parsed_data['groups'].append(group_data)

        for shape in root.findall('gpml:Shape', namespace):
            graphics = shape.find('gpml:Graphics', namespace)
            if graphics is not None:
                shape_attributes = ["CenterX", "CenterY", "Width", "Height", "Rotation", "ShapeType", "Color"]
                shape_data = {attr: graphics.get(attr) for attr in shape_attributes}
                float_attributes = ["CenterX", "CenterY", "Width", "Height", "Rotation"]
                for attr in float_attributes:
                    if shape_data[attr] is not None:
                        shape_data[attr] = float(shape_data[attr])
                parsed_data['shapes'].append(shape_data)

        self.data = parsed_data

