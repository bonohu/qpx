# qp

Jupyter notebook で WikiPathways のパスウェイと選択したノードの属性テーブルを表示するツールです。

qp_view.ipynb を Jupyter notebook 環境で開いて利用します。

## memo

- メインの notebook の名前を qp_view.ipynb に変更しました。
- メインの Python ファイルの名前を qp.py に変更しました。

## 使い方

### 前提条件

- docker および docker-compose がインストールされていること

### インストール

```
git clone git@github.com:dogrunjp/qp.git
cd qp
docker-compose up -d
(最新のDocker Desktopがインストールされている場合docker compose up -d)
```

起動後、http://localhost:8888/notebooks/work/qp_view.ipynb にアクセスして、各セルを実行することで可視化を行えます。
可視化対象の GPML ファイルを増やしたい場合は、gpml フォルダの中に、拡張子を「.gpml」にしたファイルを置いてください。

アプリケーションに更新があった場合はローカルレポジトリを更新後したあとにコンテナをビルドし直す必要があります。

```
docker compose down
docker compose build --no-cache
docker compose up -d
```


### 動作環境についての追記

- qpxはdocker composeで起動したjupyter notebookで動作を確認しています。
- またローカルに構築したconda環境でもnotebook上のアプリケーションの起動を確認しています（一部の動作に不具合があります）。
- condaで直接環境を構築する場合は以下の通りにPythonとライブラリのバージョンを指定してcondaの仮想環境と依存ライブラリのインストールを行なってください。

```
$ conda create -n qpx python=3.10
$ conda activate qpx
$ conda install -c conda-forge ipython=7.31.0 notebook=6.5.4
$ conda install ipywidgets=7.6.5
$ conda install pandas
$ conda install itables
$ conda install polars
```
- condaで構築する環境名はqpxである必要はありません
- pythonのversionは3.9もしくは3.10のみ対応しています


# Todo

- conda環境でノード選択時にtableが表示されない不具合の解消
- 複数のノードの選択（フィルターとする遺伝子を複数選択できるようなUI）  
- データテーブルのソースも選択できるようにすると便利？（複数のパスウェイを扱うケースが多いかまだよくわからない）
