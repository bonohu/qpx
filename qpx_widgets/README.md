
# qpx_widgets

A Custom Jupyter Widget for visualizing WikiPathways pathways in Jupyter notebooks.

## Installation

You can install using `pip`:

```bash
cd <path_to_qpx_widgets>
pip install  -e .
jupyter nbextension enable --py [--sys-prefix|--user|--system] qpx_widgets
```

## Development Installation

When developing your extensions, you need to manually enable your extensions with the
notebook / lab frontend. For lab, this is done by the command:

```
jupyter labextension develop --overwrite .
jlpm run build
```

### How to see your changes
#### Typescript:
If you use JupyterLab to develop then you can watch the source directory and run JupyterLab at the same time in different
terminals to watch for changes in the extension's source and automatically rebuild the widget.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

After a change wait for the build to finish and then refresh your browser and the changes should take effect.

#### Python:
If you make a change to the python code then you will need to restart the notebook kernel to have it take effect.
