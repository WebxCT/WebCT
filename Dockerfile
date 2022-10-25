FROM nvidia/opengl:1.2-glvnd-devel-ubuntu20.04
WORKDIR /usr/src/

# Set timezone to prevent that one random time library from breaking headless installs.
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone

# Install system dependencies, npm and micromamba
RUN apt-get update

# Headless GPU requirements
RUN apt-get install -y nvidia-headless-515 nvidia-cuda-toolkit nvidia-utils-515 libnvidia-gl-515-server libopengl0 libglvnd0 libgl1 libglx0 libegl1 libgles2 xvfb

RUN apt-get install -y curl git wget npm
RUN wget -qO- https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj bin/micromamba
RUN ./bin/micromamba shell hook -s posix

# Copy files for dependencies, these are done explicitly to allow for docker buildstage caching
COPY ./environment.yml .
COPY ./package*.json .

# Install project dependencies
RUN ./bin/micromamba install -y -n base -f ./environment.yml
RUN ./bin/micromamba clean --all --yes
RUN npm install

# Copy and build project files
COPY . .
RUN npm run build

# Workaround for https://github.com/NVIDIA/nvidia-docker/issues/1551
RUN rm -rf /usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1 /usr/lib/x86_64-linux-gnu/libcuda.so.1

ENV NVIDIA_DRIVER_CAPABILITIES compute,graphics,utility,video

EXPOSE 80
CMD [ "bin/micromamba", "run", "gunicorn", "-w 2", "-b 0.0.0.0:80", "webct:app" ]
