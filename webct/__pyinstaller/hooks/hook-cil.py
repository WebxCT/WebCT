from PyInstaller.utils.hooks import collect_data_files
import PyInstaller.utils.hooks.conda as conda
from pathlib import Path
from cil.framework.framework import dll as dll_path
from ccpi.filters.utils import dll as reg_dll_path
from ccpi.filters.utils import gpudll as reg_dll_gpu_path
from ccpi.filters.utils import _here as reg_base

dll = Path(dll_path)

# include cilacc.dll / platform-dependent version
datas = collect_data_files("cil")
binaries = [(dll, "./")]

# include ipp

binaries.append((conda.lib_dir.locate() / "ippcck0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippchk0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippcvk0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippdck0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippek0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippik0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippsk0.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippvmk0.dll", "./"))
# binaries.append((conda.lib_dir.locate() / "ipp.dll", "./"))
# ippik0

# gpu-accelerated iterative regularizers
base_reg = Path(reg_base)
dll_reg = base_reg / Path(reg_dll_path)
binaries.append((dll_reg, "./ccpi/filters/"))

dll_reg_gpu = base_reg / Path(reg_dll_gpu_path)
binaries.append((dll_reg_gpu, "./ccpi/filters/"))
