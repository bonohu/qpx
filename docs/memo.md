# TIPS

## 動作環境
- docker-composeおよびローカル環境で直接起動したconda環境でnotebook上のアプリケーションの起動を確認しています。
- condaで直接環境を作る場合は以下のようにPythonとライブラリのバージョンを指定してインストールを行なってください。

```
$ conda create -n ex-qpx python=3.9
$ conda activate ex-qpx
$ conda install -c conda-forge ipython=7.31.0 notebook=6.5.4
$ conda install ipywidgets=7.6.5
$ conda install pandas
```


