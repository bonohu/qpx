
import glob
import json
import os
import polars as pl
import pandas as pd
import traitlets
from typing import List
from IPython.display import HTML, clear_output, display
from traitlets import Unicode, Bool, validate, TraitError
from ipywidgets import DOMWidget, register, interact, interactive, widgets
from src.gpml_parser import GpmlParser
from itables import show, JavascriptFunction


@register
class PathwayD3VisualizerWidget(DOMWidget):
    _view_name = Unicode('PathwayD3View').tag(sync=True)
    _view_module = Unicode('pathway_d3_view_widget').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)

    value = traitlets.List([], help="").tag(sync=True)
    pathway_data = Unicode('', help="").tag(sync=True)
    
    def __init__(self, pathway_data, dummy_value):
        super().__init__()
        self.pathway_data = pathway_data
        self.selected_gene_ids = dummy_value

    @property
    def selected_gene_ids(self):
        return self.value

    @selected_gene_ids.setter
    def selected_gene_ids(self, value):
        self.value = value


class GpmlD3Visualizer:
    def __init__(self, gene_data_path, expression_data_path, filter_key="xref_id", gpml_dir_path="./gpml"):
        self.gpml_dir_path = gpml_dir_path
        self.gene_data = pl.read_csv(gene_data_path, separator='\t')
        self.expression_data = pd.read_csv(expression_data_path, sep='\t')
        self.selected_gene_data = self.gene_data
        self.filter_key = filter_key
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

        def visualize(gpml_file:str):
            self.visualizer_widget.pathway_data = json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, gpml_file)).data)
            display(self.visualizer_widget)
            # if len(self.visualizer_widget.selected_gene_ids) > 0:
            # self.visualizer_widget.selected_gene_ids = []



        # interactive_output使用時、itablesが描画直後だけ表示されない問題があるため、タイマーをかけてすぐに再描画するようにする FIXME
        self.visualizer_widget = PathwayD3VisualizerWidget(pathway_data=json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, self.selected_gpml_file)).data), dummy_value=[''])
        from threading import Timer
        def redraw():
            self.visualizer_widget.selected_gene_ids = [] # dummy_valueとは別の値を設定することで再描画を行う
        timer = Timer(1, redraw, ()) # タイムアウトが短すぎると、なぜか発現量テーブルが描画されないことがある（描画タイミングが衝突する？）
        timer.start()

        self.interactive_visualizer = widgets.interactive_output(visualize, {'gpml_file': dropdown})

        def display_gene_data(gids:List[str]):
            selected_gene_data = self.gene_data
            gids = [str(gid) for gid in gids]
            gene_caption = "Gene data"
            # xref_idでフィルターするように変更（2024/1/29oec）
            if len(gids) > 0 and gids[0] != "":
                # データテーブルでフィルターしたい属性を指定
                selected_gene_data = selected_gene_data.filter(pl.col(self.filter_key).cast(pl.datatypes.Utf8).is_in(gids))
                if selected_gene_data.shape[0] == 0:
                    print("No data found for Xref ID {}".format(gids))
                    return
                gene_caption = f"Gene data for Xref ID {gids}"
            self.selected_gene_data = selected_gene_data

            def show_table(df, caption):
                show(df, caption, classes="display compact", style="table-layout:auto;width:auto;caption-side:top;",
                     columnDefs=[{"targets": "_all",                              
                                "render": JavascriptFunction("""
                                    function (data, type, full, meta) {
                                        return `<span title=${data}>${data}</span`;
                                    },
                                    """)}])

            show_table(selected_gene_data, gene_caption)

            gene_names = selected_gene_data['Enzyme'].to_list()
            # make unique
            gene_names = list(set(gene_names))
            selected_expression_data = self.expression_data[self.expression_data['gene'].isin(gene_names)]

            if selected_expression_data.shape[0] == 0:
                print("No expression data found")
                return
            
            show_table(selected_expression_data, "Expression data")


        dataframe_output = widgets.interactive_output(display_gene_data, {"gids": self.visualizer_widget})
        
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
        .dataTable {
            margin-left: 0 !important;
            margin-bottom: 30px !important;
        }
        .dataTable caption {
            font-size: large;
            font-weight: bold;
            color: black;
            text-align: center;
        }
        """
        display(HTML(f"<style>{css}</style>"))

        display(self.widgets)