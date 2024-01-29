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


### 動作環境についての追記

- qpxはdocker composeおよびローカル環境で直接起動したconda環境でnotebook上のアプリケーションの起動を確認しています。
- condaで直接環境を構築する場合は以下の通りにPythonとライブラリのバージョンを指定してcondaの仮想環境と依存ライブラリのインストールを行なってください。

```
$ conda create -n ex-qpx python=3.9
$ conda activate ex-qpx
$ conda install -c conda-forge ipython=7.31.0 notebook=6.5.4
$ conda install ipywidgets=7.6.5
$ conda install pandas
```




# Todo

- テーブルwidgetの改良
  - ソート機能のあるdata tableのwidgetがあれば利用する
  - Descriptionなどの長い文字列があった場合クリックすると全文表示される、といったようなギミックがあると良い
  - tabulatorのwidgetがあった気がする
- ダイアグラムの改修
  - パスウェイダイアグラムを拡大縮小できた方が良い
  - WikiPathwaysからDLしたgpmlのノードのテキストが枠からハミだすので修正する
- データテーブルのソースも選択できるようにすると便利？（複数のパスウェイを扱うケースが多いかまだよくわからない）
- 必要であればセルを実行するようなボタン widget を追加する
