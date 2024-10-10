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

# include ipp (l9 is for cpus that support AVX2;- which is all processors in the last decade.)
binaries.append((conda.lib_dir.locate() / "ippil9.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippsl9.dll", "./"))
binaries.append((conda.lib_dir.locate() / "ippvml9.dll", "./"))

# gpu-accelerated iterative regularizers
base_reg = Path(reg_base)
dll_reg = base_reg / Path(reg_dll_path)
binaries.append((dll_reg, "./ccpi/filters/"))

dll_reg_gpu = base_reg / Path(reg_dll_gpu_path)
binaries.append((dll_reg_gpu, "./ccpi/filters/"))
