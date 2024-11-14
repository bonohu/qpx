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
git clone https://github.com/dogrunjp/qpx
cd qpx
docker compose up -d
```

After launching, you can access http://localhost:8888/notebooks/work/qpx.ipynb and run each cell for visualization.
If you want to increase the number of GPML files to be visualized, place the files with the extension `.gpml` in `gpml/` directory.

If there are updates to the application, the container must be re-built after updating the local repository as follows.

```
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Additional note on operating environment

- QPX is running on Jupyter Notebook started with docker compose.
- We have also verified that applications on the notebook start up in a locally built Anaconda environment (some behavior is faulty).
- If you are building the environment directly with Anaconda, install the Anaconda virtual environment and dependent libraries by specifying Python and library versions as follows.

```
$ conda create -n qpx python=3.10
$ conda activate qpx
$ conda install -c conda-forge ipython=7.31.0 notebook=6.5.4
$ conda install ipywidgets=7.6.5
$ conda install pandas
$ conda install itables
$ conda install polars
```

- The name of the environment to be built with Anaconda does not have to be qpx
- Only python version 3.9 or 3.10 is supported

# About Major Components

The following two components are both described in `qp.py`.

### GpmlD3Visualizer

- 可視化のメインとなるコンポーネントであり、以下の２つの要素から構成される

1. パスウェイダイアグラム
2. 遺伝子情報テーブル（発現量含む）

   - 発現量部分はヒートマップとしての色がつくようになっているが、この色を変更したい場合は
     `heatmap_view_widget.js` の以下の RGB 値を変更すればよい。

   ```
         const highlightColor = [131, 146, 219];
         const defaultColor = [250, 250, 255];
   ```

   - ヒートマップの色は、発現量の値に応じて、`defaultColor` から `highlightColor` に向かって変化するようになっている。

GpmlD3Visualizer のスクリーンショット：
![gpml_d3_visualizer](images/gpml_d3_visualizer.png)

### GeneSearchForm

- 遺伝子情報を検索するためのコンポーネント。検索ボックスと遺伝子情報テーブルの２要素から構成される。
- 初期化時に Gpml3DVisualizer のインスタンスを渡すことで、遺伝子情報テーブル内の行をクリックした際に、Gpml3DVisualizer の対応するノードを選択状態にすることができる。
- 検索ボックス部分は今後、より柔軟なクエリインターフェースに拡充予定
  ![gene_search_form](images/gene_search_form.png)

# Todo

- conda 環境でノード選択時に table が表示されない不具合の解消
