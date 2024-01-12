
import glob
import json
import os
import pandas as pd
from IPython.display import display, HTML, clear_output
from ipywidgets import widgets
from src.gpml_parser import GpmlParser
from jinja2 import Environment, FileSystemLoader
 
    
class GpmlD3Visualizer:
    def __init__(self, gpml):
        self.pathway_data = GpmlParser(gpml).data
        self.template = Environment(loader=FileSystemLoader("templates", encoding='utf-8')).get_template('pathway_by_d3.html')

    def show(self, width=800, height=1000):
        html = self.template.render({"pathway_data": { "nodes": self.pathway_data["nodes"], 
                                                 "links": self.pathway_data["interactions"],
                                                   "shapes": self.pathway_data["shapes"],
                                                   "groups": self.pathway_data["groups"],
                                                    "pathway": self.pathway_data["pathway"] },
                                     "width": width,
                                     "height": height,
                                     })

        return html
    
        

class GpmlD3VisualizerWidget:
    def __init__(self, gpml_dir_path, gene_data_path):
        self.gpml_dir_path = gpml_dir_path
        self.gene_data = pd.read_table(gene_data_path)
        self.visualizer = None
        self.selected_gpml_file = None


    def show(self):
        def get_gpml_files():
            gpml_files = glob.glob("{}/*.gpml".format(self.gpml_dir_path))
            gpml_files = [os.path.basename(gpml_file) for gpml_file in gpml_files]
            return gpml_files

        dropdown = widgets.Dropdown(
            options=get_gpml_files(),
            value=self.selected_gpml_file,
            style={'width': 'max-content'},
        )

        w = widgets.Box(
            [
                widgets.Label(value='Select GPML file:'), 
                dropdown
            ]       
        )

        def on_change(change):
            if change['type'] == 'change' and change['name'] == 'value':
                self.selected_gpml_file = change['new']
                self.visualizer = GpmlD3Visualizer(gpml=os.path.join(self.gpml_dir_path, self.selected_gpml_file))
                clear_output(wait=True)
                display(w)
                display(HTML(self.visualizer.show()))

        dropdown.observe(on_change)

        return display(w)

    
    def table(self, gid:str):
        """
        args:  ID to identify genes, etc.
        return: filtered
        """
        d = self.gene_data
        if gid:
            d_filtered = d[d["Label"] == gid]
            return d_filtered
        else:
            return d