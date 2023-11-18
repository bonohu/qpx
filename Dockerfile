FROM jupyter/base-notebook:x86_64-notebook-7.0.6

COPY . /home/jovyan/work

RUN pip install -r /home/jovyan/work/requirements.txt