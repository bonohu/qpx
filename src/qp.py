
import glob
import json
import os
import pandas as pd
from IPython.display import display, HTML, clear_output
from traitlets import Unicode, Bool, validate, TraitError
from ipywidgets import DOMWidget, register, interact, interactive, widgets
from src.gpml_parser import GpmlParser
 
    


@register
class GpmlD3VisualizerWidget(DOMWidget):
    _view_name = Unicode('PathwayD3View').tag(sync=True)
    _view_module = Unicode('pathway_d3_view_widget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    value = Unicode('', help="").tag(sync=True)
    width = Unicode('', help="").tag(sync=True)
    pathway_data = Unicode('', help="").tag(sync=True)
    
    def __init__(self, gpml):
        super().__init__()
        self.pathway_data = json.dumps(GpmlParser(gpml).data)



class GpmlD3Visualizer:
    def __init__(self, gpml_dir_path, gene_data_path):
        self.gpml_dir_path = gpml_dir_path
        self.gene_data = pd.read_table(gene_data_path)
        self.visualizer = None
        self.selected_gpml_file = None
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.d3_pathway_html = open(os.path.join(current_dir, './templates/pathway_by_d3.html'), 'r').read()
    

    def show(self):
        gpml_files = glob.glob("{}/*.gpml".format(self.gpml_dir_path))
        gpml_files = [os.path.basename(gpml_file) for gpml_file in gpml_files]

        if len(gpml_files) > 0:
            self.selected_gpml_file = gpml_files[0]

        dropdown = widgets.Dropdown(
            options=gpml_files,
            value=self.selected_gpml_file,
            style={'width': 'max-content'},
        )

        self.visualizer_widget = GpmlD3VisualizerWidget(gpml=os.path.join(self.gpml_dir_path, self.selected_gpml_file))

        self.widgets = widgets.Box(
            [
                widgets.Label(value='Select GPML file:'), 
                dropdown,
                self.visualizer_widget
            ]       
        )

        def visualize_gpml(gpml_file):
            self.visualizer_widget = GpmlD3VisualizerWidget(gpml=os.path.join(self.gpml_dir_path, gpml_file))
            clear_output(wait=True)
            self.widgets = widgets.Box(
                [
                    widgets.Label(value='Select GPML file:'), 
                    dropdown,
                    self.visualizer_widget
                ]       
            )
            display(HTML(self.d3_pathway_html))
            display(self.widgets)

        def on_change(change):
            if change['type'] == 'change' and change['name'] == 'value':
                self.selected_gpml_file = change['new']
                visualize_gpml(self.selected_gpml_file)

        dropdown.observe(on_change)

        display(HTML(self.d3_pathway_html))
        return display(self.widgets)

    
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
