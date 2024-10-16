{
	description = "Python environment using micromamba";

	inputs = {
		utils.url = "github:numtide/flake-utils";
	};

	outputs = {
		self,
		nixpkgs,
		utils,
		...
	}:
	utils.lib.eachDefaultSystem (system: let
		pkgs = import nixpkgs {
			inherit system;
			config.allowUnfree = true;
		};
		webct = pkgs.buildFHSUserEnv {
			name = "webct";
			targetPkgs = pkgs: with pkgs; [
				micromamba
				just
				fish
				vscode

				# gvxr
				libGL
				libGLU
				xorg.libX11

				# open3d (mesh decimation)
				libudev-zero

				# frontend
				nodejs_22
			];
			# runScript=''
			extraBuildCommands = ''
				# link micromamba to 'conda' in .mamba
				# ln -s ${pkgs.micromamba}/bin/micromamba conda
			'';
			# https://nixos.org/manual/nixpkgs/unstable/
			profile = ''
				export PATH=${pkgs.vscode.fhs}/bin:".":$PATH
				export MAMBA_ROOT_PREFIX=./.mamba
				eval "$(micromamba shell hook --shell=posix)"

				if [ ! -d $MAMBA_ROOT_PREFIX ]; then
					micromamba create -f environment.yml -y
				fi
				micromamba activate webct
			'';
		};
	in {
		devShells.default = pkgs.mkShell {
			buildInputs = [
				webct
			];
			shellHook = ''webct'';
		};
	});
}
