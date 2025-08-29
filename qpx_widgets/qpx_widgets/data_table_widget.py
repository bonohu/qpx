#!/usr/bin/env python
# coding: utf-8

# Copyright (c) me.
# Distributed under the terms of the Modified BSD License.

"""
Custom DataTable widget for gene data display with clickable rows
"""

import ipywidgets as widgets
from traitlets import Unicode, List, Dict, Int, observe
from ._frontend import module_name, module_version


@widgets.register
class DataTableWidget(widgets.DOMWidget):
    """A custom data table widget with clickable rows for gene selection"""
    
    _model_name = Unicode('DataTableModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('DataTableView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    # Widget properties
    data = Dict({}).tag(sync=True)  # Table data as dict
    columns = List([]).tag(sync=True)  # Column definitions
    mapping_key_column = Unicode('').tag(sync=True)  # Column used for row identification
    selected_row_id = Unicode('').tag(sync=True)  # Currently selected row ID
    search_query = Unicode('').tag(sync=True)  # Search query
    
    def __init__(self, data_frame=None, mapping_key="xref_id", search_target="Enzyme", **kwargs):
        super().__init__(**kwargs)
        self.mapping_key = mapping_key
        self.search_target = search_target
        
        if data_frame is not None:
            self.update_data(data_frame)
    
    def update_data(self, data_frame, query=""):
        """Update the table data with optional filtering"""
        # Filter data based on query
        filtered_df = data_frame
        if query.strip():
            try:
                import polars as pl
                filtered_df = data_frame.filter(
                    pl.col(self.search_target).str.contains(f"(?i){query.strip()}")
                )
            except ImportError:
                # Fallback if polars is not available
                print("Polars not available for filtering")
                return
        
        # Convert to dict format for frontend
        self.data = {
            'rows': filtered_df.to_dicts(),
            'total_rows': len(filtered_df)
        }
        self.columns = [{'name': col, 'key': col} for col in filtered_df.columns]
        self.mapping_key_column = self.mapping_key
    
    @observe('selected_row_id')
    def _on_row_selection(self, change):
        """Handle row selection changes from frontend"""
        # This will be observed by the parent visualizer
        pass
