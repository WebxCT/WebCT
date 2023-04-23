from PyInstaller.utils.hooks import collect_data_files
import PyInstaller.utils.hooks.conda as conda
from pathlib import Path
from cil.framework.framework import dll as dll_path

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


print(binaries)
