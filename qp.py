import pandas as pd


class SimpleD3:
    def __init__(self, env):
        # for mock pathway
        self.data ={ "nodes": [[20, 20, "AT5G23350"],[120,150,"HAI2"],[150, 100,"AREB3"]], "links":[[[20, 20],[120,150]],[[120,150],[150, 100]]]}
        # self.data = df.to_json(orient="records")
        
        self.template = env.get_template("test_d3.html")
        self.dataset = pd.read_table("qp_mock_data.tsv")
        
    def show(self, width=400, height=400, marker_size=6):
        html = self.template.render({"DATASET": self.data,
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
        
   
 
    
