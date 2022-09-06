FROM nvidia/opengl:1.2-glvnd-devel-ubuntu20.04
WORKDIR /usr/src/

# Set timezone to prevent that one random time library from breaking headless installs.
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone

# Install system dependencies, npm and micromamba
RUN apt-get update
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
