# qp
Jupyter notebookでWikiPathwaysのパスウェイと選択したノードの属性テーブルを表示するツールです。

qp_view.ipynbをJupyter notebook環境で開いて利用します。

## memo

- メインのnotebookの名前をqp_view.ipynbに変更しました。
- メインのPythonファイルの名前をqp.pyに変更しました。
- htmlファイルは今のところtemplates/test_d3.htmlをjinja2に読み込んでレンダリングし使用しています。
- 本ツールは現状Jupyter notebook 6もしくはnotebook 7のclassicモード（version6エミュレート）で利用することを想定しています。notebook 7の場合はエンドポイントの後に/nbclassic/をつけてnotebookを開いてください。ただしnotebook 7では使えない機能があるためnotebook 6での利用を推奨します。
- htmlファイルはtemplatesにあります。htmlファイルを編集する際はclassicモードは使えないようです。


## 環境構築

本ツールは最新のnotebook (notebook 7.x.x)では利用できない機能やextensionが必要なため、現状notebook 6をインストールして環境構築することを推奨します。

- Python                                3.9.x
- notebook                                6.x.x 
    - install :  pip install notebook==6.5.6
- nbextension
    - pip install jupyter_contrib_nbextensions
    - pip install jupyter_nbextensions_configurator
- pandas
    - pip install pandas
- d3.js（モジュールのインストールは必要ない）                                // v3でmockは作っているが新しいほうがベターとは思う。d3v4_case.ipynbでv4以降の使い方は確認している


!!notebook 7環境で使いたい場合はエンドポイントに/nbclassic/を追加しclassicモード（notebook 6相当）で利用することは一応できますが
nbextensionに対応できないため、セルの自動runなどを使うことができません。!!


# Todo

- config.yamlを置き読み込むファイル等を記述するようにする
- nbextensionでセルの自動runを設定する
- 必要であればセルを実行するようなボタンwidgetを追加する
- table表示はソート機能などを備えたholoview等を使った方が良さそう
- よりよいJS-Python通信の方法を検討する（Javascriptからのグローバル変数設定、cellの実行）



