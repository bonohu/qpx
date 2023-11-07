# qp
Jupyter notebookでWikiPathwaysのパスウェイと選択したノードの属性テーブルを表示するツールです。

## memo

- メインのnotebookの名前をqp_view.ipynbに変更しました
- メインのPythonファイルの名前をqp.pyに変更しました
- htmlファイルは今のところtemplates/test_d3.htmlをjinja2に読み込んでレンダリングし使用しています
- 本ツールは現状Jupyter notebookのclassicモード（version6エミュレート）で利用することを想定しています。エンドポイントの後に/nbclassic/をつけてnotebookを開いてください
- htmlファイルはtemplatesにあります。htmlファイルを編集する際はclassicモードは使えないようです。


## 環境

- Python                                3.9.x
- ipython                                8.16.1
- ipywidgets                                8.1.1
- notebook                                7.0.6
- jupyterlab                                4.0.7　// notebookをインストールすると一緒に入ってしまうが現状使わない
- d3.js                                // v3でmockは作っているが新しいほうがベターとは思う。load_d3v4_caseでv4以降の使い方は検討している


# Todo

- config.yamlを置き読み込むファイル等を記述するようにする
- ノートブックを開いた状態で最初のcellを実行する機能（あるいは明示的に実行してもらうためのボタンwidgetの表示）
- その他いろいろ


