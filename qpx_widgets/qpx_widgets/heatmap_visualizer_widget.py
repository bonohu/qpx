#!/usr/bin/env python
# coding: utf-8

# Copyright (c) me.
# Distributed under the terms of the Modified BSD License.

"""
Heatmap Visualizer Widget for expression data visualization
"""

import traitlets
from ipywidgets import DOMWidget
from traitlets import Unicode, Int
from ._frontend import module_name, module_version


class HeatmapModel(DOMWidget):
    _model_name = Unicode('HeatmapModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('HeatmapView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = traitlets.List([], help="Selected gene IDs").tag(sync=True)
    expression_data = Unicode('', help="CSV/TSV string of expression data").tag(sync=True)
    expression_columns_index = Int(4, help="Index of first expression data column").tag(sync=True)
    filter_key = Unicode('xref_id', help="Column name used for filtering").tag(sync=True)
    
    def __init__(self, expression_data='', expression_columns_index=4, filter_key="xref_id", **kwargs):
        super().__init__(**kwargs)        
        self.expression_data = expression_data
        self.expression_columns_index = expression_columns_index
        self.filter_key = filter_key

    @property
    def selected_gene_ids(self):
        return self.value
    
    @selected_gene_ids.setter
    def selected_gene_ids(self, value):
        self.value = value


# Alias for backward compatibility
HeatmapVisualizerWidget = HeatmapModel
