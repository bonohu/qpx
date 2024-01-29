
import glob
import json
import os
import pandas as pd
from IPython.display import display, HTML, clear_output
from traitlets import Unicode, Bool, validate, TraitError
from ipywidgets import DOMWidget, register, interact, interactive, widgets
from src.gpml_parser import GpmlParser
 
    


@register
class PathwayD3VisualizerWidget(DOMWidget):
    _view_name = Unicode('PathwayD3View').tag(sync=True)
    _view_module = Unicode('pathway_d3_view_widget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    value = Unicode('', help="").tag(sync=True)
    pathway_data = Unicode('', help="").tag(sync=True)
    
    def __init__(self, pathway_data):
        super().__init__()
        self.pathway_data = pathway_data



class GpmlD3Visualizer:
    def __init__(self, gene_data_path, gpml_dir_path="./gpml"):
        self.gpml_dir_path = gpml_dir_path
        self.gene_data = pd.read_table(gene_data_path)
        self.selected_gene_data = self.gene_data
        self.visualizer = None
        self.selected_gpml_file = None
    

    def show(self):
        gpml_files = glob.glob("{}/*.gpml".format(self.gpml_dir_path))
        gpml_files = [os.path.basename(gpml_file) for gpml_file in gpml_files]

        if len(gpml_files) > 0:
            self.selected_gpml_file = gpml_files[0]

        dropdown = widgets.Dropdown(
            options=gpml_files,
            value=self.selected_gpml_file,
        )

        def display_gene_data(gid:str):
            d = self.gene_data
            if gid:
                # データテーブルでフィルターしたい属性を指定
                #d = d[d["Label"] == gid]
                d = d[d["Enzyme"] == gid]
                print("Gene data for {}:".format(gid))
            else:
                print("Gene data:")
            self.selected_gene_data = d
            display(d)

        def visualize(gpml_file:str):
            self.visualizer_widget.pathway_data = json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, gpml_file)).data)
            display(self.visualizer_widget)

        self.visualizer_widget = PathwayD3VisualizerWidget(pathway_data=json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, self.selected_gpml_file)).data))
        self.interactive_visualizer = widgets.interactive_output(visualize, {'gpml_file': dropdown})
        self.dataframe_widget = widgets.interactive_output(display_gene_data, {'gid': self.visualizer_widget})

        self.widgets = widgets.VBox( 
            [
                widgets.HBox([widgets.Label(value='Select GPML file:'), 
                    dropdown]),
                self.interactive_visualizer,      
                self.dataframe_widget      
            ]
        )

        return display(self.widgets)