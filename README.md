# Quest for Pathways with eXpression (QPX) 

Quest for Pathways with eXpression (QPX) is a tool that displays WikiPathways pathways and attribute tables for selected nodes in Jupyter notebook.
Open `qpx.ipynb` in a Jupyter notebook environment and use it.

## Usage

### Prerequisite

- `docker` and `docker-compose` must be installed
- Docker Desktop must be running

### Deployment of Project Data

- At least two files (GPML and expression table) are required to run QPX
- Describe the configuration for the placement of these files before building the application

#### Case1: Place local files directly into the application

- Place GPML files under `gpml/` in the project directory
- Place the expression table in `gpml/` or `data/` and rewrite the file path after starting the notebook

#### Case2: Use GitHub data repository

1. `cd` to qpx local repository and clone the data repository in the qpx repository (root)
2. If the `gpml/` directory remains in the qpx project, change the original `gpml/` to `gmpl_backup/`, etc (you can delete it)
3. Map the data repository project to volumes in `docker-compose.yml` as follows (do not delete the original `".:/home/jovyan/work"` is not deleted)

```
volumes:
　- ".:/home/jovyan/work"
　- "./{data_repo_name}/{project_name}:/home/jovyan/work/gpml"
```

4. After starting Jupyter notebook, modify the file path of the expression data as follows

```
   expression_data_path = "gpml/(file name)"
```

### Installation

```
git clone https://github.com/bonohu/qpx
cd qpx
docker compose up -d
```

After launching, you can access http://localhost:8888/lab/tree/qpx.ipynb and run each cell for visualization.
If you want to increase the number of GPML files to be visualized, place the files with the extension `.gpml` in `gpml/` directory.

If there are updates to the application, the container must be re-built after updating the local repository as follows.

```
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Quick Start with MyBinder

For a quick demo without local installation, you can try QPX directly in your browser using MyBinder:

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/bonohu/qpx/main?urlpath=%2Fdoc%2Ftree%2Fqpx.ipynb)

Simply click the badge above or visit the following URL:
```
https://mybinder.org/v2/gh/bonohu/qpx/main?urlpath=%2Fdoc%2Ftree%2Fqpx.ipynb
```

This will launch a live Jupyter environment with QPX pre-installed. Note that MyBinder sessions are temporary and any changes will be lost when the session ends.

### Additional note on operating environment

- QPX is running on Jupyter Notebook started with docker compose.
- We have also verified that applications on the notebook start up in a Python virtual environment.
  - Only python version 3.9 or higher is supported.

```
$ pip install jupyterlab polars # In Appli Sillicon, use "polars-lts-cpu" instead of "polars"
$ source qpx_env/bin/activate
$ cd qpx_widgets
$ jlpm install
$ jlpm run build
$ pip install -e .
$ jupyter labextension develop --overwrite .
$ cd ../
```

- Start Jupyter Lab from the project root directory

```
$ jupyter lab
```


# About Major Components

The following two components are both described in `qpx_widgets/qpx_widgets/visualizers.py`

### GpmlD3Visualizer

- The main component of the visualization
- It consists of the following two elements

1. Pathway diagram
2. Gene information table (including expression levels)

   - The expression amount part is colored as a heatmap, but if you want to change this color, just change the following RGB values in the `qpx_widgets/src/widgets.ts`.

   ```
         const highlightColor = [131, 146, 219];
         const defaultColor = [250, 250, 255];
   ```

   - The color of the heatmap changes from `defaultColor` to `highlightColor` according to the expression value.

Screen shot of GpmlD3Visualizer:
![gpml_d3_visualizer](images/gpml_d3_visualizer.png)

### GeneSearchForm

- Component for searching gene information
- It consists of two components: a search box and a gene information table.
- By passing an instance of Gpml3DVisualizer at initialization, the corresponding node of Gpml3DVisualizer can be made selected when a row in the gene information table is clicked.
- The search box portion will be expanded to a more flexible query interface in the future.

- Example usage:
```
search_form = qpx_widgets.GeneSearchForm("data/red_perilla_anthocyanin_test.tsv", visualizer)
search_form.show()
```
![gene_search_form](images/gene_search_form.png)

# Todo

- Fixed a bug that table is not displayed when selecting a node in Anaconda environment.
