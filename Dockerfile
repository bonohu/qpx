FROM jupyter/base-notebook:x86_64-notebook-7.0.6


ARG TARGETPLATFORM



COPY . /home/jovyan/work

USER root

RUN apt update && apt install -y libglib2.0-dev 

# Change ownership of the copied files to jovyan user
RUN chown -R jovyan:users /home/jovyan/work

USER jovyan

RUN pip install -r /home/jovyan/work/requirements.txt

RUN cd /home/jovyan/work/qpx_widgets && \
    pip install -e .

# Install JupyterLab extensions
RUN jupyter nbextension enable --py qpx_widgets

# Install Polars with the correct package for the target platform. Mainly for apple silicon.
RUN POLARS_PACKAGE=$( \
    case ${TARGETPLATFORM} in \
    linux/arm64 ) echo "polars-lts-cpu";; \ 
    *) echo "polars";; \
    esac \
    ) && \
    pip install ${POLARS_PACKAGE}==0.20.15