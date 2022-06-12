# set base image (host OS)
#FROM nvidia/cuda:11.0.3-base-ubuntu20.04
FROM nvidia/opengl:1.2-glvnd-devel-ubuntu20.04


# Set timezone:
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone

# Install dependencies:
RUN apt-get update && apt-get install -y tzdata

# Build
RUN apt-get update && apt-get install -y libxi-dev swig libxmu-dev #mesa-utils
#RUN apt-get update && apt-get install -y libglew-dev glew-utils
RUN apt-get update && apt-get install -y libxrandr-dev libxcursor-dev
RUN apt-get update && apt-get install -y libxinerama-dev libxxf86vm-dev
#RUN apt-get update && apt-get install -y libglfw3 libglfw3-dev

RUN apt-get update && apt-get install -y cmake build-essential

RUN apt-get update && apt-get install -y python3 python3-dev subversion

#RUN apt-get update && apt-get install -y     libglvnd0 \
#    libgl1 \
#    libglx0 \
#    libegl1 \
#    libxext6 \
#    libx11-6

RUN apt-get update && apt-get install -y libfreetype6-dev

RUN apt-get update && apt-get install -y libtiff-dev
RUN apt-get update && apt-get install -y libglu1-mesa-dev
RUN apt-get update && apt-get install -y xterm


WORKDIR /usr/local/src

# Get gvxr
RUN svn checkout svn://zedbluffer@svn.code.sf.net/p/gvirtualxray/code/branches/use-xraylib gvirtualxray-code

WORKDIR /usr/local/src/gvirtualxray-code

RUN svn up

RUN mkdir bin

WORKDIR /usr/local/src/gvirtualxray-code/bin

ENV CC=/usr/bin/gcc
ENV CXX=/usr/bin/g++
RUN cmake \
        -DCMAKE_C_COMPILER:STRING=/usr/bin/gcc \
        -DCMAKE_CXX_COMPILER:STRING=/usr/bin/g++ \
        -DCMAKE_BUILD_TYPE:STRING=Release \
        -DBUILD_SIMPLEGVXR:BOOL=ON \
        -DBUILD_TESTING:BOOL=ON \
        -DUSE_LIBTIFF:BOOL=ON \
        -DBUILD_TESTING:BOOL=ON \
        -DUSE_SYSTEM_GLFW:BOOL=OFF \
        -DUSE_SYSTEM_GLEW:BOOL=OFF \
        -DBUILD_WRAPPER_PYTHON3:BOOL=ON \
        -DGLEW_USE_STATIC_LIBS:BOOL=ON \
        -S .. \
        -B .

RUN make assimp -j16

RUN make glew -j16
RUN mkdir gvxr/glew-install/lib64
RUN cp gvxr/glew-install/lib/lib*.a gvxr/glew-install/lib64

RUN make glfw -j16
RUN mkdir glfw-install/lib64
RUN cp glfw-install/lib/lib*.a glfw-install/lib64

RUN make googletest -j16

RUN mkdir third_party/lib64
RUN cp third_party/lib/lib*.a third_party/lib64


RUN make gVirtualXRay -j16
RUN make SimpleGVXR -j16


RUN make gvxrPython3 -j16


RUN make -j16

# Install
RUN make install

RUN make test

WORKDIR /usr/local/gvxrWrapper-1.0.6/python3/
CMD xterm
