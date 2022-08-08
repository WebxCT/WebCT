![WebCT: Interactive Web UI for X-ray CT with Real-time Results](./doc/webct-blurb.png)

![Image of UI](./doc/preview.png)

---

WebCT is a feature-rich environment for previewing and simulating X-ray scans on the browser.

- Configure and see output spectra in real-time, with support for different physical filters.
- Upload any 3D model, along with editable materials.
- Change capture parameters to see the effect projections have on the reconstruction quality.
- Reconstruct your scans, and tweak for the best results!
- Save and export your configuration, share source and detector parameters and load them into other applications.


> **Note**
>
> 🏗 WebCT is still in development, and while most features are implemented, some are still a work-in-progress. [Feel free to request features, and report bugs.](https://github.com/WebxCT/WebCT/issues) WebCT aims to be a useful tool for everyone, if there is something you'll like to see, please request it!

## What WebCT *isn't*

Although webCT aims to provide an all-in-one solution for simulation and
reconstruction, a few aspects that WebCT is not:

- Data analysis tool - *Export data from WebCT*
- Batch processor - *Export configs & use gVirtualXRay*
- Model editor - *Use 3D software like blender*
- Large Data Processor - *WebCT is not optimised for large datasets*

WebCT does however, aim to facilitate the above with config and dataset exporting.

## Installing WebCT

Currently WebCT is still in alpha, and does not have any official release
builds, [take a look at the v1.0.0 roadmap](https://github.com/WebxCT/WebCT/milestone/1)
or [the project dashboard](https://github.com/orgs/WebxCT/projects/1) for
current project status.

[Docker](https://www.docker.com/) will be the main way to install WebCT, and it
will handle installation and hosting.

## Developing WebCT

1. Pull the repository from github however you like
2. Install the conda environment with `conda env create`
2. Install [npm by downloading node.js](https://nodejs.org/en/)
	- Alternatively use a [node version manager for Windows](https://github.com/coreybutler/nvm-windows) or [MacOS/Linux](https://github.com/nvm-sh/nvm)
3. Install js packages with `npm install`
4. Build and host webserver with `npm run serve`
	- If flask fails to start, ensure the webct environment is activated with `conda activate webct`
7. Visit the local url in a browser!

Any issues with installing? [Please feel free to open an issue!](https://github.com/WebxCT/WebCT/issues)

Hosting with a docker container is currently in the works.
