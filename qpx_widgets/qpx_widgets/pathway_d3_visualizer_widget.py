#!/usr/bin/env python
# coding: utf-8

# Copyright (c) me.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

import traitlets
from ipywidgets import DOMWidget
from traitlets import Unicode
from ._frontend import module_name, module_version

class PathwayD3Model(DOMWidget):
    _model_name = Unicode('PathwayD3Model').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('PathwayD3View').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = traitlets.List([], help="Selected node IDs").tag(sync=True)
    pathway_data = Unicode('{}', help="JSON string of pathway data").tag(sync=True)
    
    def __init__(self, pathway_data='{}', **kwargs):
        super().__init__(**kwargs)
        self.pathway_data = pathway_data

    @property
    def selected_gene_ids(self):
        return self.value

    @selected_gene_ids.setter
    def selected_gene_ids(self, value):
        self.value = value

# Alias for backward compatibility
PathwayD3VisualizerWidget = PathwayD3Model