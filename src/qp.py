import pandas as pd
import json
from src.gpml_parser import GpmlParser

class SimpleD3:
    def __init__(self, env):
        # for mock pathway
        self.data = json.load(open("qp_mock_data.json"))
        # self.data ={ "nodes": [[20, 20, "AT5G23350"],[120,150,"HAI2"],[150, 100,"AREB3"]], "links":[[[20, 20],[120,150]],[[120,150],[150, 100]]]}
        # self.data = df.to_json(orient="records")
        self.gene_attributes = json.load(open("data/test.json"))
        
        self.template = env.get_template("pathway_by_d3.html")
        self.dataset = pd.read_table("qp_mock_data.tsv")
        
    def show(self, width=400, height=400, marker_size=6):
        html = self.template.render({"DATASET": self.data,
                                     "ATTRS": sel.attributes,
                                     "WIDTH": width,
                                     "HEIGHT": height,
                                    "MARKER_SIZE": marker_size})

        return html
    
    
    def table(self, gid:str):
        """
        args:  ID to identify genes, etc.
        return: filtered
        """
        d = self.dataset
        if gid:
            d_filtered = d[d["Label"] == gid]
            return d_filtered
        else:
            return d
        
   
 
    
class GpmlD3Visualizer:
    def __init__(self, template, gpml):
        self.data = GpmlParser(gpml).data
        
        self.template = template
        self.dataset = pd.read_table("qp_mock_data.tsv")

    def show(self, width=800, height=400):
        html = self.template.render({"dataset": { "nodes": self.data["nodes"], 
                                                 "links": self.data["interactions"],
                                                   "shapes": self.data["shapes"],
                                                    "pathway": self.data["pathway"] },
                                     "width": width,
                                     "height": height})

        return html
    
    
    def table(self, gid:str):
        """
        args:  ID to identify genes, etc.
        return: filtered
        """
        d = self.dataset
        if gid:
            d_filtered = d[d["Label"] == gid]
            return d_filtered
        else:
            return d
        