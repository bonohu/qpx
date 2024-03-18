
import glob
import json
import os
import polars as pl
import pandas as pd
from IPython.display import display, HTML, clear_output
from traitlets import Unicode, Bool, validate, TraitError
from ipywidgets import DOMWidget, register, interact, interactive, widgets
from src.gpml_parser import GpmlParser
from itables import show, JavascriptFunction

    


@register
class PathwayD3VisualizerWidget(DOMWidget):
    _view_name = Unicode('PathwayD3View').tag(sync=True)
    _view_module = Unicode('pathway_d3_view_widget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    value = Unicode('', help="").tag(sync=True)
    pathway_data = Unicode('', help="").tag(sync=True)
    
    def __init__(self, pathway_data, value):
        super().__init__()
        self.pathway_data = pathway_data
        self.value = value



class GpmlD3Visualizer:
    def __init__(self, gene_data_path, filter_key="xref_id", gpml_dir_path="./gpml"):
        self.gpml_dir_path = gpml_dir_path
        self.gene_data = pl.read_csv(gene_data_path, separator='\t')
        self.selected_gene_data = self.gene_data
        self.filter_key = filter_key
        self.visualizer = None
        self.selected_gpml_file = None
        self.gid = None
    

    def show(self):
        gpml_files = glob.glob("{}/*.gpml".format(self.gpml_dir_path))
        gpml_files = [os.path.basename(gpml_file) for gpml_file in gpml_files]

        if len(gpml_files) > 0:
            self.selected_gpml_file = gpml_files[0]

        dropdown = widgets.Dropdown(
            options=gpml_files,
            value=self.selected_gpml_file,
        )

        def visualize(gpml_file:str):
            self.visualizer_widget.pathway_data = json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, gpml_file)).data)
            display(self.visualizer_widget)


        # interactive_output使用時、itablesが描画直後だけ表示されない問題があるため、タイマーをかけてすぐに再描画するようにする
        initial_dummy_value = "　"
        self.visualizer_widget = PathwayD3VisualizerWidget(pathway_data=json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, self.selected_gpml_file)).data), value=initial_dummy_value)
        from threading import Timer
        def redraw():
            self.visualizer_widget.value = ""
        timer = Timer(0.2, redraw, ())
        timer.start()

        self.interactive_visualizer = widgets.interactive_output(visualize, {'gpml_file': dropdown})

        def display_gene_data(gid:str):
            d = self.gene_data
            self.gid = gid
            # xref_idでフィルターするように変更（2024/1/29oec）
            if gid:
                # データテーブルでフィルターしたい属性を指定
                d = d.filter(pl.col(self.filter_key).cast(pl.datatypes.Utf8) == str(gid))
                if d.shape[0] == 0:
                    print("No data found for Xref ID {}".format(gid))
                    return
                print("Xref ID {}:".format(gid))
            else:
                print("Gene data:")
            self.selected_gene_data = d

            show(self.selected_gene_data, classes="display compact", 
                 columnDefs=[{"targets": "_all",                              
                            "render": JavascriptFunction("""
                                function (data, type, full, meta) {
                                    return `<span title=${data}>${data}</span`;
                                },
                                """)}])

        dataframe_output = widgets.interactive_output(display_gene_data, {"gid": self.visualizer_widget})
        
        self.widgets = widgets.VBox( 
            [
                widgets.HBox([widgets.Label(value='Select GPML file:'), 
                    dropdown]),
                self.interactive_visualizer,      
                dataframe_output      
            ]
        )

        css = """
        .dataTable th, .dataTable td{
            max-width: 150px;
        }
        """
        display(HTML(f"<style>{css}</style>"))

        display(self.widgets)