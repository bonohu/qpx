FROM jupyter/base-notebook:x86_64-notebook-7.0.6

ARG TARGETPLATFORM

USER root

RUN apt update && apt install -y libglib2.0-dev 

COPY . /home/jovyan/work

# Change ownership of the copied files to jovyan user
RUN chown -R jovyan:users /home/jovyan/

USER jovyan

WORKDIR /home/jovyan/work/qpx_widgets

RUN npm install -g yarn
# @jupyterlab/builder 4.4.6 requires Node.js ^20.19.0 || >=22.12.0, newer than the
# v20.8.1 bundled in this base image.
RUN mamba install -n base -c conda-forge "nodejs>=20.19" -y
# Install Polars with the correct package for the target platform. Mainly for apple silicon.
RUN POLARS_PACKAGE=$( \
    case ${TARGETPLATFORM} in \
    linux/arm64 ) echo "polars-lts-cpu";; \ 
    *) echo "polars";; \
    esac \
    ) && \
    pip install ${POLARS_PACKAGE}==0.20.15

RUN yarn set version berry

RUN yarn install && yarn build

RUN jupyter labextension develop . --overwrite

WORKDIR /home/jovyan/work