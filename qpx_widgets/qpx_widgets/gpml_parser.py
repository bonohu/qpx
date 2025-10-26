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
            "shapes": [],
            "publications": []
        }

        def case_insensitive_get(element: ElementTree.Element, attrib: str) -> Union[str, None]:
            """
            XML要素のフィールドを大文字小文字を区別せずに取得する
            """
            for key in element.attrib:
                if key.lower() == attrib.lower():
                    return element.attrib[key]
            return None

        # Pathwayタグの属性を抽出
        pathway_attrs = ['Name', 'Organism', 'Version', 'Last-Modified', 'Author', 'Data-Source']
        for attr in pathway_attrs:
            parsed_data['pathway'][attr] = case_insensitive_get(root, attr)
        
        # Pathway descriptionの抽出
        comment_element = root.find('gpml:Comment[@Source="WikiPathways-description"]', namespace)
        if comment_element is not None:
            parsed_data['pathway']['Description'] = comment_element.text
        else:
            parsed_data['pathway']['Description'] = None

        # DataNodeタグからノード情報を抽出
        for node in root.findall('gpml:DataNode', namespace):
            graphics = node.find('gpml:Graphics', namespace)
            node_data = {}
            if graphics is not None:
                node_attributes = ["CenterX", "CenterY", "Width", "Height", "Color", "ShapeType", "FontName", "FontWeight", "FontStyle", "FontDecoration", "FontStrikethru", "FontSize"]
            for attr in node_attributes:
                node_data[attr] = case_insensitive_get(graphics, attr)
            float_attributes = ["CenterX", "CenterY", "Width", "Height"]
            for attr in float_attributes:
                if node_data[attr] is not None:
                    node_data[attr] = float(node_data[attr])

            if node_data["Color"] is None:
                node_data["Color"] = "000000"
            node_data["TextLabel"] = case_insensitive_get(node, "TextLabel")
                
            # xref情報の抽出. xrefをフィルターに利用するためにnodeのデータとして追加（2024/1/29oec）
            xref = node.find('gpml:Xref', namespace)
            xref_data = {}
            if xref is not None:
                xref_attributes = ["Database", "ID"]
                for attr in xref_attributes:
                    #xref_data [attr] = "test"
                    node_data[attr] = case_insensitive_get(xref, attr)       

            # Comment情報の抽出
            comments = []
            for comment_element in node.findall('gpml:Comment', namespace):
                comment_text = comment_element.text
                comment_source = case_insensitive_get(comment_element, 'Source')
                if comment_text:
                    comments.append({
                        'text': comment_text,
                        'source': comment_source
                    })
            if comments:
                node_data["Comments"] = comments
            
            node_data["GroupRef"] = case_insensitive_get(node, "GroupRef")
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
                interaction_attributes = ["LineStyle", "ConnectorType", "Color"]
                for attr in interaction_attributes:
                    interaction_data['Graphics'][attr] = case_insensitive_get(graphics, attr)

                for point in graphics.findall('gpml:Point', namespace):
                    point_attributes = ["GraphId", "X", "Y", "RelX", "RelY", "ArrowHead"]
                    point_data = {attr: case_insensitive_get(point, attr) for attr in point_attributes}
                    float_attributes = ["X", "Y", "RelX", "RelY"]
                    for attr in float_attributes:
                        if point_data[attr] is not None:
                            point_data[attr] = float(point_data[attr])
                    interaction_data['points'].append(point_data)

                # Anchor要素からアンカー情報を抽出
                for anchor in graphics.findall('gpml:Anchor', namespace):
                    anchor_data = {'GraphId': case_insensitive_get(anchor, 'GraphId')}
                    parsed_data['anchors'].append(anchor_data)

            parsed_data['interactions'].append(interaction_data)

        # Groupタグからグループ情報を抽出
        for group in root.findall('gpml:Group', namespace):
            group_data = {'GroupId': case_insensitive_get(group, 'GroupId'),
                          'Style': case_insensitive_get(group, 'Style'),
                          }
            parsed_data['groups'].append(group_data)

        for shape in root.findall('gpml:Shape', namespace):
            graphics = shape.find('gpml:Graphics', namespace)
            if graphics is not None:
                shape_attributes = ["CenterX", "CenterY", "Width", "Height", "Rotation", "ShapeType", "Color"]
                shape_data = {attr: case_insensitive_get(graphics, attr) for attr in shape_attributes}
                float_attributes = ["CenterX", "CenterY", "Width", "Height", "Rotation"]
                for attr in float_attributes:
                    if shape_data[attr] is not None:
                        shape_data[attr] = float(shape_data[attr])
                
                # Comment情報の抽出
                comments = []
                for comment_element in shape.findall('gpml:Comment', namespace):
                    comment_text = comment_element.text
                    comment_source = case_insensitive_get(comment_element, 'Source')
                    if comment_text:
                        comments.append({
                            'text': comment_text,
                            'source': comment_source
                        })
                if comments:
                    shape_data["Comments"] = comments
                
                parsed_data['shapes'].append(shape_data)

        # Biopax情報からPublication情報を抽出
        # 名前空間を定義
        biopax_namespace = {
            'bp': 'http://www.biopax.org/release/biopax-level3.owl#',
            'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
        }
        
        # Biopaxセクションを探す
        biopax = root.find('gpml:Biopax', namespace)
        if biopax is not None:
            # PublicationXref要素を全て探す
            pub_xrefs = biopax.findall('bp:PublicationXref', biopax_namespace)
            
            for pub_xref in pub_xrefs:
                pub_data = {}
                
                # rdf:id属性を取得
                pub_data['id'] = pub_xref.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}id', '')
                
                # ID (PubMed IDなど)を取得
                id_element = pub_xref.find('bp:ID', biopax_namespace)
                pub_data['pubmed_id'] = id_element.text if id_element is not None and id_element.text != 'NA' else None
                
                # DB (データベース名)を取得
                db_element = pub_xref.find('bp:DB', biopax_namespace)
                pub_data['database'] = db_element.text if db_element is not None else None
                
                # TITLE (タイトル)を取得
                title_element = pub_xref.find('bp:TITLE', biopax_namespace)
                pub_data['title'] = title_element.text if title_element is not None else None
                
                # SOURCE (出典)を取得
                source_element = pub_xref.find('bp:SOURCE', biopax_namespace)
                pub_data['source'] = source_element.text if source_element is not None else None
                
                # YEAR (年)を取得
                year_element = pub_xref.find('bp:YEAR', biopax_namespace)
                pub_data['year'] = year_element.text if year_element is not None else None
                
                # AUTHORS (著者リスト)を取得
                authors = []
                author_elements = pub_xref.findall('bp:AUTHORS', biopax_namespace)
                for author_element in author_elements:
                    if author_element.text:
                        authors.append(author_element.text.strip())
                pub_data['authors'] = authors
                
                # タイトルまたは著者が存在する場合のみ追加
                if pub_data.get('title') or pub_data.get('authors'):
                    parsed_data['publications'].append(pub_data)

        self.data = parsed_data


