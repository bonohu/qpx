FROM jupyter/base-notebook:x86_64-notebook-7.0.6

COPY . /home/jovyan/work

USER root

RUN apt update && apt install -y libglib2.0-dev 

USER jovyan

RUN pip install -r /home/jovyan/work/requirements.txt