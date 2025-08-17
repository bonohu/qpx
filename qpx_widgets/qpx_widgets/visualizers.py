#!/usr/bin/env python
# coding: utf-8

# Copyright (c) me.
# Distributed under the terms of the Modified BSD License.

"""
High-level visualization classes using qpx_widgets
"""

import glob
import json
import os
import polars as pl
from threading import Timer
from typing import List
from IPython.display import HTML, clear_output, display
from IPython import get_ipython
from ipywidgets import interact, interactive, widgets
from .pathway_d3_visualizer_widget import PathwayD3VisualizerWidget
from .heatmap_visualizer_widget import HeatmapVisualizerWidget
from itables import show, JavascriptFunction


class GpmlD3Visualizer:
    def __init__(self, expression_data_path, filter_key="xref_id", gpml_dir_path="./gpml", expression_columns_index=4):
        self.gpml_dir_path = gpml_dir_path
        temp_df = pl.read_csv(expression_data_path, separator='\t', n_rows=1)
        columns = temp_df.columns
        dtypes = {col: pl.Float64 for col in columns[expression_columns_index:]}  # 4列目以降を数値として指定
        dtypes["xref_id"] = pl.Int64  # "xref_id"列を整数として指定
        self.expression_data = pl.read_csv(expression_data_path, separator='\t', ignore_errors=True, dtypes=dtypes)
        self.heatmap_widget = HeatmapVisualizerWidget(expression_data=open(expression_data_path).read(), expression_columns_index=expression_columns_index, filter_key=filter_key)
        self.selected_expression_data = self.expression_data
        self.filter_key = filter_key
        if filter_key not in self.expression_data.columns:
            raise ValueError(f"Column {filter_key} not found in expression data")
        self.visualizer = None
        self.selected_gpml_file = None
        self.expression_columns_index = expression_columns_index
    

    def show(self):
        gpml_files = glob.glob("{}/*.gpml".format(self.gpml_dir_path))
        gpml_files = [os.path.basename(gpml_file) for gpml_file in gpml_files]
        gpml_files.sort()

        if len(gpml_files) > 0:
            self.selected_gpml_file = gpml_files[0]

        dropdown = widgets.Dropdown(
            options=gpml_files,
            value=self.selected_gpml_file,
        )

        def visualize(gpml_file: str):
            # Import GpmlParser locally to avoid circular imports
            from src.gpml_parser import GpmlParser
            self.visualizer_widget.pathway_data = json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, gpml_file)).data)
            display(self.visualizer_widget)

        # Import GpmlParser locally to avoid circular imports
        from src.gpml_parser import GpmlParser
        self.visualizer_widget = PathwayD3VisualizerWidget(pathway_data=json.dumps(GpmlParser(os.path.join(self.gpml_dir_path, self.selected_gpml_file)).data))

        self.interactive_visualizer = widgets.interactive_output(visualize, {'gpml_file': dropdown})

        def on_gene_ids_change(change):
            original_gids = gids = change["new"]
            try:
                gids = [int(gid) for gid in gids if gid != ""]
            except:
                gids = []

            if len(original_gids) > 0 and original_gids[0] != "":
                selected_expression_data = self.expression_data.filter(pl.col('xref_id').is_in(gids))
            else:
                selected_expression_data = self.expression_data                
            self.selected_expression_data = selected_expression_data
            self.heatmap_widget.selected_gene_ids = original_gids

        self.visualizer_widget.observe(on_gene_ids_change, names='value')
        
        self.widgets = widgets.VBox( 
            [
                widgets.HBox([widgets.Label(value='Select GPML file:'), 
                    dropdown]),
                self.interactive_visualizer,      
                self.heatmap_widget
            ]
        )

        css = """
        .dataTable {
            margin-left: 0 !important;
            margin-bottom: 30px !important;
        }
        .dt-layout-full {
            overflow-x: auto;
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


class GeneSearchForm:
    def __init__(self, gene_data_path, gpml_d3_visualizer, search_target="Enzyme", mapping_key="xref_id"):
        self.gene_data = pl.read_csv(gene_data_path, separator='\t')
        self.visualizer = gpml_d3_visualizer
        self.mapping_key = mapping_key
        self.search_target = search_target
    

    def show(self):
        search_input = widgets.Text(
            placeholder='Enter gene name',
            description='Gene:',
            disabled=False,
            value=' ' # 後述するredraw用に空白文字を入れておく
        )

        def display_gene_data(query: str):
            selected_gene_data = self.gene_data
            query = query.strip()
            if len(query) > 0:
                selected_gene_data = selected_gene_data.filter(pl.col(self.search_target).str.contains(f"(?i){query}")) # (?i)は大文字小文字を区別しないフラグ
                if selected_gene_data.shape[0] == 0:
                    print("No data found")
                    return
            column_index_of_mapping_key = selected_gene_data.columns.index(self.mapping_key)

            if column_index_of_mapping_key == -1:
                print(f"Column {self.mapping_key} not found")
                return
            def show_table(df):
                show(df, classes="display compact clickable", searching=False,
                     columnDefs=[{"targets": "_all",                              
                                "render": JavascriptFunction("""
                                    function (data, type, full, meta) {
                                        return `<span title=${data}>${data}</span`;
                                    },
                                    """)},
                                    {"targets": column_index_of_mapping_key, "className": "mapping-key"}])

            show_table(selected_gene_data)

        dataframe_output = widgets.interactive_output(display_gene_data, {"query": search_input})

        # interactive_output使用時、itablesがセルの実行直後だけ表示されない問題があるため、タイマーをかけてすぐに再描画するようにする
        def redraw():
            search_input.value = ''
        timer = Timer(1, redraw, ())
        timer.start()
        
        self.widgets = widgets.VBox( 
            [
                search_input,
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
        .clickable tbody tr {
            cursor: pointer;
        }
        """
        display(HTML(f"<style>{css}</style>"))

        display(HTML(
            """
            <script>
            $(document).on('click', '.clickable tbody tr', function () {
                let index = $(this).find('.mapping-key').text();
                let comm = Jupyter.notebook.kernel.comm_manager.new_comm('on_row_click',
                                                     {'index': index})
                comm.close();
            });
            </script>
            """
        ))

        display(self.widgets)

        def on_row_click(comm, msg):
            msg_data = msg['content']['data']
            row_index = msg_data['index']
            selected_gene_data = self.gene_data[int(row_index)]
            self.visualizer.visualizer_widget.selected_gene_ids = [row_index]

        get_ipython().kernel.comm_manager.register_target('on_row_click', on_row_click)
