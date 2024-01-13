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
```

起動後、http://localhost:8888/nbclassic/notebooks/work/qp_view.ipynb にアクセスして、各セルを実行することで可視化を行えます。
可視化対象の GPML ファイルを増やしたい場合は、gpml フォルダの中に、拡張子を「.gpml」にしたファイルを置いてください。

# Todo

- nbextension でセルの自動 run を設定する
- 必要であればセルを実行するようなボタン widget を追加する
- table 表示はソート機能などを備えた holoview 等を使った方が良さそう
- JupyterLab でも使用可能にする
