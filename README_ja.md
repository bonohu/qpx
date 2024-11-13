# qpx

Jupyter notebook で WikiPathways のパスウェイと選択したノードの属性テーブルを表示するツールです。

qpx.ipynb を Jupyter notebook 環境で開いて利用します。

## memo

- メインの notebook の名前を qpx.ipynb に変更しました。
- メインの Python ファイルの名前を qp.py に変更しました。

## 使い方

### 前提条件

- docker および docker-compose がインストールされていること
- Docker Desktop を起動していること

### プロジェクトデータの配置
- qpxの実行にはGPMLと発現テーブルの少なくとも二つのファイルが必要です。アプリケーションをビルドする前にこれらのファイルの配置についての設定を記述します。

#### ローカルのファイルを直接アプリケーションに配置する場合
- GPMLをプロジェクトディレクトリのgpml/の下に置いてください
- 発現テーブルはgpml/もしくはdata/に置き、notebook起動後にファイルパスを書き換えてください

#### Githubのデータレポジトリを利用する場合

1. qpxローカルレポジトリにcdしqpxレポジトリの中（root）でデータリポジトリをcloneする
1. qpxのプロジェクトにgpml/ディレクトリが残っている場合元のgpml/をgmpl_bak/等に変更する（削除しても構わない）
1. docker-compose.ymlのvolumesにデータリポジトリのプロジェクトを以下のようにマッピングする（元の".:/home/jovyan/work"は消さない）。

```
volumes:
　- ".:/home/jovyan/work"
　- "./{data_repo_name}/{project_name}:/home/jovyan/work/gpml"
```

1. notebookを起動したら発現データのファイルパスを以下のように修正する。

```
   expression_data_path = "gpml/ファイル名"
```


### インストール

```
git clone https://github.com/dogrunjp/qpx
cd qpx
docker compose up -d
(最新のDocker Desktopがインストールされている場合docker compose up -d)
```

起動後、http://localhost:8888/notebooks/work/qpx.ipynb にアクセスして、各セルを実行することで可視化を行えます。
可視化対象の GPML ファイルを増やしたい場合は、gpml フォルダの中に、拡張子を「.gpml」にしたファイルを置いてください。

アプリケーションに更新があった場合はローカルレポジトリを更新したあとにコンテナをビルドし直す必要があります。

```
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 動作環境についての追記

- qpx は docker compose で起動した jupyter notebook で動作を確認しています。
- またローカルに構築した conda 環境でも notebook 上のアプリケーションの起動を確認しています（一部の動作に不具合があります）。
- conda で直接環境を構築する場合は以下の通りに Python とライブラリのバージョンを指定して conda の仮想環境と依存ライブラリのインストールを行なってください。

```
$ conda create -n qpx python=3.10
$ conda activate qpx
$ conda install -c conda-forge ipython=7.31.0 notebook=6.5.4
$ conda install ipywidgets=7.6.5
$ conda install pandas
$ conda install itables
$ conda install polars
```

- conda で構築する環境名は qpx である必要はありません
- python の version は 3.9 もしくは 3.10 のみ対応しています

# 主要コンポーネントについて

以下の２コンポーネントは、いずれも `qp.py` に記述されている。

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
