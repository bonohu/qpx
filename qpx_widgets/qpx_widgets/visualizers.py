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
from .data_table_widget import DataTableWidget


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
        self.data_table_widget = DataTableWidget(
            data_frame=self.gene_data,
            mapping_key=mapping_key,
            search_target=search_target
        )
        # Listen for row selection changes
        self.data_table_widget.observe(self._on_row_selection, names='selected_row_id')
    

    def show(self):
        search_input = widgets.Text(
            placeholder='Enter gene name',
            description='Gene:',
            disabled=False,
            value=''
        )

        def on_search_change(change):
            query = change['new']
            self.data_table_widget.update_data(self.gene_data, query)

        search_input.observe(on_search_change, names='value')
        
        # Initialize with all data
        self.data_table_widget.update_data(self.gene_data)
        
        self.widgets = widgets.VBox([
            search_input,
            self.data_table_widget
        ])

        css = """
        .data-table-widget {
            margin-left: 0 !important;
            margin-bottom: 30px !important;
        }
        .datatable-container {
            max-height: 400px;
            overflow-y: auto;
        }
        """
        display(HTML(f"<style>{css}</style>"))
        display(self.widgets)

    def _on_row_selection(self, change):
        """Handle row selection from DataTable widget"""
        selected_id = change['new']
        if selected_id and self.visualizer and hasattr(self.visualizer, 'visualizer_widget'):
            # Convert selected_id to appropriate format and update visualizer
            self.visualizer.visualizer_widget.selected_gene_ids = [str(selected_id)]
